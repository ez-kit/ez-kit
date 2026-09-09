import { parentOf, readPath } from '@ez-kit/store-core'

import { fieldKey } from './key-naming'
import { validateBinding } from './validate'

import type { FieldDescriptor, Keyed, PersistOptions } from './types'
import type { PathWrite, StorePort } from '@ez-kit/store-core'

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
}

function fieldEquals(field: FieldDescriptor, a: unknown, b: unknown): boolean {
	return field.parser.equals ? field.parser.equals(a, b) : Object.is(a, b)
}

function stringifyField(field: FieldDescriptor, value: unknown): string | null {
	return field.parser.stringify ? field.parser.stringify(value) : String(value)
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
	for (const field of fields) {
		keyOf.set(field, fieldKey(field))
		defaults.set(field, readPath(state, field.path))
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
	}
}

/**
 * (Re-)record each field's current value as its pristine default — the baseline `clearOnDefault`
 * omits and {@link ApplyMode.Pull} resets an absent field back to. Call it once per binding, when the
 * binding connects, if construction happened earlier than that.
 */
export function captureDefaults(binding: PersistBinding): void {
	const state = binding.port.getState(binding.store)
	for (const field of binding.fields) {
		binding.defaults.set(field, readPath(state, field.path))
	}
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
