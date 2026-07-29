export { createContextStore } from './create-context-store'
export type {
	ContextStoreInit,
	CreateContextStoreFactory,
	CreateContextStoreOptions,
	CreateContextStoreResult,
} from './create-context-store'

export { useStoreState } from './use-store-state'

export { withHistory } from './middlewares'
export type { HistoryActionTag, HistoryOptions, HistoryState } from './middlewares'

export { createStoreCache, CacheProvider, CacheScope, useCache, useCacheKeys, createCachedStore } from './store-cache'
export type { StoreCache, CachedStoreGroup, CachedItemProps } from './store-cache'

export { toTree } from '@ez-kit/store-core/cache'
export type {
	CacheAddress,
	CachedProviderProps,
	CachedStoreFactory,
	CachedStoreOptions,
	CacheRecord,
	CacheTree,
	ScopeProps,
	StoreCacheController,
	StoreCacheOptions,
} from '@ez-kit/store-core/cache'
