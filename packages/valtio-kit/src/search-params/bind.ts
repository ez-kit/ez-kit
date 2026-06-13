import { ref } from 'valtio'

import { createBinding } from './engine/binding'
import { createControl } from './engine/control'
import { registerBinding } from './engine/registry'

import type { FieldDescriptor, SearchParamsOptions, SearchParamsProxy } from './types'

/**
 * Attach search-params sync to an existing proxy: build the binding from resolved field
 * descriptors, expose the non-reactive `$searchParams` control, and auto-register with the
 * global coordinator. Shared by both the decorator and accessor fronts.
 */
export function bindSearchParams<T extends object>(
	store: T,
	fields: FieldDescriptor[],
	options: SearchParamsOptions,
): SearchParamsProxy<T> {
	const source = store as Record<string, unknown>
	const binding = createBinding(store, fields, options)
	const unsubscribe = registerBinding(binding)
	source.$searchParams = ref(createControl(binding, unsubscribe))
	return store as SearchParamsProxy<T>
}
