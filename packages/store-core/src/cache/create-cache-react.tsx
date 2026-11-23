import {
	createContext,
	useContext,
	useEffect,
	useInsertionEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type PropsWithChildren,
	type ReactElement,
	type ReactNode,
} from 'react'

import { capabilitiesOf } from '../capability'
import { PACKAGE_TAG } from '../package-tag'
import { useServices } from '../react'
import { serializeStoreId } from '../store-id'

import { toStoreId } from './cache-utils'
import { createInstanceCache, DEFAULT_GC_TIME, type InstanceCache } from './instance-cache'

import type { CacheAddress, CachedStoreOptions, CacheRecord, StoreCacheOptions } from './types'
import type { PluginContext } from '../plugin'
import type { StoreId } from '../store-id'

const IS_DEV = process.env.NODE_ENV !== 'production'
const EMPTY_SCOPE: readonly string[] = []
const EMPTY_RECORDS: readonly CacheRecord[] = []
const EMPTY_DEFAULTS = Object.freeze({})

/** Default `useFromCache` placeholder, for managers whose read hook accepts any object. */
const EMPTY_FALLBACK: object = {}

export const MISSING_CACHE_PROVIDER = `${PACKAGE_TAG} Missing cache Provider for createCacheReact`

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
	/**
	 * Stable placeholder that `useFromCache` subscribes to when no live entry exists at the target. Its
	 * state is never read — the selector receives `undefined` — but `useRead` still runs against it, so
	 * managers whose read hook requires a real instance (e.g. Zustand's `useStore` calls `getState`)
	 * must supply one. Defaults to a plain empty object.
	 */
	fallbackInstance?: TInstance
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

export type CachedSubscribeProps<TSelected> = {
	selector: (snap: unknown) => TSelected
	children: (state: TSelected) => ReactElement
}

/** Handle returned by `createCachedStore` — a group of keep-alive instances keyed by `(path, id)`. */
export type CachedStoreGroup<TInstance extends object, TDefaultValue extends object> = {
	Provider: (props: CachedProviderProps<TDefaultValue>) => ReactElement
	/** Reactive read: runs `selector` over the manager's snapshot of the group instance. */
	useSelector: <TSelected>(selector: (snap: unknown) => TSelected) => TSelected
	/**
	 * The raw group instance, read straight from context. Unlike {@link CachedStoreGroup.useSelector}
	 * it never goes through `useRead`, so it registers no subscription at all and a state change alone
	 * can never re-render the caller.
	 */
	useInstance: () => TInstance
	Subscribe: <TSelected>(props: CachedSubscribeProps<TSelected>) => ReactElement
	/** Imperative get-if-alive at `(path, id)`. Returns the live instance or `undefined`. Never creates. */
	getFromCache: (target: CacheAddress) => TInstance | undefined
	/** Reactive, passive cross-tree read at `(path, id)`. Snapshot is `undefined` when no live entry. */
	useFromCache: <TSelected>(target: CacheAddress, selector: (snap: unknown) => TSelected) => TSelected
	/** Remove an idle entry immediately, or release it after its last Provider leaves. */
	remove: (target: CacheAddress) => void
}

