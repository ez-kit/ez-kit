import { proxy, ref } from 'valtio'

import { createBinding } from './engine/binding'
import { createControl } from './engine/control'
import { registerBinding } from './engine/registry'

import type { PersistedValues, SearchParamsOptions, SearchParamsProxy } from './types'

/**
 * Create a Valtio proxy whose listed fields mirror the URL search params. Returns a normal
 * proxy (mutate it directly) plus a non-reactive `$searchParams` control. Auto-registers
 * with the global coordinator — module/singleton scope, client-first (see SSR note in docs).
 */
export function proxyWithSearchParams<T extends object>(
	initial: T,
	options: SearchParamsOptions<T>,
): SearchParamsProxy<T> {
	const store = proxy(initial)
	const source = store as Record<string, unknown>

	// Capture defaults before registration/hydration so clearOnDefault has a reference point.
	const defaults: PersistedValues = {}
	for (const name of Object.keys(options.fields)) {
		defaults[name] = source[name]
	}

	const binding = createBinding(store, options, defaults)
	source.$searchParams = ref(createControl(binding))
	registerBinding(binding)

	return store as SearchParamsProxy<T>
}
