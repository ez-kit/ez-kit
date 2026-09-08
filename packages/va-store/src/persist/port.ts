import { writePath } from '@ez-kit/store-core'
import { subscribe } from 'valtio'

import type { StorePort } from '@ez-kit/store-core'

/**
 * Valtio's side of the {@link StorePort} contract: the proxy IS the state, writes mutate the leaf in
 * place (so intermediate nodes — class instances, nested proxies — keep their identity, which is
 * what makes a tracked snapshot re-render only the components that read the changed leaf), and
 * change notification is `valtio`'s own `subscribe`.
 */
export const valtioPort: StorePort = {
	getState: (store) => store,
	write: (store, writes) => {
		for (const { path, value } of writes) {
			writePath(store, path, value)
		}
	},
	subscribe: (store, onChange) => subscribe(store, onChange),
}
