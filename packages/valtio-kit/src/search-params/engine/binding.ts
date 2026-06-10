import { flat } from '../layouts/flat'

import type {
	FieldsRecord,
	PersistedValues,
	SearchParamsHistory,
	SearchParamsLayout,
	SearchParamsOptions,
} from '../types'

/** Minimal engine capability the `$searchParams` control needs (avoids an import cycle). */
export type HistoryRunner = {
	runWithHistory(mode: SearchParamsHistory, mutate: () => void): void
}

/** A connected store: its proxy plus everything the engine needs to sync it. */
export type SyncBinding = {
	proxy: Record<string, unknown>
	fields: FieldsRecord
	fieldNames: string[]
	layout: SearchParamsLayout
	history: SearchParamsHistory
	throttleMs: number
	clearOnDefault: boolean
	/** Field defaults captured before any URL hydration (for clearOnDefault and reset-on-absent). */
	defaults: PersistedValues
	/** The engine currently syncing this binding, or `null` when no provider is mounted. */
	engine: HistoryRunner | null
}

/** Build a binding from a proxy, its options, and the pre-hydration default snapshot. */
export function createBinding<T extends object>(
	proxy: T,
	options: SearchParamsOptions<T>,
	defaults: PersistedValues,
): SyncBinding {
	const fields = options.fields as unknown as FieldsRecord
	const fieldNames = Object.keys(fields).filter((name) => fields[name])

	return {
		proxy: proxy as Record<string, unknown>,
		fields,
		fieldNames,
		layout: options.layout ?? flat(),
		history: options.history ?? 'replace',
		throttleMs: options.throttleMs ?? 0,
		clearOnDefault: options.clearOnDefault ?? true,
		defaults,
		engine: null,
	}
}

function fieldEquals(binding: SyncBinding, name: string, a: unknown, b: unknown): boolean {
	const codec = binding.fields[name]
	if (codec?.equals) {
		return codec.equals(a, b)
	}
	return Object.is(a, b)
}

/** Current proxy values that should appear in the URL (clearOnDefault drops default-valued fields). */
export function desiredValues(binding: SyncBinding): PersistedValues {
	const values: PersistedValues = {}
	for (const name of binding.fieldNames) {
		const value = binding.proxy[name]
		if (binding.clearOnDefault && fieldEquals(binding, name, value, binding.defaults[name])) {
			continue
		}
		values[name] = value
	}
	return values
}

/**
 * Apply URL params into the proxy (a pull). Fields present in the URL win; fields absent
 * from the URL reset to their default. Writes only when the value actually changes.
 */
export function applyParamsToProxy(binding: SyncBinding, params: URLSearchParams): void {
	const incoming = binding.layout.read(params, binding.fields)
	for (const name of binding.fieldNames) {
		const desired = name in incoming ? incoming[name] : binding.defaults[name]
		if (!fieldEquals(binding, name, binding.proxy[name], desired)) {
			binding.proxy[name] = desired
		}
	}
}
