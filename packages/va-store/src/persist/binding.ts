import { fieldKey } from './key-naming'
import { parentOf, readPath, writePath } from './path'
import { validateBinding } from './validate'

import type { FieldDescriptor, Keyed, PersistOptions } from './types'

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

/** A connected store: its proxy plus everything the engine needs to sync it to one source. */
export type PersistBinding = {
	proxy: object
	fields: FieldDescriptor[]
	/** Stable logical key per field (path/`key`/`absolute`; substrate prefix is an adapter concern). */
	keyOf: Map<FieldDescriptor, string>
	/** Field defaults captured before any hydration (for clearOnDefault and reset-on-absent). */
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

/** Build a binding from a proxy, its resolved field descriptors, and the global options. */
export function createBinding(proxy: object, fields: FieldDescriptor[], options: PersistOptions): PersistBinding {
	validateBinding(proxy, fields)

	const keyOf = new Map<FieldDescriptor, string>()
	const defaults = new Map<FieldDescriptor, unknown>()
	for (const field of fields) {
		keyOf.set(field, fieldKey(field))
		defaults.set(field, readPath(proxy, field.path))
	}

	return {
		proxy,
		fields,
		keyOf,
		defaults,
		clearOnDefault: options.clearOnDefault ?? true,
		throttleMs: options.throttleMs ?? 0,
		controller: null,
	}
}

/**
 * Current proxy values that should appear in the substrate, as a {@link Keyed} of logical key →
 * stringified value. With `clearOnDefault` (default), fields equal to their default are omitted;
 * a parser whose `stringify` returns `null` is also omitted.
 */
export function desiredKeyed(binding: PersistBinding): Keyed {
	const out: Keyed = new Map()
	for (const field of binding.fields) {
		const value = readPath(binding.proxy, field.path)
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
 * Apply a substrate {@link Keyed} into the proxy. In {@link ApplyMode.Hydrate} a field is written
 * only when it still holds its default (so an earlier-connecting source wins, and absent keys are
 * left for another source). In {@link ApplyMode.Pull} the latest value wins and a field absent from
 * the substrate resets to its default. Only the leaf is assigned — intermediate nodes keep identity.
 */
export function applyKeyed(binding: PersistBinding, keyed: Keyed, mode: ApplyMode): void {
	for (const field of binding.fields) {
		// Skip fields whose parent vanished (defensive — validation guards the bind-time shape).
		if (parentOf(binding.proxy, field.path) === undefined) {
			continue
		}
		const logicalKey = binding.keyOf.get(field)
		if (logicalKey === undefined) {
			// Unreachable — keyOf is populated for every field in createBinding. Guard, never fall back.
			continue
		}
		const present = keyed.has(logicalKey)
		const current = readPath(binding.proxy, field.path)
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
			writePath(binding.proxy, field.path, desired)
		}
	}
}
