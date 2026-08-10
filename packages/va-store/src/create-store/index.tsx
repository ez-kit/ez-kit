import { getChangedControlledEntries, pickControlledKeys } from '@ez-kit/store-core'
import { useServices } from '@ez-kit/store-core/react'
import {
	createContext,
	type PropsWithChildren,
	type ReactElement,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
} from 'react'
import { snapshot, subscribe as subscribeValtio, useSnapshot as useValtioSnapshot, type Snapshot } from 'valtio'

import type { ControlledConfig, PluginCleanup, PluginContext, StoreId, StorePlugin } from '@ez-kit/store-core'

/** Names the store in the error, so `createStore(f, { name: 'filters' })` reports `filters`. */
const missingProviderError = (name: string): string => `Missing Provider for ${name}`

/** Synthetic id for a non-cached, singleton store. There is one entry per Provider, hence a fixed `id`. */
const SINGLETON_ID = 'singleton'
const DEFAULT_STORE_NAME = 'store'
const EMPTY_PATH: readonly string[] = []
const IS_SERVER = typeof window === 'undefined'

/** Seed envelope passed to a store factory. */
export type StoreInit<TDefaultValue> = {
	defaultValue: TDefaultValue
}

export type StoreFactory<TState extends object, TDefaultValue> = (init: StoreInit<TDefaultValue>) => TState

export type UseSnapshotOptions = {
	sync?: boolean
}

export type CreateStoreOptions<TState extends object> = {
	/** Group name used to synthesize this store's `StoreId`. Defaults to a stable `'store'`. */
	name?: string
	/** Plugins bound to the Provider's mount: `setup` runs on mount, its cleanup on unmount. */
	plugins?: readonly StorePlugin<TState>[]
	/** Per-key overrides for fields controlled via the Provider's `value` prop. */
	controlled?: ControlledConfig<TState>
}

/**
 * `defaultValue` is required when the seed has required fields, optional when it doesn't. `value`
 * and `onValueChange` are always optional — the keys present in `value` are the controlled ones.
 */
type ProviderProps<TDefaultValue, TState extends object> = (undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }) & {
	value?: Partial<TState>
	onValueChange?: (value: Partial<TState>) => void
}

/** Render-prop argument for `Item`: `snap` for reads, `store` (raw proxy, as from `useStore()`) for writes. */
export type ItemRenderArg<TState extends object> = {
	snap: Snapshot<TState>
	store: TState
}

type ItemProps<TState extends object> = {
	children: (arg: ItemRenderArg<TState>) => ReactElement
}

type StoreItemProps<TState extends object> = {
	children: (store: TState) => ReactElement
}

export type CreateStoreResult<TState extends object, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue, TState>>) => ReactElement
	/** Reactive read: the readonly, auto-tracked snapshot. Forwards Valtio's `useSnapshot` options. */
	useSnapshot: (options?: UseSnapshotOptions) => Snapshot<TState>
	/**
	 * Write path / escape hatch: the raw, mutable Valtio proxy. Mutate it directly (e.g. `state.count++`).
	 * It does **not** subscribe the calling component — pair it with `useSnapshot()` to render.
	 */
	useStore: () => TState
	/** Reading slot: subscribes through `useSnapshot()`, so tracked mutations re-render its children. */
	Item: (props: ItemProps<TState>) => ReactElement
	/**
	 * Write-only slot: hands the raw proxy from `useStore()` to its children without subscribing, so
	 * store mutations never re-render them. It is **not** memoised — it still renders whenever its
	 * parent does.
	 */
	StoreItem: (props: StoreItemProps<TState>) => ReactElement
}

function getStoreFromContext<TState extends object>(store: TState | null, name: string): TState {
	if (!store) throw new Error(missingProviderError(name))
	return store
}

/**
 * Writes `changed` into the proxy: `controlled[key].set` when declared, otherwise a batched
 * `Object.assign`. `Object.assign` on a Valtio proxy invokes class accessor setters and wraps a
 * replaced nested object/array in its own proxy — a manual per-key assignment loop would not.
 */
function applyControlledEntries<TState extends object>(
	store: TState,
	changed: Partial<TState>,
	controlled: ControlledConfig<TState>,
): void {
	const direct: Partial<TState> = {}

	for (const key of Object.keys(changed) as (keyof TState)[]) {
		const value = changed[key] as TState[typeof key]
		const set = controlled[key]?.set

		if (set) {
			set(store, value)
		} else {
			direct[key] = value
		}
	}

	if (Object.keys(direct).length > 0) {
		Object.assign(store, direct)
	}
}

/**
 * Plugin-capable base store factory. Creates the Valtio proxy once per Provider via `useRef`. When
 * `plugins` are declared, each plugin's `setup(proxy, ctx)` runs once on mount and its returned
 * `PluginCleanup` runs on unmount. `ctx.services` resolves app-level services published by an
 * ancestor `ServicesProvider`/`StoreProvider`. `createContextStore` is this factory with no plugins.
 *
 * Reads go through `useSnapshot()`, which returns the auto-tracked readonly snapshot. Writes go
 * through `useStore()`, which hands back the raw mutable proxy without subscribing.
 */
