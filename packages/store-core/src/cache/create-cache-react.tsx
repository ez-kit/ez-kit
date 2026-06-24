import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type PropsWithChildren,
	type ReactElement,
	type ReactNode,
} from 'react'

import { useServices } from '../services-react'
import { serializeStoreId } from '../store-id'

import { toStoreId } from './cache-utils'
import { createInstanceCache, DEFAULT_GC_TIME, type InstanceCache } from './instance-cache'

import type { CacheAddress, CachedStoreOptions, CacheRecord, StoreCacheOptions } from './types'
import type { PluginContext } from '../plugin'
import type { StoreId } from '../store-id'

const IS_DEV = process.env.NODE_ENV !== 'production'
const EMPTY_SCOPE: readonly string[] = []
const EMPTY_RECORDS: readonly CacheRecord[] = []

export const MISSING_CACHE_PROVIDER = 'Missing cache Provider for createCacheReact'

/**
 * User-facing messages a consumer package can override so errors/warnings name its own public API
 * (e.g. `createStoreCache`) rather than the internal `createCacheReact`.
 */
export type CacheReactMessages = {
	/** Thrown when a cache hook/Provider is used with no enclosing cache `Provider`. */
	missingProvider?: string
	/** Dev-only warning when a second cache `Provider` mounts while another is active. Off when omitted. */
	multipleProviders?: string
}

/** The single store-manager-specific dependency: how to reactively read an instance via a selector. */
export type CacheReactOptions<TInstance extends object> = {
	useRead: <S>(instance: TInstance, selector: (snap: unknown) => S) => S
	messages?: CacheReactMessages
}

export type ScopeProps = PropsWithChildren<{
	/** Path segments contributed to descendants. Nested `Scope`s concatenate, outermost first. */
	path: string[]
}>

export type StoreCacheController = {
	keys: (prefix?: readonly string[]) => CacheRecord[]
	clear: (prefix?: readonly string[]) => void
}

type CachedProviderBaseProps = {
	id: string
	path?: string[]
	gcTime?: number
	alwaysCache?: boolean
}

/**
 * `defaultValue` is required when `TDefaultValue` has required fields, optional when it does not.
 * The conditional ensures consumers cannot silently omit a seed the factory relies on.
 */
export type CachedProviderProps<TDefaultValue extends object> = PropsWithChildren<
	CachedProviderBaseProps &
		(Record<string, never> extends TDefaultValue ? { defaultValue?: TDefaultValue } : { defaultValue: TDefaultValue })
>

export type CachedStoreFactoryInit<TDefaultValue extends object> = { defaultValue: TDefaultValue }

export type CachedStoreFactory<TInstance extends object, TDefaultValue extends object> = (
	init: CachedStoreFactoryInit<TDefaultValue>,
) => TInstance

export type CachedItemProps<TSelected> = {
	selector: (snap: unknown) => TSelected
	children: (state: TSelected) => ReactElement
}

/** Handle returned by `createCachedStore` — a group of keep-alive instances keyed by `(path, id)`. */
export type CachedStoreGroup<TInstance extends object, TDefaultValue extends object> = {
	Provider: (props: CachedProviderProps<TDefaultValue>) => ReactElement
	useStore: <TSelected>(selector: (snap: unknown) => TSelected) => TSelected
	Item: <TSelected>(props: CachedItemProps<TSelected>) => ReactElement
	/** Imperative get-if-alive at `(path, id)`. Returns the live instance or `undefined`. Never creates. */
	fromCache: (target: CacheAddress) => TInstance | undefined
	/** Reactive, passive cross-tree read at `(path, id)`. Snapshot is `undefined` when no live entry. */
	useFromCache: <TSelected>(target: CacheAddress, selector: (snap: unknown) => TSelected) => TSelected
	/** Remove this group's entry at `(path, id)` immediately. */
	remove: (target: CacheAddress) => void
}

export type CacheReact<TInstance extends object> = {
	Provider: (props: PropsWithChildren) => ReactElement
	Scope: (props: ScopeProps) => ReactElement
	useCache: () => StoreCacheController
	useCacheKeys: (prefix?: readonly string[]) => CacheRecord[]
	createCachedStore: <TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TInstance, TDefaultValue>,
		options: CachedStoreOptions<TInstance>,
	) => CachedStoreGroup<TInstance, TDefaultValue>
}

