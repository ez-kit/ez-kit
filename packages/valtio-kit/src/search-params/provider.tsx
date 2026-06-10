import { createContext, type ReactElement, type ReactNode, useContext, useEffect, useRef } from 'react'

import { createSyncEngine, type SyncEngine } from './engine/engine'
import { getRegisteredBindings, subscribeRegistry } from './engine/registry'

import type { SyncBinding } from './engine/binding'
import type { RouterAdapter } from './types'

const EngineContext = createContext<SyncEngine | null>(null)

/** Access the coordinator engine — used by `createSearchParamsStore` to connect its binding. */
export function useSearchParamsEngine(): SyncEngine | null {
	return useContext(EngineContext)
}

export type StoreSearchParamsProviderProps = {
	/** Router integration (e.g. `reactRouterAdapter`, `nextAdapter`). */
	adapter: RouterAdapter
	children: ReactNode
}

/**
 * Single app-level coordinator: the only reader and writer of the URL. Connects every
 * registered store, coalesces their changes into one navigation per tick, and pulls URL
 * changes back into all stores.
 */
export function StoreSearchParamsProvider({ adapter, children }: StoreSearchParamsProviderProps): ReactElement {
	const params = adapter.useSearchParams()
	const update = adapter.useUpdater()
	const search = params.toString()

	const adapterRef = useRef(adapter)
	adapterRef.current = adapter
	const paramsRef = useRef(params)
	paramsRef.current = params
	const updateRef = useRef(update)
	updateRef.current = update

	const engineRef = useRef<SyncEngine | null>(null)
	engineRef.current ??= createSyncEngine({
		getSnapshot: () => adapterRef.current.getSnapshot?.() ?? new URLSearchParams(paramsRef.current),
		updateSearchParams: (next, options) => {
			updateRef.current(next, options)
		},
	})

	useEffect(() => {
		const engine = engineRef.current
		if (!engine) {
			return
		}
		const connected = new Map<SyncBinding, () => void>()
		const sync = (): void => {
			for (const binding of getRegisteredBindings()) {
				if (!connected.has(binding)) {
					connected.set(binding, engine.connect(binding))
				}
			}
		}
		sync()
		const unsubscribe = subscribeRegistry(sync)
		return () => {
			unsubscribe()
			for (const disconnect of connected.values()) {
				disconnect()
			}
		}
	}, [])

	useEffect(() => {
		engineRef.current?.pull(new URLSearchParams(search))
	}, [search])

	return <EngineContext.Provider value={engineRef.current}>{children}</EngineContext.Provider>
}
