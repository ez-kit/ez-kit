import { isWithinScope, readPath, serializePersistAddress } from '@ez-kit/store-core'

import { cloneDefault, fieldEquals, stringifyField, systemWrites, updateBindingStatus, writeBinding } from './binding'
import { fieldKey } from './key-naming'
import { decodeRecord, encodeRecord, FutureVersionError, validateSchema } from './record'

import type { PersistBinding, RecordState } from './binding'
import type {
	CommitCtx,
	FieldDescriptor,
	Keyed,
	MetaMerge,
	PersistErrorContext,
	ReadCtx,
	RestoreOptions,
	RestoreResult,
	SourcePort,
} from './types'
import type { PathWrite, PersistAddress } from '@ez-kit/store-core'

export type PersistEngine = {
	connect(binding: PersistBinding): () => void
	seed(binding: PersistBinding): void
	snapshot(): Keyed | Promise<Keyed>
	pull(external: Keyed): void
	pullSource(): void
	runWithMeta(metaPatch: unknown, mutate: () => void): void
	flushNow(): void
	flush(binding?: PersistBinding): Promise<void>
	restore(binding: PersistBinding, options?: RestoreOptions): Promise<RestoreResult>
	reset(binding: PersistBinding, fields?: readonly (readonly string[])[]): Promise<void>
	resetScope(path: readonly string[]): Promise<void>
	readonly supportsScopeReset: boolean
	dispose(): void
}

export type CreateEngineOptions = {
	mergeMeta?: MetaMerge
	defaultMeta?: unknown
	source?: string
	externalChanges?: 'apply' | 'ignore'
	ssrSafe?: boolean
	onError?: (error: unknown, context: PersistErrorContext) => void
}

type Entry = {
	binding: PersistBinding
	field: FieldDescriptor
	record: RecordState
	key: string
	revision: number
	value: string | null
	reset: boolean
}
type Barrier = { path: readonly string[]; pending: boolean; failed: boolean; entries: Map<string, Entry> }
type Job = {
	entries: Map<string, Entry>
	barrier?: Barrier
	meta: unknown
	resolve: () => void
	reject: (error: unknown) => void
	promise: Promise<void>
	rewrite?: Keyed
	valid?: () => boolean
}
type Fence = { targets: Map<RecordState, number>; resolve: () => void; reject: (error: unknown) => void }

function bindingKey(binding: PersistBinding, field: FieldDescriptor): string {
	const key = binding.keyOf.get(field)
	if (key === undefined) throw new Error('Missing persistent field identity')
	return key
}

const defaultMerge: MetaMerge = (previous, next) => ({
	...(previous !== null && typeof previous === 'object' ? previous : {}),
	...(next !== null && typeof next === 'object' ? next : {}),
})