/** Mutable handle to the cache owned by the currently-mounted Provider (client-only). */
type ActiveCacheRef = { current: InstanceCache | null }

/** Birth-config cascade: `alwaysCache` wins, else Provider → store group → cache default. */
function resolveGcTime(
	alwaysCache: boolean | undefined,
	providerGcTime: number | undefined,
	groupGcTime: number | undefined,
	cacheGcTime: number,
): number {
	if (alwaysCache === true) return Infinity
	return providerGcTime ?? groupGcTime ?? cacheGcTime
}

/** Pure: `[...scope, ...providerPath]`, fast-paths to `scope` when no provider path is supplied. */
function resolvePath(scope: readonly string[], providerPath: readonly string[] | undefined): readonly string[] {
	if (!providerPath || providerPath.length === 0) return scope
	return [...scope, ...providerPath]
}

export function createCacheReact<TInstance extends object>(
	opts: CacheReactOptions<TInstance>,
	cacheOptions: StoreCacheOptions = {},
): CacheReact<TInstance> {
	const { useRead } = opts
	const missingProviderMessage = opts.messages?.missingProvider ?? MISSING_CACHE_PROVIDER
	const multipleProvidersMessage = opts.messages?.multipleProviders
	const cacheGcTime = cacheOptions.gcTime ?? DEFAULT_GC_TIME
	const CacheContext = createContext<InstanceCache | null>(null)
	const ScopeContext = createContext<readonly string[]>(EMPTY_SCOPE)
	const activeCache: ActiveCacheRef = { current: null }
	const registeredGroupNames = new Set<string>()

	function registerGroupName(name: string): void {
		if (!IS_DEV) return
		if (registeredGroupNames.has(name)) {
			console.warn(
				`[store-core] createCachedStore({ name: '${name}' }) was called more than once on the same cache. ` +
					'Give each group a unique name, or call createCachedStore once at module top-level.',
			)
		}
		registeredGroupNames.add(name)
	}

	function Provider({ children }: PropsWithChildren): ReactElement {
		const cacheRef = useRef<InstanceCache | null>(null)
		cacheRef.current ??= createInstanceCache({ defaultGcTime: cacheGcTime })
		const cache = cacheRef.current

		useEffect(() => {
			// Imperative access (fromCache/remove) is client-only; the cache never becomes "active" on the server.
			if (typeof window === 'undefined') return
			if (IS_DEV && multipleProvidersMessage && activeCache.current !== null && activeCache.current !== cache) {
				console.warn(multipleProvidersMessage)
			}
			activeCache.current = cache
			return () => {
				if (activeCache.current === cache) activeCache.current = null
			}
		}, [cache])

		return <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>
	}

	function Scope({ path, children }: ScopeProps): ReactElement {
		const inherited = useContext(ScopeContext)
		const pathKey = JSON.stringify(path)
		const value = useMemo(
			() => [...inherited, ...path],
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[inherited, pathKey],
		)
		return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
	}

	function useMembershipSignature(): string {
		const cache = useContext(CacheContext)
		const subscribe = cache ? cache.subscribe : noopSubscribe
		const getSnapshot = cache ? cache.getKeysSnapshot : getEmptyRecords
		const records = useSyncExternalStore(subscribe, getSnapshot, getEmptyRecords)
		return records.map(serializeStoreId).join('|')
	}

	function useCacheKeys(prefix?: readonly string[]): CacheRecord[] {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(missingProviderMessage)
		const signature = useMembershipSignature()
		const prefixKey = prefix ? JSON.stringify(prefix) : ''
		return useMemo<CacheRecord[]>(
			() => cache.keys(prefix),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[cache, signature, prefixKey],
		)
	}

	function useCache(): StoreCacheController {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(missingProviderMessage)
		return { keys: cache.keys, clear: cache.clear }
	}

	function createCachedStore<TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TInstance, TDefaultValue>,
		options: CachedStoreOptions<TInstance>,
	): CachedStoreGroup<TInstance, TDefaultValue> {
		const { name } = options
		registerGroupName(name)
		const groupGcTime = options.gcTime
		const plugins = options.plugins ?? []

		const StoreContext = createContext<TInstance | null>(null)
		const MISSING_GROUP_PROVIDER = `Missing <${name}.Provider>`

		function useGroupInstance(): TInstance {
			const instance = useContext(StoreContext)
			if (!instance) throw new Error(MISSING_GROUP_PROVIDER)
			return instance
		}

		function useStore<TSelected>(selector: (snap: unknown) => TSelected): TSelected {
			return useRead(useGroupInstance(), selector)
		}

		function Item<TSelected>({ selector, children }: CachedItemProps<TSelected>): ReactElement {
			return children(useStore(selector))
		}

		type ProviderInnerProps = {
			storeId: StoreId
			defaultValue: TDefaultValue
			gcTime: number
			services: PluginContext['services']
			children: ReactNode
		}

		function ProviderInner({ storeId, defaultValue, gcTime, services, children }: ProviderInnerProps): ReactElement {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderMessage)

			// Lazy: resolve the instance once per fresh mount. On the server there is no shared cache —
			// build an ephemeral instance per render and skip plugin/observer wiring.
			const [instance] = useState<TInstance>(() => {
				if (typeof window === 'undefined') return factory({ defaultValue })
				const context: PluginContext = { services, id: storeId, isServer: false }
				return cache.getOrCreate(storeId, () => factory({ defaultValue }), { gcTime, plugins, context })
			})

			useEffect(() => {
				cache.addObserver(storeId)
				return () => {
					cache.removeObserver(storeId)
				}
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [cache])

			return <StoreContext.Provider value={instance}>{children}</StoreContext.Provider>
		}

		function Provider(props: CachedProviderProps<TDefaultValue>): ReactElement {
			const { id, path, gcTime, alwaysCache, children } = props
			const providedDefaults = (props as { defaultValue?: TDefaultValue }).defaultValue
			const inheritedScope = useContext(ScopeContext)
			const services = useServices()
			const resolvedPath = resolvePath(inheritedScope, path)
			const resolvedGcTime = resolveGcTime(alwaysCache, gcTime, groupGcTime, cacheGcTime)
			const seedDefaultValue: TDefaultValue = providedDefaults ?? ({} as TDefaultValue)
			const storeId: StoreId = { path: resolvedPath, name, id }
			const remountKey = serializeStoreId(storeId)
			return (
				<ProviderInner
					key={remountKey}
					storeId={storeId}
					defaultValue={seedDefaultValue}
					gcTime={resolvedGcTime}
					services={services}
				>
					{children}
				</ProviderInner>
			)
		}

		function fromCache(target: CacheAddress): TInstance | undefined {
			return activeCache.current?.getInstance(toStoreId(target, name)) as TInstance | undefined
		}

		function useFromCache<TSelected>(target: CacheAddress, selector: (snap: unknown) => TSelected): TSelected {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderMessage)
			const storeId = toStoreId(target, name)
			const signature = useMembershipSignature()
			const live = useMemo(
				() => cache.getInstance(storeId) as TInstance | undefined,
				// eslint-disable-next-line react-hooks/exhaustive-deps
				[cache, signature, serializeStoreId(storeId)],
			)
			// Subscribe to a stable empty placeholder when there is no live entry; the selector ignores its
			// snapshot (passes `undefined`), so the placeholder's shape is never read.
			const subscribed = live ?? (fallbackInstance as TInstance)
			return useRead(subscribed, (snap) => selector(live ? snap : undefined))
		}

		function remove(target: CacheAddress): void {
			activeCache.current?.remove(toStoreId(target, name))
		}

		return { Provider, useStore, Item, fromCache, useFromCache, remove }
	}

	return { Provider, Scope, useCache, useCacheKeys, createCachedStore }
}

const fallbackInstance: object = {}

function noopSubscribe(): () => void {
	return () => {}
}

function getEmptyRecords(): readonly CacheRecord[] {
	return EMPTY_RECORDS
}
