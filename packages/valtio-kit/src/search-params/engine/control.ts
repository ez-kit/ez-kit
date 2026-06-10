import type { SearchParamsControl } from '../types'
import type { SyncBinding } from './binding'

/**
 * Build the `$searchParams` handle for a binding. History overrides route through the
 * connected engine; when no provider is mounted the mutation still runs (sync is inactive).
 */
export function createControl(binding: SyncBinding): SearchParamsControl {
	return {
		push: (mutate) => {
			if (binding.engine) {
				binding.engine.runWithHistory('push', mutate)
			} else {
				mutate()
			}
		},
		replace: (mutate) => {
			if (binding.engine) {
				binding.engine.runWithHistory('replace', mutate)
			} else {
				mutate()
			}
		},
	}
}