/** One source owns one mutation queue. A read can acquire apply authority, never write authority. */
export function createPersistEngine(port: SourcePort, options: CreateEngineOptions = {}): PersistEngine {
	const bindings = new Set<PersistBinding>()
	const subscriptions = new Map<PersistBinding, () => void>()
	const owners = new Map<string, PersistBinding>()
	const physicalOwners = new Map<string, { binding: PersistBinding; key: string }>()
	const queued = new Map<RecordState, Entry>()
	const pendingResets = new Map<RecordState, Entry>()
	const jobs: Job[] = []
	const fences = new Set<Fence>()
	const barriers: Barrier[] = []
	let running: Job | null = null
	let disposed = false
	let scheduled = false
	let timer: ReturnType<typeof setTimeout> | undefined
	let pendingMeta: unknown = null
	let revision = 0
	let externalGeneration = 0
	const versioned = port.capabilities?.recordVersions === true
	let deferredReports: (() => void)[] | null = null

	function report(
		error: unknown,
		operation: PersistErrorContext['operation'],
		fields: readonly FieldDescriptor[] = [],
		scope?: readonly string[],
	): void {
		if (deferredReports) {
			deferredReports.push(() => {
				report(error, operation, fields, scope)
			})
			return
		}
		const addresses = fields.flatMap((field) => (field.address ? [field.address] : []))
		const context: PersistErrorContext = { source: options.source ?? '', operation }
		if (addresses.length === 1 && addresses[0]) context.address = addresses[0]
		else context.addresses = addresses
		if (scope) context.scope = scope
		try {
			options.onError?.(error, context)
		} catch {
			/* A reporter cannot corrupt the queue. */
		}
	}

	function keyFor(field: FieldDescriptor): string {
		if (field.address) return serializePersistAddress(field.address)
		for (const binding of bindings) {
			const key = binding.keyOf.get(field)
			if (key !== undefined) return key
		}
		return fieldKey(field)
	}

	function readContext(fields: FieldDescriptor[], stage?: (values: Keyed) => void, signal?: AbortSignal): ReadCtx {
		const addresses = new Map<string, PersistAddress>()
		for (const field of fields) if (field.address) addresses.set(keyFor(field), field.address)
		return { fields, addresses, ...(stage ? { stageContainerRewrite: stage } : {}), ...(signal ? { signal } : {}) }
	}

	function refresh(binding: PersistBinding, error?: unknown): void {
		const records = [...binding.records.values()]
		const blocked = records.some((record) => record.blocked)
		const pending = records.some((record) => queued.has(record))
		updateBindingStatus(binding, {
			write: blocked ? 'blocked' : error !== undefined ? 'error' : pending ? 'pending' : 'idle',
			error: error ?? null,
		})
	}

	function settleFences(error?: unknown, entries: Iterable<Entry> = []): void {
		const failed = new Map([...entries].map((entry) => [entry.record, entry.reset ? Infinity : entry.revision]))
		for (const fence of fences) {
			if (error !== undefined && [...fence.targets].some(([record, target]) => (failed.get(record) ?? -1) >= target)) {
				fences.delete(fence)
				fence.reject(error)
			} else if ([...fence.targets].every(([record, target]) => record.acknowledged >= target)) {
				fences.delete(fence)
				fence.resolve()
			}
		}
	}

	function contextFor(job: Job): CommitCtx {
		const entries = [...job.entries.values()]
		return {
			fields: entries.map((entry) => entry.field),
			diff: {
				set: entries.filter((entry) => entry.value !== null).map((entry) => entry.key),
				removed: entries.filter((entry) => entry.value === null).map((entry) => entry.key),
			},
			meta: job.meta,
			addresses: new Map(
				entries.flatMap((entry) => (entry.field.address ? [[entry.key, entry.field.address] as const] : [])),
			),
			maxVersions: new Map(entries.map((entry) => [entry.key, entry.field.schema?.version ?? 0])),
			explicitReset: entries.length > 0 && entries.every((entry) => entry.reset),
		}
	}

	function drain(): void {
		if (disposed || running) return
		let index = 0
		const first = jobs[0]
		if (
			first &&
			!first.barrier &&
			[...first.entries.values()].some((entry) =>
				barriers.some(
					(barrier) =>
						(barrier.pending || barrier.failed) && isWithinScope(entry.field.address?.store.path ?? [], barrier.path),
				),
			)
		) {
			index = jobs.findIndex((candidate) => candidate.barrier !== undefined)
			if (index < 0) return
		}
		if (
			index === 0 &&
			first &&
			!first.barrier &&
			[...first.entries.values()].some((entry) => !entry.reset && pendingResets.has(entry.record))
		) {
			index = jobs.findIndex(
				(candidate) =>
					candidate.barrier !== undefined ||
					[...candidate.entries.values()].some((entry) => entry.reset && pendingResets.get(entry.record) === entry),
			)
			if (index < 0) return
		}
		const job = jobs.splice(index, 1)[0]
		if (!job) return
		running = job
		const finish = (error?: unknown): void => {
			if (running === job) running = null
			const affected = new Set<PersistBinding>()
			for (const entry of job.entries.values()) {
				affected.add(entry.binding)
				if (queued.get(entry.record) === entry) queued.delete(entry.record)
				if (error === undefined) {
					entry.record.acknowledged = Math.max(entry.record.acknowledged, entry.revision)
					if (pendingResets.get(entry.record) === entry) pendingResets.delete(entry.record)
					if (entry.reset || job.barrier) {
						entry.record.blocked = false
						entry.record.resetPending = false
					}
					if (entry.record.revision === entry.revision) {
						entry.record.dirty = false
						entry.record.forceDelete = false
					}
				} else if (error instanceof FutureVersionError && error.keys.includes(entry.key)) entry.record.blocked = true
			}
			if (job.barrier) {
				job.barrier.pending = false
				job.barrier.failed = error !== undefined
				if (error === undefined) {
					const index = barriers.indexOf(job.barrier)
					if (index >= 0) barriers.splice(index, 1)
				}
			}
			for (const binding of affected) refresh(binding, error)
			settleFences(error, job.entries.values())
			if (error === undefined) job.resolve()
			else {
				report(
					error,
					job.barrier
						? 'removeScope'
						: [...job.entries.values()].every((entry) => entry.value === null)
							? 'remove'
							: 'write',
					[...job.entries.values()].map((entry) => entry.field),
					job.barrier?.path,
				)
				job.reject(error)
			}
			drain()
			if (
				(error === undefined || error instanceof FutureVersionError) &&
				[...affected].some((binding) =>
					[...binding.records.values()].some((record) => record.dirty && !queued.has(record) && !record.blocked),
				)
			)
				schedule()
		}
		try {
			let result: void | Promise<void> = undefined
			if (job.valid && !job.valid()) {
				job.resolve()
				running = null
				drain()
				return
			}
			if (job.barrier) result = port.removeScope?.(job.barrier.path)
			else if (job.rewrite)
				result = port.set(job.rewrite, {
					fields: [],
					diff: { set: [...job.rewrite.keys()], removed: [] },
					meta: { containerRewrite: true },
				})
			else if (job.entries.size > 0)
				result = port.set(
					new Map(
						[...job.entries.values()].flatMap((entry) =>
							entry.value === null ? [] : [[entry.key, entry.value] as const],
						),
					),
					contextFor(job),
				)
			if (result instanceof Promise)
				void result.then(
					() => {
						finish()
					},
					(error: unknown) => {
						finish(error ?? new Error('Source mutation failed'))
					},
				)
			else finish()
		} catch (error) {
			finish(error ?? new Error('Source mutation failed'))
		}
	}

	function enqueue(
		entries: Map<string, Entry>,
		meta: unknown,
		barrier?: Barrier,
		rewrite?: Keyed,
		valid?: () => boolean,
	): Job {
		let resolve!: () => void
		let reject!: (error: unknown) => void
		const promise = new Promise<void>((yes, no) => {
			resolve = yes
			reject = no
		})
		void promise.catch(() => undefined)
		const job: Job = {
			entries,
			meta,
			resolve,
			reject,
			promise,
			...(barrier ? { barrier } : {}),
			...(rewrite ? { rewrite } : {}),
			...(valid ? { valid } : {}),
		}
		for (const entry of entries.values()) {
			const existing = queued.get(entry.record)
			if (!existing || existing.revision <= entry.revision) queued.set(entry.record, entry)
		}
		jobs.push(job)
		for (const binding of new Set([...entries.values()].map((entry) => entry.binding))) refresh(binding)
		drain()
		return job
	}

	function collect(target?: PersistBinding): unknown {
		const entries = new Map<string, Entry>()
		const resets = new Map(
			[...pendingResets.values()]
				.filter(
					(entry) =>
						(!target || entry.binding === target) &&
						!barriers.some((barrier) => barrier.entries.get(entry.key) === entry) &&
						running?.entries.get(entry.key) !== entry &&
						!jobs.some((job) => job.entries.get(entry.key) === entry),
				)
				.map((entry) => [entry.key, entry]),
		)
		if (resets.size) enqueue(resets, {})
		let failure: unknown
		for (const binding of target ? [target] : bindings)
			for (const [field, record] of binding.records) {
				if (
					!record.dirty ||
					(record.blocked && !record.resetPending) ||
					queued.get(record)?.revision === record.revision
				)
					continue
				try {
					const value = readPath(binding.port.getState(binding.store), field.path)
					const payload =
						record.forceDelete || (binding.clearOnDefault && fieldEquals(field, value, binding.defaults.get(field)))
							? null
							: stringifyField(field, value)
					const key = bindingKey(binding, field)
					const entry: Entry = {
						binding,
						field,
						record,
						key,
						revision: record.revision,
						value: payload === null ? null : versioned ? encodeRecord(payload, field.schema?.version ?? 0) : payload,
						reset: record.resetPending && record.forceDelete,
					}
					for (const job of jobs)
						if (!job.barrier && !job.rewrite && !job.entries.get(key)?.reset) job.entries.delete(key)
					entries.set(key, entry)
				} catch (error) {
					failure = error ?? new Error('Cannot encode persistent value')
					report(failure, 'encode', [field])
					refresh(binding, failure)
				}
			}
		if (entries.size > 0) {
			const meta = pendingMeta ?? options.defaultMeta ?? {}
			pendingMeta = null
			for (const reset of [false, true]) {
				const group = new Map([...entries].filter(([, entry]) => entry.reset === reset))
				if (group.size) enqueue(group, meta)
			}
		}
		return failure
	}

	function schedule(): void {
		if (scheduled || disposed) return
		scheduled = true
		const delay = Math.max(0, ...[...bindings].map((binding) => binding.throttleMs))
		const run = (): void => {
			scheduled = false
			timer = undefined
			if (!disposed) collect()
		}
		if (delay > 0) timer = setTimeout(run, delay)
		else queueMicrotask(run)
	}

	function observe(binding: PersistBinding): void {
		for (const [field, record] of binding.records) {
			try {
				const encoded = stringifyField(field, readPath(binding.port.getState(binding.store), field.path))
				if (encoded === record.observed) continue
				record.observed = encoded
				if (systemWrites.has(binding.store)) continue
				record.revision++
				revision++
				record.dirty = true
				record.edited = true
				record.forceDelete = false
				record.outcome = 'edited'
				record.error = null
			} catch (error) {
				record.revision++
				revision++
				record.dirty = true
				record.edited = true
				report(error, 'encode', [field])
				refresh(binding, error)
			}
		}
		updateBindingStatus(binding)
		if (!systemWrites.has(binding.store)) schedule()
	}

	function processRead(
		binding: PersistBinding,
		keyed: Keyed,
		external: boolean,
		expected: Map<RecordState, number>,
	): void {
		const writes: PathWrite[] = []
		for (const [field, record] of binding.records) {
			const key = bindingKey(binding, field)
			if (record.revision !== expected.get(record) || (!external && record.edited)) continue
			let operation: PersistErrorContext['operation'] = 'decode'
			try {
				const raw = keyed.get(key)
				if (raw === undefined) {
					if (external) writes.push({ path: field.path, value: cloneDefault(binding.defaults.get(field)) })
					continue
				}
				const stored = versioned ? decodeRecord(raw) : { version: 0, value: raw }
				const current = field.schema?.version ?? 0
				if (stored.version > current) {
					record.blocked = true
					continue
				}
				if (stored.version < (field.schema?.minVersion ?? 0) || (stored.version < current && !field.schema?.migrate)) {
					record.revision++
					record.dirty = true
					record.forceDelete = true
					record.outcome = 'invalidated'
					continue
				}
				let value: unknown = field.parser.parse(stored.value)
				if (stored.version < current && field.schema?.migrate) {
					operation = 'migrate'
					value = field.schema.migrate(value, stored.version)
					if (value instanceof Promise) throw new Error('Migrate must be synchronous')
				}
				if (field.schema?.validate) {
					operation = 'validate'
					value = field.schema.validate(value)
				}
				if (value instanceof Promise) throw new Error('[ez-kit/store-persist] Schema callbacks must be synchronous')
				const present = readPath(binding.port.getState(binding.store), field.path)
				if (external || fieldEquals(field, present, binding.defaults.get(field))) {
					writes.push({ path: field.path, value })
					record.outcome = stored.version < current ? 'migrated' : 'restored'
					record.error = null
				}
				if (stored.version < current || stringifyField(field, value) !== stored.value) {
					record.revision++
					record.dirty = true
				}
			} catch (error) {
				report(error, operation, [field])
				record.revision++
				record.dirty = true
				record.forceDelete = true
				record.outcome = 'invalidated'
				record.error = error
			}
		}
		if (writes.length) writeBinding(binding, writes)
		for (const [field, record] of binding.records) {
			try {
				record.observed = stringifyField(field, readPath(binding.port.getState(binding.store), field.path))
			} catch {
				/* Reported on the next write. */
			}
		}
		refresh(binding)
		if ([...binding.records.values()].some((record) => record.dirty)) schedule()
	}

	function restore(binding: PersistBinding, supplied: RestoreOptions = {}): Promise<RestoreResult> {
		if (binding.status.restore === 'pending' && binding.restorePromise) return binding.restorePromise
		if (disposed || !bindings.has(binding)) return Promise.resolve({ status: 'idle' })
		const timeout = supplied.timeoutMs ?? binding.restoreOptions.timeoutMs
		if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0))
			throw new Error('[ez-kit/store-persist] Invalid restore timeoutMs')
		binding.cancelRestore?.()
		const initial = !binding.started
		binding.started = true
		const generation = ++binding.generation
		const expected = new Map([...binding.records.values()].map((record) => [record, record.revision]))
		const epoch = revision
		const controller = new AbortController()
		let closed = false
		let deadline: ReturnType<typeof setTimeout> | undefined
		let resolve!: (value: RestoreResult) => void
		const promise = new Promise<RestoreResult>((yes) => {
			resolve = yes
		})
		binding.restorePromise = promise
		const finish = (status: RestoreResult['status'], error?: unknown): void => {
			if (closed) return
			closed = true
			if (deadline) clearTimeout(deadline)
			binding.cancelRestore = null
			updateBindingStatus(binding, { restore: status, error: error ?? null })
			resolve({
				status,
				...(error !== undefined ? { error } : {}),
				...(binding.status.records ? { records: binding.status.records } : {}),
			})
		}
		binding.cancelRestore = () => {
			controller.abort()
			finish('idle')
		}
		updateBindingStatus(binding, { restore: 'pending', error: null })
		if (initial && binding.seeded) {
			for (const notify of binding.seedReports.splice(0)) notify()
			if (binding.seedError !== null) {
				report(binding.seedError, 'read', binding.fields)
				finish('error', binding.seedError)
			} else {
				finish('ready')
				if ([...binding.records.values()].some((record) => record.dirty)) schedule()
			}
			return promise
		}
		const path = binding.fields[0]?.address?.store.path ?? []
		if (barriers.some((barrier) => (barrier.pending || barrier.failed) && isWithinScope(path, barrier.path))) {
			finish('ready')
			return promise
		}
		let rewrite: Keyed | undefined
		const valid = (): boolean => !closed && !disposed && bindings.has(binding) && binding.generation === generation
		const apply = (keyed: Keyed): void => {
			if (!valid()) return
			processRead(binding, keyed, false, expected)
			if (rewrite && epoch === revision)
				enqueue(
					new Map(),
					{},
					undefined,
					rewrite,
					() => !disposed && bindings.has(binding) && binding.generation === generation && epoch === revision,
				)
			finish('ready')
		}
		const fail = (error: unknown): void => {
			if (valid()) {
				report(error, 'read', binding.fields)
				finish('error', error)
			}
		}
		try {
			const result = port.get(
				readContext(
					binding.fields,
					(values) => {
						rewrite = values
					},
					controller.signal,
				),
			)
			if (result instanceof Promise) {
				if (timeout !== undefined)
					deadline = setTimeout(() => {
						if (valid()) {
							controller.abort()
							finish('timeout')
						}
					}, timeout)
				void result.then(apply, fail)
			} else apply(result)
		} catch (error) {
			fail(error)
		}
		return promise
	}

	function resetMemory(binding: PersistBinding, selected: FieldDescriptor[]): Entry[] {
		const writes: PathWrite[] = []
		const entries: Entry[] = []
		for (const field of selected) {
			const record = binding.records.get(field)
			if (!record) continue
			const key = bindingKey(binding, field)
			record.revision++
			revision++
			record.dirty = true
			record.forceDelete = true
			record.resetPending = true
			record.outcome = 'default'
			record.error = null
			for (const job of jobs) if (!job.barrier) job.entries.delete(key)
			queued.delete(record)
			writes.push({ path: field.path, value: cloneDefault(binding.defaults.get(field)) })
			const entry: Entry = { binding, field, record, key, revision: record.revision, value: null, reset: true }
			pendingResets.set(record, entry)
			entries.push(entry)
		}
		writeBinding(binding, writes)
		if (selected.length === binding.fields.length) {
			binding.cancelRestore?.()
			updateBindingStatus(binding, { restore: 'ready' })
		}
		return entries
	}

	const api: PersistEngine = {
		seed(binding) {
			if (!options.ssrSafe || binding.seeded) return
			for (const field of binding.fields) {
				validateSchema(field.schema)
				if ((field.schema?.version ?? 0) > 0 && !versioned)
					throw new Error('[ez-kit/store-persist] Source does not support record versions')
			}
			binding.seeded = true
			deferredReports = binding.seedReports
			try {
				const values = port.get(readContext(binding.fields))
				if (values instanceof Promise) {
					void values.catch(() => undefined)
					throw new Error('[ez-kit/store-persist] Render-scoped source must be synchronous')
				}
				processRead(
					binding,
					values,
					false,
					new Map([...binding.records.values()].map((record) => [record, record.revision])),
				)
			} catch (error) {
				binding.seedError = error ?? new Error('Source read failed')
			} finally {
				deferredReports = null
			}
		},
		get supportsScopeReset() {
			return typeof port.removeScope === 'function'
		},
		connect(binding) {
			if (disposed)
				throw new Error('[ez-kit/store-persist] Cannot connect to disposed engine; recreate the cache entry')
			if (bindings.has(binding)) return () => undefined
			for (const field of binding.fields) {
				validateSchema(field.schema)
				if ((field.schema?.version ?? 0) > 0 && !versioned)
					throw new Error('[ez-kit/store-persist] Source does not support record versions')
				if (versioned && (field.prefix !== undefined || field.absolute))
					throw new Error('[ez-kit/store-persist] Storage prefix/absolute were replaced by StoreId scope')
				const key = bindingKey(binding, field)
				const owner = owners.get(key)
				if (owner && owner.store !== binding.store) throw new Error(`[ez-kit/store-persist] Address collision: ${key}`)
				const physical = port.keyForField?.(field)
				if (physical !== undefined) {
					const existing = physicalOwners.get(physical)
					if (existing && existing.key !== key)
						throw new Error(`[ez-kit/store-persist] Physical key collision: ${physical}`)
					physicalOwners.set(physical, { binding, key })
				}
				owners.set(key, binding)
			}
			bindings.add(binding)
			binding.controller = api
			subscriptions.set(
				binding,
				binding.port.subscribe(binding.store, () => {
					observe(binding)
				}),
			)
			if (!binding.started || binding.status.restore === 'idle') void restore(binding)
			return () => {
				subscriptions.get(binding)?.()
				subscriptions.delete(binding)
				bindings.delete(binding)
				binding.controller = null
				for (const field of binding.fields)
					if (owners.get(bindingKey(binding, field)) === binding) owners.delete(bindingKey(binding, field))
				for (const [physical, owner] of physicalOwners) if (owner.binding === binding) physicalOwners.delete(physical)
				queueMicrotask(() => {
					if (!bindings.has(binding)) binding.cancelRestore?.()
				})
			}
		},
		snapshot() {
			return port.get(readContext([...bindings].flatMap((binding) => binding.fields)))
		},
		pull(external) {
			if (disposed) return
			for (const binding of bindings) {
				if (
					(binding.restoreOptions.externalChanges ?? options.externalChanges ?? 'apply') === 'ignore' ||
					barriers.some((barrier) => isWithinScope(binding.fields[0]?.address?.store.path ?? [], barrier.path))
				)
					continue
				processRead(
					binding,
					external,
					true,
					new Map([...binding.records.values()].map((record) => [record, record.revision])),
				)
			}
		},
		pullSource() {
			const generation = ++externalGeneration
			const epoch = revision
			try {
				const result = api.snapshot()
				if (result instanceof Promise)
					void result.then(
						(values) => {
							if (!disposed && generation === externalGeneration && epoch === revision) api.pull(values)
						},
						(error: unknown) => {
							report(
								error,
								'read',
								[...bindings].flatMap((binding) => binding.fields),
							)
						},
					)
				else api.pull(result)
			} catch (error) {
				report(
					error,
					'read',
					[...bindings].flatMap((binding) => binding.fields),
				)
			}
		},
		runWithMeta(meta, mutate) {
			pendingMeta = (options.mergeMeta ?? defaultMerge)(pendingMeta, meta)
			mutate()
		},
		flushNow() {
			void api.flush().catch(() => undefined)
		},
		flush(binding) {
			if (timer) clearTimeout(timer)
			timer = undefined
			scheduled = false
			const retries: Promise<void>[] = []
			for (const barrier of barriers)
				if (barrier.failed && !barrier.pending) {
					barrier.failed = false
					barrier.pending = true
					retries.push(enqueue(barrier.entries, {}, barrier).promise)
				}
			const targets = new Map<RecordState, number>()
			const blocked: string[] = []
			for (const item of binding ? [binding] : bindings)
				for (const [field, record] of item.records) {
					if (record.dirty) targets.set(record, record.revision)
					if (record.blocked && !record.resetPending) blocked.push(bindingKey(item, field))
				}
			const fencePromise = new Promise<void>((resolve, reject) => {
				const fence: Fence = { targets, resolve, reject }
				fences.add(fence)
				const failure = collect(binding)
				if (blocked.length || failure !== undefined) {
					fences.delete(fence)
					reject(
						failure instanceof Error
							? failure
							: blocked.length
								? new FutureVersionError(blocked)
								: new Error('Cannot encode persistent value', { cause: failure }),
					)
				} else settleFences()
			})
			return Promise.all([fencePromise, ...retries]).then(() => undefined)
		},
		restore,
		reset(binding, fields) {
			const selected = binding.fields.filter(
				(field) => !fields || fields.some((path) => JSON.stringify(path) === JSON.stringify(field.path)),
			)
			const entries = resetMemory(binding, selected)
			return enqueue(new Map(entries.map((entry) => [entry.key, entry])), {}).promise
		},
		resetScope(path) {
			if (!port.removeScope)
				return Promise.reject(new Error('[ez-kit/store-persist] Source does not support full scope deletion'))
			// A new full delete also retries failed subtrees covered by this scope.
			for (let index = barriers.length - 1; index >= 0; index--) {
				const previous = barriers[index]
				if (previous?.failed && isWithinScope(previous.path, path)) barriers.splice(index, 1)
			}
			revision++
			externalGeneration++
			const barrier: Barrier = { path: [...path], pending: true, failed: false, entries: new Map() }
			barriers.push(barrier)
			const entries: Entry[] = []
			for (const binding of bindings)
				if (isWithinScope(binding.fields[0]?.address?.store.path ?? [], path))
					entries.push(...resetMemory(binding, binding.fields))
			barrier.entries = new Map(entries.map((entry) => [entry.key, entry]))
			return enqueue(barrier.entries, {}, barrier).promise
		},
		dispose() {
			disposed = true
			externalGeneration++
			if (timer) clearTimeout(timer)
			for (const binding of bindings) {
				binding.cancelRestore?.()
				binding.controller = null
			}
			for (const unsubscribe of subscriptions.values()) unsubscribe()
			const error = new Error('[ez-kit/store-persist] Engine disposed')
			for (const job of jobs.splice(0)) job.reject(error)
			for (const fence of fences) fence.reject(error)
			fences.clear()
			subscriptions.clear()
			bindings.clear()
			owners.clear()
			physicalOwners.clear()
			queued.clear()
			pendingResets.clear()
		},
	}
	return api
}
