import { isWithinScope, parentOf, readPath, serializePersistAddress } from '@ez-kit/store-core'

import { fieldKey } from './key-naming'
import { validateBinding } from './validate'

import type {
	FieldDescriptor,
	Keyed,
	PersistOptions,
	PersistRecordStatus,
	PersistStatus,
	RestoreCallOptions,
	RestoreOptions,
	RestoreResult,
} from './types'
import type { PathWrite, StoreId, StorePort } from '@ez-kit/store-core'

/** Whether values flow in as first-mount hydration or as a runtime external change. */
export enum ApplyMode {
	/** Cold-start: write a field only if it still holds its default (first-present-wins). */
	Hydrate = 'hydrate',
	/** Runtime: last-arrival-wins; a field absent from the substrate resets to its default. */
	Pull = 'pull',
}

/** Minimal engine capability a per-source control handle needs (avoids an import cycle). */
export type MetaRunner = {
	runWithMeta(metaPatch: unknown, mutate: () => void): void
	restore?(binding: PersistBinding, options?: RestoreCallOptions): Promise<RestoreResult>
	flush?(binding?: PersistBinding): Promise<void>
	reset?(binding: PersistBinding, fields?: readonly (readonly string[])[]): Promise<void>
}

export type RecordState = {
	revision: number
	dirty: boolean
	edited: boolean
	blocked: boolean
	observed: string | null
	forceDelete: boolean
	acknowledged: number
	resetPending: boolean
	outcome: PersistRecordStatus['outcome']
	error: unknown
}

/** Shared across source bindings: applying one source is not a user edit in another. */
export const systemWrites = new WeakMap<object, readonly PathWrite[]>()

export function isSystemWrite(writes: readonly PathWrite[], field: FieldDescriptor, encoded: string | null): boolean {
	for (let index = writes.length - 1; index >= 0; index--) {
		const write = writes[index]
		if (!write) continue
		if (isWithinScope(field.path, write.path)) {
			const suffix = field.path.slice(write.path.length)
			const value = suffix.length
				? write.value !== null && typeof write.value === 'object'
					? readPath(write.value, suffix)
					: undefined
				: write.value
			return stringifyField(field, value) === encoded
		}
		// Composite fields can observe intermediate values while a manager applies a batch.
		if (isWithinScope(write.path, field.path)) return true
	}
	return false
}

/** Snapshot data without enumerating away serializer methods, accessors or nested data prototypes. */
export function cloneDefault(value: unknown, seen = new WeakMap<object, object>()): unknown {
	if (value === null || typeof value !== 'object') return value
	const previous = seen.get(value)
	if (previous) return previous
	const prototype = Object.getPrototypeOf(value) as object | null
	const copy: object =
		value instanceof Date ? new Date(value.getTime()) : Array.isArray(value) ? [] : (Object.create(prototype) as object)
	Object.setPrototypeOf(copy, prototype)
	seen.set(value, copy)
	for (const key of Reflect.ownKeys(value)) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key)
		if (!descriptor) continue
		if ('value' in descriptor) descriptor.value = cloneDefault(descriptor.value, seen)
		Object.defineProperty(copy, key, descriptor)
	}
	return copy
}

export function writeBinding(binding: PersistBinding, writes: PathWrite[]): void {
	const previous = systemWrites.get(binding.store)
	systemWrites.set(binding.store, previous ? [...previous, ...writes] : writes)
	try {
		binding.port.write(binding.store, writes)
	} finally {
		if (previous) systemWrites.set(binding.store, previous)
		else systemWrites.delete(binding.store)
	}
}

export function updateBindingStatus(binding: PersistBinding, patch: Partial<PersistStatus> = {}): void {
	const records = [...binding.records.values()]
	const dirty = records.some((record) => record.dirty)
	const blocked = records.some((record) => record.blocked)
	const detail = [...binding.records].map(([field, record], index): PersistRecordStatus => {
		const previous = binding.status.records?.[index]
		const outcome = record.blocked ? 'future-version' : record.outcome
		if (previous?.outcome === outcome && previous.error === record.error && previous.address === field.address)
			return previous
		return { field: field.path, ...(field.address ? { address: field.address } : {}), outcome, error: record.error }
	})
	const sameRecords =
		detail.length === binding.status.records?.length &&
		detail.every((record, index) => binding.status.records?.[index] === record)
	const next: PersistStatus = {
		...binding.status,
		dirty,
		writeBlocked: blocked ? 'future-version' : null,
		records: sameRecords ? (binding.status.records ?? []) : detail,
		...patch,
	}
	if (
		Object.keys(next).every((key) =>
			Object.is(next[key as keyof PersistStatus], binding.status[key as keyof PersistStatus]),
		)
	)
		return
	binding.status = next
	notifyStatusListeners(binding.listeners)
}

