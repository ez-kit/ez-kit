import type { SyncBinding } from './binding'

/**
 * Module-global registry of bindings created by `withSearchParams` / `withSearchParamsFields`.
 * The single coordinator drains this and listens for late (code-split) additions.
 *
 * NOTE: module-global state is shared across SSR requests — `withSearchParams` /
 * `withSearchParamsFields` are for module/singleton scope only. Request-scoped, SSR-correct
 * syncing uses `createSearchParamsStore` / `createFieldsStore` instead.
 */
const registeredBindings = new Set<SyncBinding>()
const listeners = new Set<() => void>()

export function registerBinding(binding: SyncBinding): () => void {
	registeredBindings.add(binding)
	for (const listener of listeners) {
		listener()
	}
	return () => {
		registeredBindings.delete(binding)
		for (const listener of listeners) {
			listener()
		}
	}
}

export function getRegisteredBindings(): SyncBinding[] {
	return [...registeredBindings]
}

export function subscribeRegistry(listener: () => void): () => void {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

/** Test-only: clear the global registry between cases. Not part of the public API. */
export function clearRegistry(): void {
	registeredBindings.clear()
}
