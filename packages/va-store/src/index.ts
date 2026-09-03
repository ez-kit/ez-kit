'use client'

export { createContextStore } from './create-context-store'
export type {
	ContextStoreInit,
	CreateContextStoreFactory,
	CreateContextStoreOptions,
	CreateContextStoreResult,
	ItemRenderArg,
	UseSnapshotOptions,
} from './create-context-store'

export { createStore } from './create-store'
export type { CreateStoreOptions, CreateStoreResult, StoreFactory, StoreInit } from './create-store'

export { createStoreCache, CacheProvider, CacheScope, useCache, useCacheKeys, createCachedStore } from './store-cache'
export type {
	StoreCache,
	CachedStoreGroup,
	CachedItemProps,
	CachedItemRenderArg,
	CachedStoreItemProps,
} from './store-cache'

export { StoreProvider } from './store-provider'
export type { StoreProviderProps } from './store-provider'

export { shallowEqual } from '@ez-kit/store-core'
export type { ControlledConfig, ControlledFieldConfig } from '@ez-kit/store-core'

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
