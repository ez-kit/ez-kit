import type { PersistBinding } from './binding'

/**
 * A registry of bindings for one source. Each source (url, localStorage, …) owns its own registry
 * so a single coordinator can drain it and listen for late (code-split) additions. Unlike the prior
 * module-global singleton, registries are created per source, which is what lets a field sync to
 * several sources independently.
 */
export type BindingRegistry = {
	register(binding: PersistBinding): () => void
	getAll(): PersistBinding[]
	subscribe(listener: () => void): () => void
	/** Test-only: clear all registered bindings. */
	clear(): void
}

export function createRegistry(): BindingRegistry {
	const bindings = new Set<PersistBinding>()
	const listeners = new Set<() => void>()

	function notify(): void {
		for (const listener of listeners) {
			listener()
		}
	}

	return {
		register(binding) {
			bindings.add(binding)
			notify()
			return () => {
				bindings.delete(binding)
				notify()
			}
		},
		getAll() {
			return [...bindings]
		},
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		clear() {
			bindings.clear()
		},
	}
}
