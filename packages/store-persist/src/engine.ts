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
	RestoreCallOptions,
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
	restore(binding: PersistBinding, options?: RestoreCallOptions): Promise<RestoreResult>
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
	meta: unknown
}
type Barrier = { path: readonly string[]; pending: boolean; failed: boolean; entries: Map<string, Entry> }
type Job = {
	id: number
	kind: 'patch' | 'reset' | 'scope-reset' | 'container-rewrite'
	state: 'pending' | 'acknowledged' | 'failed' | 'cancelled'
	error: unknown
	owner?: PersistBinding
	entries: Map<string, Entry>
	barrier?: Barrier
	meta: unknown
	resolve: () => void
	reject: (error: unknown) => void
	promise: Promise<void>
	rewrite?: Keyed
	valid?: () => boolean
}
type Fence = {
	targets: Map<RecordState, number>
	operations: Set<Job>
	resolve: () => void
	reject: (error: unknown) => void
}

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
	const detached = new Set<PersistBinding>()
	const operations = new Set<Job>()
	const writeErrors = new WeakMap<PersistBinding, unknown>()
	const deadlines = new Map<PersistBinding, number>()
	let nextOperationId = 0
	const subscriptions = new Map<PersistBinding, () => void>()
	const connections = new WeakMap<PersistBinding, number>()
	const owners = new Map<string, PersistBinding>()
	const physicalOwners = new Map<string, { binding: PersistBinding; key: string }>()
	const queued = new Map<RecordState, Entry>()
	const pendingResets = new Map<RecordState, Entry>()
	const jobs: Job[] = []
	const fences = new Set<Fence>()
	const barriers: Barrier[] = []
	let running: Job | null = null
	let disposed = false
	let scheduleGeneration = 0
	let scheduledAt: number | undefined
	let timer: ReturnType<typeof setTimeout> | undefined
	let activeMeta: unknown = null
	const pendingMetas = new Map<RecordState, unknown>()
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

	function allBindings(): Set<PersistBinding> {
		return new Set([...bindings, ...detached])
	}

	function applies(job: Job, binding: PersistBinding): boolean {
		if (job.kind === 'container-rewrite') return true
		return (
			job.owner === binding ||
			[...job.entries.values()].some((entry) => entry.binding === binding) ||
			(job.barrier !== undefined && isWithinScope(binding.fields[0]?.address?.store.path ?? [], job.barrier.path))
		)
	}

	function affectedBy(job: Job): Set<PersistBinding> {
		return new Set(
			[
				...allBindings(),
				...[...job.entries.values()].map((entry) => entry.binding),
				...(job.owner ? [job.owner] : []),
			].filter((binding) => applies(job, binding)),
		)
	}

	function refresh(binding: PersistBinding, error?: unknown): void {
		if (error !== undefined) writeErrors.set(binding, error)
		const related = [...operations].filter((job) => applies(job, binding))
		const failure = related.find((job) => job.state === 'failed')?.error ?? writeErrors.get(binding)
		const blocked = [...binding.records.values()].some((record) => record.blocked)
		const pending = related.some((job) => job.state === 'pending') || deadlines.has(binding)
		updateBindingStatus(binding, {
			write: blocked ? 'blocked' : failure !== undefined ? 'error' : pending ? 'pending' : 'idle',
			error: failure ?? null,
		})
		if (
			!bindings.has(binding) &&
			![...binding.records.values()].some((record) => record.dirty) &&
			!pending &&
			failure === undefined
		) {
			detached.delete(binding)
			binding.controller = null
		}
	}

	function settleFences(error?: unknown, entries: Iterable<Entry> = []): void {
		const failed = new Map([...entries].map((entry) => [entry.record, entry.reset ? Infinity : entry.revision]))
		for (const fence of fences) {
			const operationError = [...fence.operations].find((job) => job.state === 'failed')
			if (
				operationError ||
				(error !== undefined && [...fence.targets].some(([record, target]) => (failed.get(record) ?? -1) >= target))
			) {
				fences.delete(fence)
				fence.reject(operationError?.error ?? error)
			} else if (
				[...fence.targets].every(([record, target]) => record.acknowledged >= target) &&
				[...fence.operations].every((job) => job.state === 'acknowledged' || job.state === 'cancelled')
			) {
				fences.delete(fence)
				fence.resolve()
			}
		}
	}

	function entryBlocked(entry: Entry): boolean {
		return (
			barriers.some(
				(barrier) =>
					(barrier.pending || barrier.failed) && isWithinScope(entry.field.address?.store.path ?? [], barrier.path),
			) ||
			(!entry.reset && pendingResets.has(entry.record))
		)
	}

	function entryMeta(entries: Iterable<Entry>, fallback: unknown = options.defaultMeta ?? {}): unknown {
		let meta: unknown = fallback
		let first = true
		for (const entry of entries) {
			if (first) {
				meta = entry.meta
				first = false
			} else if (!Object.is(meta, entry.meta)) meta = (options.mergeMeta ?? defaultMerge)(meta, entry.meta)
		}
		return meta
	}

	function contextFor(job: Job): CommitCtx {
		const entries = [...job.entries.values()]
		return {
			fields: entries.map((entry) => entry.field),
			diff: {
				set: entries.filter((entry) => entry.value !== null).map((entry) => entry.key),
				removed: entries.filter((entry) => entry.value === null).map((entry) => entry.key),
			},
			meta: entryMeta(entries, job.meta),
			addresses: new Map(
				entries.flatMap((entry) => (entry.field.address ? [[entry.key, entry.field.address] as const] : [])),
			),
			maxVersions: new Map(entries.map((entry) => [entry.key, entry.field.schema?.version ?? 0])),
			explicitReset: entries.length > 0 && entries.every((entry) => entry.reset),
		}
	}

	function drain(): void {
		if (disposed || running) return
		const index = jobs.findIndex(
			(job) =>
				job.kind === 'scope-reset' ||
				job.kind === 'container-rewrite' ||
				[...job.entries.values()].every((entry) => !entryBlocked(entry)),
		)
		if (index < 0) return
		const job = jobs.splice(index, 1)[0]
		if (!job) return
		running = job
		const finish = (error?: unknown): void => {
			if (running === job) running = null
			job.state = error === undefined ? 'acknowledged' : 'failed'
			job.error = error
			if (error === undefined || (job.kind !== 'container-rewrite' && job.kind !== 'scope-reset'))
				operations.delete(job)
			const affected = affectedBy(job)
			for (const entry of job.entries.values()) {
				affected.add(entry.binding)
				if (queued.get(entry.record) === entry) queued.delete(entry.record)
				if (error === undefined) {
					entry.record.acknowledged = Math.max(entry.record.acknowledged, entry.revision)
					if (pendingResets.get(entry.record) === entry) pendingResets.delete(entry.record)
					if (entry.reset || job.barrier) {
						entry.record.blocked = false
						entry.record.resetPending = pendingResets.has(entry.record)
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
			for (const binding of affected) {
				if (error === undefined) writeErrors.delete(binding)
				refresh(binding, error)
			}
			settleFences(error, job.entries.values())
			if (error === undefined) job.resolve()
			else {
				report(
					error,
					job.kind === 'scope-reset'
						? 'removeScope'
						: job.kind === 'container-rewrite'
							? 'write'
							: [...job.entries.values()].every((entry) => entry.value === null)
								? 'remove'
								: 'write',
					job.kind === 'container-rewrite'
						? (job.owner?.fields ?? [])
						: [...job.entries.values()].map((entry) => entry.field),
					job.barrier?.path,
				)
				job.reject(error)
			}
			drain()
			if (error === undefined || error instanceof FutureVersionError) for (const binding of affected) schedule(binding)
		}
		try {
			let result: void | Promise<void> = undefined
			if (job.valid && !job.valid()) {
				job.state = 'cancelled'
				operations.delete(job)
				job.resolve()
				for (const binding of affectedBy(job)) refresh(binding)
				settleFences()
				running = null
				drain()
				return
			}
			if (job.barrier) result = port.removeScope?.(job.barrier.path)
			else if (job.rewrite) {
				if (!port.rewriteContainer) throw new Error('[ez-kit/store-persist] Source does not support container rewrites')
				result = port.rewriteContainer(job.rewrite)
			} else if (job.entries.size > 0)
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
		owner?: PersistBinding,
	): Job {
		let resolve!: () => void
		let reject!: (error: unknown) => void
		const promise = new Promise<void>((yes, no) => {
			resolve = yes
			reject = no
		})
		void promise.catch(() => undefined)
		const job: Job = {
			id: ++nextOperationId,
			kind: barrier
				? 'scope-reset'
				: rewrite
					? 'container-rewrite'
					: entries.size > 0 && [...entries.values()].every((entry) => entry.reset)
						? 'reset'
						: 'patch',
			state: 'pending',
			error: null,
			...(owner ? { owner } : {}),
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
		operations.add(job)
		for (const binding of affectedBy(job)) {
			writeErrors.delete(binding)
			refresh(binding)
		}
		drain()
		return job
	}

	function collect(target?: PersistBinding, ready?: ReadonlySet<PersistBinding>): unknown {
		const entries = new Map<string, Entry>()
		const resets = new Map(
			[...pendingResets.values()]
				.filter(
					(entry) =>
						(!target || entry.binding === target) &&
						(!ready || ready.has(entry.binding)) &&
						!barriers.some((barrier) => barrier.entries.get(entry.key) === entry) &&
						running?.entries.get(entry.key) !== entry &&
						!jobs.some((job) => job.entries.get(entry.key) === entry),
				)
				.map((entry) => [entry.key, entry]),
		)
		if (resets.size) enqueue(resets, {})
		let failure: unknown
		for (const binding of target ? [target] : (ready ?? allBindings()))
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
					let meta: unknown = options.defaultMeta ?? {}
					for (const job of jobs) {
						const previous = job.kind === 'patch' ? job.entries.get(key) : undefined
						if (previous) meta = (options.mergeMeta ?? defaultMerge)(meta, previous.meta)
					}
					const override = pendingMetas.get(record)
					if (override !== undefined) meta = (options.mergeMeta ?? defaultMerge)(meta, override)
					pendingMetas.delete(record)
					const entry: Entry = {
						binding,
						field,
						record,
						key,
						revision: record.revision,
						value: payload === null ? null : versioned ? encodeRecord(payload, field.schema?.version ?? 0) : payload,
						reset: record.resetPending && record.forceDelete,
						meta,
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
			for (const reset of [false, true]) {
				const group = new Map([...entries].filter(([, entry]) => entry.reset === reset))
				if (group.size) {
					const readyEntries = new Map([...group].filter(([, entry]) => !entryBlocked(entry)))
					if (readyEntries.size) enqueue(readyEntries, entryMeta(readyEntries.values()))
					for (const [key, entry] of group) if (entryBlocked(entry)) enqueue(new Map([[key, entry]]), entry.meta)
				}
			}
		}
		return failure
	}

	function planSchedule(): void {
		const next = deadlines.size ? Math.min(...deadlines.values()) : undefined
		if (next === undefined) {
			if (timer) clearTimeout(timer)
			timer = undefined
			scheduledAt = undefined
			scheduleGeneration++
			return
		}
		if (scheduledAt !== undefined && scheduledAt <= next) return
		if (timer) clearTimeout(timer)
		timer = undefined
		scheduledAt = next
		const generation = ++scheduleGeneration
		const run = (): void => {
			if (disposed || generation !== scheduleGeneration) return
			timer = undefined
			scheduledAt = undefined
			const ready = new Set([...deadlines].filter(([, deadline]) => deadline <= Date.now()).map(([binding]) => binding))
			for (const binding of ready) deadlines.delete(binding)
			collect(undefined, ready)
			for (const binding of ready) refresh(binding)
			planSchedule()
		}
		const delay = Math.max(0, next - Date.now())
		if (delay > 0) timer = setTimeout(run, delay)
		else queueMicrotask(run)
	}

	function schedule(binding: PersistBinding): void {
		if (
			disposed ||
			(!bindings.has(binding) && !detached.has(binding)) ||
			![...binding.records.values()].some(
				(record) =>
					record.dirty && (!record.blocked || record.resetPending) && queued.get(record)?.revision !== record.revision,
			)
		)
			return
		if (!deadlines.has(binding)) {
			const delay = Number.isFinite(binding.throttleMs) ? Math.max(0, binding.throttleMs) : 0
			deadlines.set(binding, Date.now() + delay)
		}
		refresh(binding)
		planSchedule()
	}

	function observe(binding: PersistBinding): void {
		for (const [field, record] of binding.records) {
			try {
				const encoded = stringifyField(field, readPath(binding.port.getState(binding.store), field.path))
				if (encoded === record.observed) continue
				record.observed = encoded
				if (systemWrites.has(binding.store)) continue
				if (activeMeta !== null)
					pendingMetas.set(record, (options.mergeMeta ?? defaultMerge)(pendingMetas.get(record), activeMeta))
				record.revision++
				revision++
				record.dirty = true
				record.edited = true
				record.forceDelete = false
				record.outcome = 'edited'
				record.error = null
			} catch (error) {
				if (activeMeta !== null)
					pendingMetas.set(record, (options.mergeMeta ?? defaultMerge)(pendingMetas.get(record), activeMeta))
				record.revision++
				revision++
				record.dirty = true
				record.edited = true
				report(error, 'encode', [field])
				refresh(binding, error)
			}
		}
		updateBindingStatus(binding)
		if (!systemWrites.has(binding.store)) schedule(binding)
	}

	function supersedeWithExternal(binding: PersistBinding, field: FieldDescriptor, record: RecordState): void {
		const key = bindingKey(binding, field)
		const inFlight = running?.entries.get(key)
		const previousRevision = record.revision
		for (const job of jobs) if (job.kind === 'patch' && job.entries.get(key)?.record === record) job.entries.delete(key)
		queued.delete(record)
		pendingMetas.delete(record)
		for (const fence of fences) {
			const target = fence.targets.get(record)
			// Unsent intent is cancelled, not acknowledged. Already-sent revisions retain their fence.
			if (
				target !== undefined &&
				target <= previousRevision &&
				!(inFlight?.record === record && inFlight.revision >= target)
			)
				fence.targets.delete(record)
		}
		record.revision++
		revision++
		record.forceDelete = false
		record.error = null
		// A genuinely sent async write cannot be cancelled; serialize a corrective value behind it.
		record.dirty = inFlight?.record === record
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
			if (record.revision !== expected.get(record) || record.resetPending) continue
			let operation: PersistErrorContext['operation'] = 'decode'
			try {
				const raw = keyed.get(key)
				if (raw === undefined) {
					record.blocked = false
					record.error = null
					if (external) {
						supersedeWithExternal(binding, field, record)
						record.outcome = 'default'
						writes.push({ path: field.path, value: cloneDefault(binding.defaults.get(field)) })
					}
					continue
				}
				if (!external && record.edited) continue
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
				if (external) supersedeWithExternal(binding, field, record)
				if (record.forceDelete) {
					record.forceDelete = false
					record.revision++
					revision++
					for (const job of jobs) if (job.kind === 'patch') job.entries.delete(key)
					if (queued.get(record)?.value === null) queued.delete(record)
				}
				record.blocked = false
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
		if (![...binding.records.values()].some((record) => record.dirty)) {
			deadlines.delete(binding)
			planSchedule()
		}
		refresh(binding)
		if ([...binding.records.values()].some((record) => record.dirty)) schedule(binding)
		if (external) {
			drain()
			settleFences()
		}
	}

	type ExternalSnapshot = { connection: number; generation: number; records: Map<RecordState, number> }
	function captureExternal(): Map<PersistBinding, ExternalSnapshot> {
		return new Map(
			[...bindings].map((binding) => [
				binding,
				{
					connection: connections.get(binding) ?? 0,
					generation: binding.generation,
					records: new Map([...binding.records.values()].map((record) => [record, record.revision])),
				},
			]),
		)
	}
	function externalCurrent(binding: PersistBinding, snapshot: ExternalSnapshot): boolean {
		return (
			bindings.has(binding) &&
			connections.get(binding) === snapshot.connection &&
			binding.generation === snapshot.generation &&
			(binding.restoreOptions.externalChanges ?? options.externalChanges ?? 'apply') !== 'ignore' &&
			!barriers.some((barrier) => isWithinScope(binding.fields[0]?.address?.store.path ?? [], barrier.path))
		)
	}
	function applyExternal(values: Keyed, captured: Map<PersistBinding, ExternalSnapshot>): void {
		for (const [binding, snapshot] of captured)
			if (externalCurrent(binding, snapshot)) processRead(binding, values, true, snapshot.records)
	}

	function restore(binding: PersistBinding, supplied: RestoreCallOptions = {}): Promise<RestoreResult> {
		if (binding.status.restore === 'pending' && binding.restorePromise) return binding.restorePromise
		if (disposed || !bindings.has(binding)) return Promise.resolve({ status: 'idle' })
		const timeout = supplied.timeoutMs === undefined ? binding.restoreOptions.timeoutMs : supplied.timeoutMs
		if (timeout !== undefined && timeout !== null && (!Number.isFinite(timeout) || timeout < 0))
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
			updateBindingStatus(binding, {
				restore: status,
				error: error ?? (binding.status.write === 'error' ? binding.status.error : null),
			})
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
				if ([...binding.records.values()].some((record) => record.dirty)) schedule(binding)
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
					binding,
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
				if (timeout !== undefined && timeout !== null)
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
			for (const job of jobs) if (job.kind === 'patch') job.entries.delete(key)
			queued.delete(record)
			writes.push({ path: field.path, value: cloneDefault(binding.defaults.get(field)) })
			pendingMetas.delete(record)
			const entry: Entry = {
				binding,
				field,
				record,
				key,
				revision: record.revision,
				value: null,
				reset: true,
				meta: activeMeta ?? options.defaultMeta ?? {},
			}
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
			const acquisitions: { key: string; physical: string | undefined }[] = []
			const proposedPhysical = new Map<string, string>()
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
					const proposed = proposedPhysical.get(physical)
					if (proposed !== undefined && proposed !== key)
						throw new Error(`[ez-kit/store-persist] Physical key collision: ${physical}`)
					proposedPhysical.set(physical, key)
				}
				acquisitions.push({ key, physical })
			}
			const wasDetached = detached.has(binding)
			const previousController = binding.controller
			const previousOwners = new Map(acquisitions.map(({ key }) => [key, owners.get(key)]))
			const previousPhysical = new Map(
				acquisitions.flatMap(({ physical }) =>
					physical === undefined ? [] : [[physical, physicalOwners.get(physical)] as const],
				),
			)
			for (const { key, physical } of acquisitions) {
				owners.set(key, binding)
				if (physical !== undefined) physicalOwners.set(physical, { binding, key })
			}
			connections.set(binding, (connections.get(binding) ?? 0) + 1)
			bindings.add(binding)
			detached.delete(binding)
			binding.controller = api
			try {
				subscriptions.set(
					binding,
					binding.port.subscribe(binding.store, () => {
						observe(binding)
					}),
				)
				if (!binding.started || binding.status.restore === 'idle') void restore(binding)
				if ([...operations].some((job) => applies(job, binding))) refresh(binding)
			} catch (error) {
				binding.cancelRestore?.()
				subscriptions.get(binding)?.()
				subscriptions.delete(binding)
				bindings.delete(binding)
				if (wasDetached) detached.add(binding)
				binding.controller = previousController
				connections.set(binding, (connections.get(binding) ?? 0) + 1)
				for (const [key, previous] of previousOwners) {
					if (previous) owners.set(key, previous)
					else owners.delete(key)
				}
				for (const [key, previous] of previousPhysical) {
					if (previous) physicalOwners.set(key, previous)
					else physicalOwners.delete(key)
				}
				throw error
			}
			return () => {
				deadlines.delete(binding)
				collect(binding)
				if (
					[...binding.records.values()].some((record) => record.dirty) ||
					[...operations].some((job) => applies(job, binding))
				)
					detached.add(binding)
				planSchedule()
				subscriptions.get(binding)?.()
				subscriptions.delete(binding)
				bindings.delete(binding)
				if (!detached.has(binding)) binding.controller = null
				connections.set(binding, (connections.get(binding) ?? 0) + 1)
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
			if (!disposed) applyExternal(external, captureExternal())
		},
		pullSource() {
			if (disposed) return
			const generation = ++externalGeneration
			const captured = captureExternal()
			const valid = (): boolean => !disposed && generation === externalGeneration
			const fail = (error: unknown): void => {
				if (!valid()) return
				const fields = [...captured].flatMap(([binding, snapshot]) =>
					externalCurrent(binding, snapshot)
						? [...binding.records]
								.filter(([, record]) => record.revision === snapshot.records.get(record))
								.map(([field]) => field)
						: [],
				)
				if (fields.length) report(error, 'read', fields)
			}
			try {
				const result = api.snapshot()
				if (result instanceof Promise)
					void result.then((values) => {
						if (valid()) applyExternal(values, captured)
					}, fail)
				else if (valid()) applyExternal(result, captured)
			} catch (error) {
				fail(error)
			}
		},
		runWithMeta(meta, mutate) {
			const previous = activeMeta
			activeMeta = (options.mergeMeta ?? defaultMerge)(previous, meta)
			try {
				mutate()
			} finally {
				activeMeta = previous
			}
		},
		flushNow() {
			void api.flush().catch(() => undefined)
		},
		flush(binding) {
			if (disposed) return Promise.reject(new Error('[ez-kit/store-persist] Engine disposed'))
			if (binding) deadlines.delete(binding)
			else deadlines.clear()
			planSchedule()
			const retries: Promise<void>[] = []
			for (const job of [...operations]) {
				if (job.state !== 'failed' || (binding && !applies(job, binding))) continue
				job.state = 'cancelled'
				operations.delete(job)
				if (job.valid && !job.valid()) {
					for (const item of affectedBy(job)) {
						writeErrors.delete(item)
						refresh(item)
					}
					continue
				}
				if (job.barrier) {
					job.barrier.failed = false
					job.barrier.pending = true
				}
				retries.push(enqueue(job.entries, job.meta, job.barrier, job.rewrite, job.valid, job.owner).promise)
			}
			const targets = new Map<RecordState, number>()
			const blocked: string[] = []
			for (const item of binding ? [binding] : allBindings())
				for (const [field, record] of item.records) {
					if (record.dirty) targets.set(record, record.revision)
					if (record.blocked && !record.resetPending) blocked.push(bindingKey(item, field))
				}
			if (blocked.length) {
				collect(binding)
				return Promise.reject(new FutureVersionError(blocked))
			}
			const captured = new Set(
				[...operations].filter(
					(job) =>
						(job.kind === 'container-rewrite' || job.kind === 'scope-reset') && (!binding || applies(job, binding)),
				),
			)
			const fencePromise = new Promise<void>((resolve, reject) => {
				const fence: Fence = { targets, operations: captured, resolve, reject }
				fences.add(fence)
				const failure = collect(binding)
				if (failure !== undefined) {
					fences.delete(fence)
					reject(failure instanceof Error ? failure : new Error('Cannot encode persistent value', { cause: failure }))
				} else settleFences()
			})
			return Promise.all([fencePromise, ...retries]).then(() => undefined)
		},
		restore,
		reset(binding, fields) {
			if (disposed) return Promise.reject(new Error('[ez-kit/store-persist] Engine disposed'))
			for (const path of fields ?? [])
				if (!binding.fields.some((field) => JSON.stringify(path) === JSON.stringify(field.path)))
					return Promise.reject(new Error(`[ez-kit/store-persist] Unknown reset field: ${JSON.stringify(path)}`))
			const selected = binding.fields.filter(
				(field) => !fields || fields.some((path) => JSON.stringify(path) === JSON.stringify(field.path)),
			)
			if (selected.length === 0) return Promise.resolve()
			const entries = resetMemory(binding, selected)
			return enqueue(new Map(entries.map((entry) => [entry.key, entry])), {}).promise
		},
		resetScope(path) {
			if (disposed) return Promise.reject(new Error('[ez-kit/store-persist] Engine disposed'))
			if (!port.removeScope)
				return Promise.reject(new Error('[ez-kit/store-persist] Source does not support full scope deletion'))
			// A new full delete also retries failed subtrees covered by this scope.
			for (let index = barriers.length - 1; index >= 0; index--) {
				const previous = barriers[index]
				if (previous?.failed && isWithinScope(previous.path, path)) {
					barriers.splice(index, 1)
					for (const job of operations)
						if (job.barrier === previous) {
							job.state = 'cancelled'
							operations.delete(job)
						}
				}
			}
			revision++
			const barrier: Barrier = { path: [...path], pending: true, failed: false, entries: new Map() }
			barriers.push(barrier)
			const entries: Entry[] = []
			for (const binding of allBindings())
				if (isWithinScope(binding.fields[0]?.address?.store.path ?? [], path))
					entries.push(...resetMemory(binding, binding.fields))
			barrier.entries = new Map(entries.map((entry) => [entry.key, entry]))
			return enqueue(barrier.entries, {}, barrier).promise
		},
		dispose() {
			disposed = true
			externalGeneration++
			if (timer) clearTimeout(timer)
			deadlines.clear()
			scheduleGeneration++
			for (const binding of allBindings()) {
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
			detached.clear()
			operations.clear()
			owners.clear()
			physicalOwners.clear()
			queued.clear()
			pendingResets.clear()
			pendingMetas.clear()
		},
	}
	return api
}
