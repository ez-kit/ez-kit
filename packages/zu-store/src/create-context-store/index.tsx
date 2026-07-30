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

/**
 * Writes `changed` into the store: `controlled[key].set` when declared, otherwise a single batched
 * `setState` for all remaining keys, so one `value` update produces one store notification.
 */
function applyControlledEntries<TStore extends StoreApi<unknown>, TState extends ExtractState<TStore>>(
	store: TStore,
	changed: Partial<TState>,
	controlled: ControlledConfig<TState>,
): void {
	const direct: Partial<TState> = {}

	for (const key of Object.keys(changed) as (keyof TState)[]) {
		const value = changed[key] as TState[typeof key]
		const set = controlled[key]?.set

		if (set) {
			set(store.getState() as TState, value)
		} else {
			direct[key] = value
		}
	}

	if (Object.keys(direct).length > 0) {
		store.setState(direct)
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
		/**
		 * Controlled values already accounted for — either emitted upwards or just pushed down from
		 * `value`. Anti-echo is a value baseline rather than an "is syncing" flag on purpose: the flag
		 * would have to be cleared on a timer relative to when the store notifies, and a store that
		 * batches its notifications fires after any synchronous clear, leaking the echo out.
		 */
		const baselineRef = useRef<Partial<TState>>({})
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
			const isInitialSync = !hasSyncedInitialRef.current
			hasSyncedInitialRef.current = true

			if (!isInitialSync) {
				const changed = getChangedControlledEntries<TState>(previousValueRef.current, value, controlled)
				if (Object.keys(changed).length > 0) {
					// Baseline the intended values *before* writing: a store that notifies synchronously
					// runs its subscriber inside `applyControlledEntries`, so a baseline set afterwards
					// would arrive too late and the echo would escape.
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
				baselineRef.current = pickControlledKeys(store.getState() as TState, keys)
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [value])

		useLayoutEffect(() => {
			return store.subscribe((state) => {
				const controlledKeys = valueRef.current ? (Object.keys(valueRef.current) as (keyof TState)[]) : []
				if (controlledKeys.length === 0) return

				const current = pickControlledKeys(state as TState, controlledKeys)
				const changed = getChangedControlledEntries<TState>(baselineRef.current, current, controlled)
				baselineRef.current = current
				if (Object.keys(changed).length === 0) return

				onValueChangeRef.current?.(changed)
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
