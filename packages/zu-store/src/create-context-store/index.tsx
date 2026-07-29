import { getChangedControlledEntries, pickControlledKeys } from '@ez-kit/store-core'
import { createContext, type PropsWithChildren, type ReactElement, useContext, useLayoutEffect, useRef } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { ControlledConfig } from '@ez-kit/store-core'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

const MISSING_PROVIDER_ERROR = 'Missing Provider for createContextStore'

/** Seed envelope passed to a `createContextStore` factory. */
export type ContextStoreInit<TDefaultValue> = {
	defaultValue: TDefaultValue
}

export type CreateContextStoreFactory<TStore extends StoreApi<unknown>, TDefaultValue> = (
	init: ContextStoreInit<TDefaultValue>,
) => TStore

export type CreateContextStoreOptions<TState> = {
	/** Per-key overrides for fields controlled via the Provider's `value` prop. */
	controlled?: ControlledConfig<TState>
}

/**
 * `defaultValue` is required when the seed has required fields, optional when it doesn't. `value`
 * and `onValueChange` are always optional — the keys present in `value` are the controlled ones.
 */
type ProviderProps<TDefaultValue, TState> = (undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }) & {
	value?: Partial<TState>
	onValueChange?: (value: Partial<TState>) => void
}

type ItemProps<TStore extends StoreApi<unknown>, TSelected> = {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

export type CreateContextStoreResult<TStore extends StoreApi<unknown>, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue, ExtractState<TStore>>>) => ReactElement
	/**
	 * Write path / escape hatch: the raw Zustand store handle. It does **not** subscribe the calling
	 * component — pair it with `useSelector()` to render.
	 */
	useStore: () => TStore
	/** Reactive read: subscribes to the value returned by `selector`, compared by reference. */
	useSelector: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	/** As `useSelector`, but compares the selected value shallowly — for object/array selections. */
	useShallowSelector: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	Item: <TSelected>(props: ItemProps<TStore, TSelected>) => ReactElement
}

function getStoreFromContext<TStore extends StoreApi<unknown>>(store: TStore | null): TStore {
	if (!store) {
		throw new Error(MISSING_PROVIDER_ERROR)
	}

	return store
}

/** Writes `changed` into the store: `controlled[key].set` when declared, `setState` otherwise. */
function applyControlledEntries<TStore extends StoreApi<unknown>, TState extends ExtractState<TStore>>(
	store: TStore,
	changed: Partial<TState>,
	controlled: ControlledConfig<TState>,
): void {
	for (const key of Object.keys(changed) as (keyof TState)[]) {
		const value = changed[key] as TState[typeof key]
		const set = controlled[key]?.set

		if (set) {
			set(store.getState() as TState, value)
		} else {
			store.setState({ [key]: value })
		}
	}
}

export function createContextStore<TStore extends StoreApi<unknown>, TDefaultValue = undefined>(
	createStore: CreateContextStoreFactory<TStore, TDefaultValue>,
	options: CreateContextStoreOptions<ExtractState<TStore>> = {},
): CreateContextStoreResult<TStore, TDefaultValue> {
	type TState = ExtractState<TStore>
	const StoreContext = createContext<TStore | null>(null)
	const controlled: ControlledConfig<TState> = options.controlled ?? {}

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue, TState>>): ReactElement {
		const { children, defaultValue, value, onValueChange } = props as PropsWithChildren<{
			defaultValue: TDefaultValue
			value?: Partial<TState>
			onValueChange?: (value: Partial<TState>) => void
		}>
		const storeRef = useRef<TStore | null>(null)
		const isNewStore = storeRef.current === null
		const hasSyncedInitialRef = useRef(false)
		const previousValueRef = useRef<Partial<TState> | undefined>(undefined)
		const syncingKeysRef = useRef<ReadonlySet<keyof TState>>(new Set())
		const onValueChangeRef = useRef(onValueChange)
		const valueRef = useRef(value)
		onValueChangeRef.current = onValueChange
		valueRef.current = value

		storeRef.current ??= createStore({ defaultValue })
		const store = storeRef.current

		if (isNewStore) {
			// First frame must already reflect `value` — apply it now, synchronously, during render.
			const initialChanges = getChangedControlledEntries<TState>(undefined, value, controlled)
			if (Object.keys(initialChanges).length > 0) {
				applyControlledEntries(store, initialChanges, controlled)
			}
		}

		useLayoutEffect(() => {
			if (!hasSyncedInitialRef.current) {
				hasSyncedInitialRef.current = true
				previousValueRef.current = value
				return
			}

			const changed = getChangedControlledEntries<TState>(previousValueRef.current, value, controlled)
			previousValueRef.current = value
			if (Object.keys(changed).length === 0) return

			syncingKeysRef.current = new Set(Object.keys(changed) as (keyof TState)[])
			applyControlledEntries(store, changed, controlled)
			syncingKeysRef.current = new Set()
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [value])

		useLayoutEffect(() => {
			return store.subscribe((state, previousState) => {
				const controlledKeys = valueRef.current ? (Object.keys(valueRef.current) as (keyof TState)[]) : []
				if (controlledKeys.length === 0) return

				const changed = getChangedControlledEntries<TState>(
					pickControlledKeys(previousState as TState, controlledKeys),
					pickControlledKeys(state as TState, controlledKeys),
					controlled,
				)
				const emitKeys = (Object.keys(changed) as (keyof TState)[]).filter((key) => !syncingKeysRef.current.has(key))
				if (emitKeys.length === 0) return

				onValueChangeRef.current?.(pickControlledKeys(state as TState, emitKeys))
			})
		}, [store])

		return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	}

	function useStore(): TStore {
		const store = getStoreFromContext(useContext(StoreContext))
		return store
	}

	function useSelector<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
		const store = useStore()
		return useZustandStore(store, selector)
	}

	function useShallowSelector<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
		const store = useStore()
		return useZustandStore(store, useShallow(selector))
	}

	function Item<TSelected>({ selector, children }: ItemProps<TStore, TSelected>): ReactElement {
		return children(useSelector(selector))
	}

	return {
		Provider,
		useStore,
		useSelector,
		useShallowSelector,
		Item,
	}
}