export function notifyStatusListeners(listeners: ReadonlySet<() => void>): void {
	for (const listener of listeners) {
		try {
			listener()
		} catch (error) {
			// A status observer cannot veto queue progression or other observers.
			console.error('[ez-kit/store-persist] Status subscriber failed', error)
		}
	}
}

/** A connected store: the store handle, its port, and everything the engine needs to sync it to one source. */
export type PersistBinding = {
	/** The store handle this binding syncs — a Valtio proxy, a Zustand `StoreApi`, whatever the port speaks. */
	store: object
	/**
	 * How to read, write and observe {@link store}. It lives on the binding rather than on the engine
	 * because a single engine (one per source, app-wide) serves every store bound to that source — and
	 * those stores may come from different managers in one app.
	 */
	port: StorePort
	fields: FieldDescriptor[]
	/** Stable logical key per field (path/`key`/`absolute`; substrate prefix is an adapter concern). */
	keyOf: Map<FieldDescriptor, string>
	/**
	 * Field defaults captured before any hydration (for clearOnDefault and reset-on-absent). Seeded at
	 * construction and re-taken by {@link captureDefaults} when the binding connects.
	 */
	defaults: Map<FieldDescriptor, unknown>
	clearOnDefault: boolean
	throttleMs: number
	/**
	 * The controller currently syncing this binding, or `null` when no provider is mounted. Consumed
	 * by the per-source handle (`$url`/`$persist`) to route `runWithMeta` overrides (Phase 2).
	 */
	controller: MetaRunner | null
	records: Map<FieldDescriptor, RecordState>
	status: PersistStatus
	listeners: Set<() => void>
	restoreOptions: RestoreOptions
	started: boolean
	seeded: boolean
	seedError: unknown
	seedReports: (() => void)[]
	defaultsCaptured: boolean
	restorePromise: Promise<RestoreResult> | null
	cancelRestore: (() => void) | null
	generation: number
}

export function fieldEquals(field: FieldDescriptor, a: unknown, b: unknown): boolean {
	return field.parser.equals
		? field.parser.equals(a, b)
		: Object.is(a, b) || stringifyField(field, a) === stringifyField(field, b)
}

export function stringifyField(field: FieldDescriptor, value: unknown): string | null {
	return field.parser.stringify ? field.parser.stringify(value) : String(value)
}

function snapshotDefault(field: FieldDescriptor, value: unknown, encoded: string | null): unknown {
	const snapshot = cloneDefault(value)
	let error: unknown
	try {
		if (stringifyField(field, snapshot) === encoded) return snapshot
	} catch (failure) {
		error = failure
	}
	throw new Error(
		`[ez-kit/store-persist] Cannot snapshot default for "${field.path.join('.')}"; ` +
			'use plain data or serializers based on snapshottable own data',
		{ cause: error },
	)
}

/**
 * Build a binding from a store, its port, the resolved field descriptors and the global options. The
 * pristine defaults are seeded here, so a binding is usable the moment it exists; a caller that
 * constructs a binding well before connecting it — as `withPersist` does, in the factory phase —
 * re-takes them with {@link captureDefaults} at connect time.
 */
export function createBinding(
	store: object,
	port: StorePort,
	fields: FieldDescriptor[],
	options: PersistOptions,
): PersistBinding {
	const state = port.getState(store)
	validateBinding(state, fields)

	const keyOf = new Map<FieldDescriptor, string>()
	const defaults = new Map<FieldDescriptor, unknown>()
	const records = new Map<FieldDescriptor, RecordState>()
	for (const field of fields) {
		keyOf.set(field, fieldKey(field))
		const value = readPath(state, field.path)
		const encoded = stringifyField(field, value)
		defaults.set(field, snapshotDefault(field, value, encoded))
		records.set(field, {
			revision: 0,
			acknowledged: 0,
			dirty: false,
			edited: false,
			blocked: false,
			observed: encoded,
			forceDelete: false,
			resetPending: false,
			outcome: 'default',
			error: null,
		})
	}

	return {
		store,
		port,
		fields,
		keyOf,
		defaults,
		clearOnDefault: options.clearOnDefault ?? true,
		throttleMs: options.throttleMs ?? 0,
		controller: null,
		records,
		status: { restore: 'pending', write: 'idle', dirty: false, writeBlocked: null, error: null },
		listeners: new Set(),
		restoreOptions: options.restore ?? {},
		started: false,
		seeded: false,
		seedError: null,
		seedReports: [],
		defaultsCaptured: false,
		restorePromise: null,
		cancelRestore: null,
		generation: 0,
	}
}