export function createStore<TState extends object, TDefaultValue = undefined>(
	factory: StoreFactory<TState, TDefaultValue>,
	options: CreateStoreOptions<TState> = {},
): CreateStoreResult<TState, TDefaultValue> {
	const StoreContext = createContext<TState | null>(null)
	const plugins = options.plugins ?? []
	const controlled: ControlledConfig<TState> = options.controlled ?? {}
	const name = options.name ?? DEFAULT_STORE_NAME
	const storeId: StoreId = { path: EMPTY_PATH, name, id: SINGLETON_ID }

	function usePlugins(store: TState, services: PluginContext['services']): void {
		useEffect(() => {
			if (plugins.length === 0) return
			const context: PluginContext = { services, id: storeId, isServer: IS_SERVER }
			const cleanups: PluginCleanup[] = plugins.map((plugin) => plugin.setup(store, context))
			return () => {
				for (const cleanup of cleanups) {
					if (cleanup) cleanup()
				}
			}
		}, [store, services])
	}

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue, TState>>): ReactElement {
		const { children, defaultValue, value, onValueChange } = props as PropsWithChildren<{
			defaultValue: TDefaultValue
			value?: Partial<TState>
			onValueChange?: (value: Partial<TState>) => void
		}>
		const services = useServices()
		const storeRef = useRef<TState | null>(null)
		const isNewStore = storeRef.current === null
		const hasSyncedInitialRef = useRef(false)
		const previousValueRef = useRef<Partial<TState> | undefined>(undefined)
		/**
		 * Controlled values already accounted for — either emitted upwards or just pushed down from
		 * `value`. Anti-echo is a value baseline rather than an "is syncing" flag on purpose: Valtio
		 * defers `subscribe` callbacks to a microtask, so any flag cleared synchronously after the
		 * write is already clear by the time the callback runs, and the echo leaks out.
		 */
		const baselineRef = useRef<Partial<TState>>({})
		const onValueChangeRef = useRef(onValueChange)
		const valueRef = useRef(value)
		onValueChangeRef.current = onValueChange
		valueRef.current = value

		storeRef.current ??= factory({ defaultValue })
		const store = storeRef.current

		if (isNewStore) {
			// First frame must already reflect `value` — apply it now, synchronously, during render.
			const initialChanges = getChangedControlledEntries<TState>(undefined, value, controlled)
			if (Object.keys(initialChanges).length > 0) {
				applyControlledEntries(store, initialChanges, controlled)
			}
		}

		usePlugins(store, services)

		useLayoutEffect(() => {
			const isInitialSync = !hasSyncedInitialRef.current
			hasSyncedInitialRef.current = true

			if (!isInitialSync) {
				const changed = getChangedControlledEntries<TState>(previousValueRef.current, value, controlled)
				if (Object.keys(changed).length > 0) {
					// Baseline the intended values *before* writing, so the anti-echo holds whether the
					// store notifies synchronously or, as Valtio does, on a later microtask.
					baselineRef.current = { ...baselineRef.current, ...changed }
					try {
						applyControlledEntries(store, changed, controlled)
					} finally {
						// Re-baselining even when a custom `set` threw keeps a failed write from
						// permanently suppressing later real changes to those keys.
						rebaselineControlledKeys()
					}
				}
			}

			previousValueRef.current = value
			// Keys that only just became controlled are baselined here, so entering `value` never
			// looks like an internal write on the next store notification.
			rebaselineControlledKeys()

			function rebaselineControlledKeys(): void {
				const keys = value ? (Object.keys(value) as (keyof TState)[]) : []
				baselineRef.current = pickControlledKeys(snapshot(store) as TState, keys)
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [value])

		useLayoutEffect(() => {
			return subscribeValtio(store, () => {
				const controlledKeys = valueRef.current ? (Object.keys(valueRef.current) as (keyof TState)[]) : []
				if (controlledKeys.length === 0) return

				// Emit from the snapshot, never the live proxy: a parent must not receive a mutable
				// handle that writes past the Provider's own write path.
				const current = pickControlledKeys(snapshot(store) as TState, controlledKeys)
				const changed = getChangedControlledEntries<TState>(baselineRef.current, current, controlled)
				baselineRef.current = current
				if (Object.keys(changed).length === 0) return

				onValueChangeRef.current?.(changed)
			})
		}, [store])

		return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	}

	function useStore(): TState {
		return getStoreFromContext(useContext(StoreContext), name)
	}

	function useSnapshot(snapshotOptions?: UseSnapshotOptions): Snapshot<TState> {
		return useValtioSnapshot(useStore(), snapshotOptions)
	}

	function Item({ children }: ItemProps<TState>): ReactElement {
		return children({ snap: useSnapshot(), store: useStore() })
	}

	function StoreItem({ children }: StoreItemProps<TState>): ReactElement {
		return children(useStore())
	}

	return { Provider, useSnapshot, useStore, Item, StoreItem }
}