export type CacheReact<TInstance extends object> = {
	Provider: (props: PropsWithChildren) => ReactElement
	Scope: (props: ScopeProps) => ReactElement
	useCache: () => StoreCacheController
	useCacheKeys: (prefix?: readonly string[]) => CacheRecord[]
	createCachedStore: <TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TInstance, TDefaultValue>,
		options: CachedStoreOptions,
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
	const fallbackInstance = opts.fallbackInstance ?? (EMPTY_FALLBACK as TInstance)
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
				`${PACKAGE_TAG} createCachedStore({ name: '${name}' }) was called more than once on the same cache. ` +
					'Give each group a unique name, or call createCachedStore once at module top-level.',
			)
		}
		registeredGroupNames.add(name)
	}

	function Provider({ children }: PropsWithChildren): ReactElement {
		const cacheRef = useRef<InstanceCache | null>(null)
		cacheRef.current ??= createInstanceCache({ defaultGcTime: cacheGcTime })
		const cache = cacheRef.current
		const ended = useRef(false)
		// Insertion effects identify a genuine container removal without replaying during
		// StrictMode's synthetic effect disconnect. Cleanup/I/O stays in the passive phase.
		useInsertionEffect(
			() => () => {
				ended.current = true
			},
			[],
		)

		useEffect(() => {
			// Imperative access (getFromCache/remove) is client-only; the cache never becomes "active" on the server.
			if (typeof window === 'undefined') return
			if (IS_DEV && multipleProvidersMessage && activeCache.current !== null && activeCache.current !== cache) {
				console.warn(multipleProvidersMessage)
			}
			activeCache.current = cache
			return () => {
				if (activeCache.current === cache) activeCache.current = null
				if (ended.current) cache.dispose()
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
		options: CachedStoreOptions,
	): CachedStoreGroup<TInstance, TDefaultValue> {
		const { name } = options
		registerGroupName(name)
		const groupGcTime = options.gcTime

		const StoreContext = createContext<TInstance | null>(null)
		const MISSING_GROUP_PROVIDER = `${PACKAGE_TAG} Missing <${name}.Provider>`

		type RenderCandidate = {
			instance: TInstance
			defaultValue: TDefaultValue
			services: PluginContext['services']
		}
		type CandidateReferences = Map<string, Set<WeakRef<RenderCandidate>>>
		const candidatesByCache = new WeakMap<InstanceCache, CandidateReferences>()
		const committingByCache = new WeakMap<InstanceCache, Map<string, { instance: TInstance; owners: number }>>()
		const abandonedCandidates = new FinalizationRegistry<{
			candidates: CandidateReferences
			key: string
			reference: WeakRef<RenderCandidate>
		}>(({ candidates, key, reference }) => {
			const entries = candidates.get(key)
			entries?.delete(reference)
			if (entries?.size === 0) candidates.delete(key)
		})

		function useGroupInstance(): TInstance {
			const instance = useContext(StoreContext)
			if (!instance) throw new Error(MISSING_GROUP_PROVIDER)
			return instance
		}

		function useSelector<TSelected>(selector: (snap: unknown) => TSelected): TSelected {
			return useRead(useGroupInstance(), selector)
		}

		function Subscribe<TSelected>({ selector, children }: CachedSubscribeProps<TSelected>): ReactElement {
			return children(useSelector(selector))
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
			const key = serializeStoreId(storeId)
			const [candidate] = useState<RenderCandidate>(() => {
				if (typeof window === 'undefined') {
					const ephemeral = factory({ defaultValue })
					for (const plugin of capabilitiesOf(ephemeral))
						plugin.seedRender?.(ephemeral, { services, id: storeId, isServer: true })
					return { instance: ephemeral, defaultValue, services }
				}
				let candidates = candidatesByCache.get(cache)
				if (!candidates) {
					candidates = new Map()
					candidatesByCache.set(cache, candidates)
				}
				let references = candidates.get(key)
				if (!references) {
					references = new Set()
					candidates.set(key, references)
				}
				let shared: RenderCandidate | undefined
				for (const reference of references) {
					const value = reference.deref()
					if (!value) references.delete(reference)
					else if (value.defaultValue === defaultValue && value.services === services) shared = value
				}
				const context: PluginContext = { services, id: storeId, isServer: false }
				const instance = cache.getOrCreate(storeId, () => shared?.instance ?? factory({ defaultValue }), {
					gcTime,
					context,
					deferSetup: true,
				})
				for (const plugin of capabilitiesOf(instance)) plugin.seedRender?.(instance, context)
				const candidate = shared?.instance === instance ? shared : { instance, defaultValue, services }
				if (shared?.instance !== instance) {
					const reference = new WeakRef(candidate)
					references.add(reference)
					abandonedCandidates.register(candidate, { candidates, key, reference }, candidate)
				}
				return candidate
			})
			// A concurrent sibling may commit this address before our candidate does. Subscribe to
			// committed membership so every owner converges on the same canonical instance.
			const instance = useSyncExternalStore(
				cache.subscribe,
				() => (cache.getInstance(storeId) as TInstance | undefined) ?? candidate.instance,
				() => candidate.instance,
			)
			const context: PluginContext = { services, id: storeId, isServer: typeof window === 'undefined' }
			for (const plugin of capabilitiesOf(instance)) plugin.validateContext?.(instance, context)

			// Compatible cold owners already share their render candidate. This commit-only check
			// diagnoses conflicting initialization without setup, subscriptions or React notifications.
			useInsertionEffect(() => {
				let committing = committingByCache.get(cache)
				if (!committing) {
					committing = new Map()
					committingByCache.set(cache, committing)
				}
				const existing = committing.get(key)
				if (existing && existing.instance !== instance)
					throw new Error(`${PACKAGE_TAG} Concurrent <${name}.Provider> owners must share defaultValue and services`)
				const owner = existing ?? { instance, owners: 0 }
				owner.owners += 1
				committing.set(key, owner)
				candidatesByCache.get(cache)?.delete(key)
				abandonedCandidates.unregister(candidate)
				return () => {
					owner.owners -= 1
					if (owner.owners === 0 && committing.get(key) === owner) committing.delete(key)
				}
			}, [cache, candidate, instance, key])

			useEffect(() => {
				const observed = cache.addObserver(storeId, { instance, gcTime, context })
				return () => {
					cache.removeObserver(storeId, observed)
				}
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [cache, instance])

			return <StoreContext.Provider value={instance}>{children}</StoreContext.Provider>
		}

		function Provider(props: CachedProviderProps<TDefaultValue>): ReactElement {
			const { id, path, gcTime, alwaysCache, children } = props
			const providedDefaults = (props as { defaultValue?: TDefaultValue }).defaultValue
			const inheritedScope = useContext(ScopeContext)
			const services = useServices()
			const resolvedPath = resolvePath(inheritedScope, path)
			const resolvedGcTime = resolveGcTime(alwaysCache, gcTime, groupGcTime, cacheGcTime)
			const seedDefaultValue: TDefaultValue = providedDefaults ?? (EMPTY_DEFAULTS as TDefaultValue)
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

		function getFromCache(target: CacheAddress): TInstance | undefined {
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
			const subscribed = live ?? fallbackInstance
			return useRead(subscribed, (snap) => selector(live ? snap : undefined))
		}

		function remove(target: CacheAddress): void {
			activeCache.current?.remove(toStoreId(target, name))
		}

		return { Provider, useSelector, useInstance: useGroupInstance, Subscribe, getFromCache, useFromCache, remove }
	}

	return { Provider, Scope, useCache, useCacheKeys, createCachedStore }
}

function noopSubscribe(): () => void {
	return () => {}
}

function getEmptyRecords(): readonly CacheRecord[] {
	return EMPTY_RECORDS
}