export function addressBinding(binding: PersistBinding, store: StoreId): void {
	const seen = new Set<string>()
	for (const field of binding.fields) {
		const path = field.key === undefined ? field.path : [...field.path.slice(0, -1), field.key]
		const address = { store, field: path }
		const key = serializePersistAddress(address)
		if (seen.has(key)) throw new Error(`[ez-kit/store-persist] Duplicate persisted field address: ${key}`)
		seen.add(key)
		if (binding.keyOf.get(field) === key) continue
		field.address = address
		binding.keyOf.set(field, key)
	}
}

/**
 * (Re-)record each field's current value as its pristine default — the baseline `clearOnDefault`
 * omits and {@link ApplyMode.Pull} resets an absent field back to. Call it once per binding, when the
 * binding connects, if construction happened earlier than that.
 */
export function captureDefaults(binding: PersistBinding): void {
	if (binding.defaultsCaptured) return
	const state = binding.port.getState(binding.store)
	const snapshots = binding.fields.map((field) => {
		const value = readPath(state, field.path)
		const encoded = stringifyField(field, value)
		return { field, encoded, snapshot: snapshotDefault(field, value, encoded) }
	})
	for (const { field, encoded, snapshot } of snapshots) {
		binding.defaults.set(field, snapshot)
		const record = binding.records.get(field)
		if (record) record.observed = encoded
	}
	binding.defaultsCaptured = true
}

/**
 * Current store values that should appear in the substrate, as a {@link Keyed} of logical key →
 * stringified value. With `clearOnDefault` (default), fields equal to their default are omitted;
 * a parser whose `stringify` returns `null` is also omitted.
 */
export function desiredKeyed(binding: PersistBinding): Keyed {
	const out: Keyed = new Map()
	const state = binding.port.getState(binding.store)
	for (const field of binding.fields) {
		const value = readPath(state, field.path)
		if (binding.clearOnDefault && fieldEquals(field, value, binding.defaults.get(field))) {
			continue
		}
		const encoded = stringifyField(field, value)
		if (encoded === null) {
			continue
		}
		const logicalKey = binding.keyOf.get(field)
		if (logicalKey === undefined) {
			// Unreachable — keyOf is populated for every field in createBinding. Guard, never fall back.
			continue
		}
		out.set(logicalKey, encoded)
	}
	return out
}

/**
 * Apply a substrate {@link Keyed} into the store. In {@link ApplyMode.Hydrate} a field is written
 * only when it still holds its default (so an earlier-connecting source wins, and absent keys are
 * left for another source). In {@link ApplyMode.Pull} the latest value wins and a field absent from
 * the substrate resets to its default.
 *
 * Every leaf that needs changing is collected first and handed to the port in ONE call: a hydration
 * that fills five fields is one state change, not five. Nothing is written when nothing changed.
 */
export function applyKeyed(binding: PersistBinding, keyed: Keyed, mode: ApplyMode): void {
	const state = binding.port.getState(binding.store)
	const writes: PathWrite[] = []

	for (const field of binding.fields) {
		// Skip fields whose parent vanished (defensive — validation guards the bind-time shape).
		if (parentOf(state, field.path) === undefined) {
			continue
		}
		const logicalKey = binding.keyOf.get(field)
		if (logicalKey === undefined) {
			// Unreachable — keyOf is populated for every field in createBinding. Guard, never fall back.
			continue
		}
		const present = keyed.has(logicalKey)
		const current = readPath(state, field.path)
		const defaultValue = binding.defaults.get(field)

		if (mode === ApplyMode.Hydrate && !fieldEquals(field, current, defaultValue)) {
			// First-present-wins: an earlier source already moved this field off its default.
			continue
		}

		let desired: unknown
		if (present) {
			try {
				desired = field.parser.parse(keyed.get(logicalKey) ?? '')
			} catch {
				// Invalid value — leave the field at its current value.
				continue
			}
		} else if (mode === ApplyMode.Pull) {
			desired = defaultValue
		} else {
			// Hydrate + absent: leave the field for another source to fill.
			continue
		}

		if (!fieldEquals(field, current, desired)) {
			writes.push({ path: field.path, value: desired })
		}
	}

	if (writes.length > 0) {
		binding.port.write(binding.store, writes)
	}
}
