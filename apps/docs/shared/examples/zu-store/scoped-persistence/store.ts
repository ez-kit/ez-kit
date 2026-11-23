import { createStoreCache, pipe } from '@ez-kit/zu-store'
import { withPersist } from '@ez-kit/zu-store/persist'
import { createStore } from 'zustand/vanilla'

export const cache = createStoreCache()
export const scope = ['scoped-demo']

function createPanel(source: 'browser' | 'server') {
	return pipe(
		createStore(() => ({ width: 320 })),
		withPersist({ restore: { timeoutMs: 2000 }, fields: (field) => [field((state) => state.width, { source })] }),
	)
}

export const browserPanel = cache.createCachedStore(() => createPanel('browser'), { name: 'browser-panel' })
export const serverPanel = cache.createCachedStore(() => createPanel('server'), { name: 'server-panel' })
