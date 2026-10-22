import { createContext, useContext, useState } from 'react'

import { createItemsSourceStore } from './store'

import type { ItemsSourceStore } from './store'
import type { ReactNode } from 'react'

const ItemsSourceStoreContext = createContext<ItemsSourceStore | null>(null)

/** Mounts one {@link ItemsSourceStore} for the grid below it — one per grid instance. */
export function ItemsSourceProvider({ children }: { children: ReactNode }) {
	const [store] = useState(createItemsSourceStore)
	return <ItemsSourceStoreContext.Provider value={store}>{children}</ItemsSourceStoreContext.Provider>
}

/**
 * The grid's source store, or `null` outside a grid — a control rendered on its own (a kit's unit
 * test) reads its hook lists as pending and runs nothing.
 */
export function useItemsSourceStore(): ItemsSourceStore | null {
	return useContext(ItemsSourceStoreContext)
}
