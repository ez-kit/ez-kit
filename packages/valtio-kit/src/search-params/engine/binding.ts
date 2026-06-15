import { flat } from '../layouts/flat'
import { SearchParamsHistory } from '../types'

import { parentOf, readPath, writePath } from './path'
import { validateBinding } from './validate'

import type { FieldDescriptor, FieldValues, SearchParamsLayout, SearchParamsOptions } from '../types'

/** Minimal engine capability the `$searchParams` control needs (avoids an import cycle). */
export type HistoryRunner = {
	runWithHistory(mode: SearchParamsHistory, mutate: () => void): void
}

/** A connected store: its proxy plus everything the engine needs to sync it. */
export type SyncBinding = {
	proxy: object
	fields: FieldDescriptor[]
	layout: SearchParamsLayout
	history: SearchParamsHistory
	throttleMs: number
	clearOnDefault: boolean
	/** Field defaults captured before any URL hydration (for clearOnDefault and reset-on-absent). */
	defaults: Map<FieldDescriptor, unknown>
	/** The engine currently syncing this binding, or `null` when no provider is mounted. */
	engine: HistoryRunner | null
}

/** Build a binding from a proxy, its resolved field descriptors, and the global options. */
export function createBinding(proxy: object, fields: FieldDescriptor[], options: SearchParamsOptions): SyncBinding {
	validateBinding(proxy, fields)

	const layout = options.layout ?? flat()
	if (layout.ignoresAbsolute && fields.some((field) => field.absolute)) {
		console.warn(
			`[valtio-kit] search-params: \`absolute\` is only honoured by the flat layout; ignoring it under this layout.`,
		)
	}

	const defaults = new Map<FieldDescriptor, unknown>()
	for (const field of fields) {
		defaults.set(field, readPath(proxy, field.path))
	}

	return {
		proxy,
		fields,
		layout,
		history: options.history ?? SearchParamsHistory.Replace,
		throttleMs: options.throttleMs ?? 0,
		clearOnDefault: options.clearOnDefault ?? true,
		defaults,
		engine: null,
	}
}

function fieldEquals(field: FieldDescriptor, a: unknown, b: unknown): boolean {
	return field.parser.equals ? field.parser.equals(a, b) : Object.is(a, b)
}

/** Current proxy values that should appear in the URL (clearOnDefault drops default-valued fields). */
export function desiredValues(binding: SyncBinding): FieldValues {
	const values: FieldValues = new Map()
	for (const field of binding.fields) {
		const value = readPath(binding.proxy, field.path)
		if (binding.clearOnDefault && fieldEquals(field, value, binding.defaults.get(field))) {
			continue
		}
		values.set(field, value)
	}
	return values
}

/**
 * Apply URL params into the proxy (a pull). Fields present in the URL win; fields absent
 * from the URL reset to their default. Only the leaf is assigned — intermediate nodes keep
 * their identity (rule C). Writes only when the value actually changes.
 */
export function applyParamsToProxy(binding: SyncBinding, params: URLSearchParams): void {
	const incoming = binding.layout.read(params, binding.fields)
	for (const field of binding.fields) {
		// Skip fields whose parent vanished (defensive — validation guards the bind-time shape).
		if (parentOf(binding.proxy, field.path) === undefined) {
			continue
		}
		const desired = incoming.has(field) ? incoming.get(field) : binding.defaults.get(field)
		const current = readPath(binding.proxy, field.path)
		if (!fieldEquals(field, current, desired)) {
			writePath(binding.proxy, field.path, desired)
		}
	}
}
