'use client'

import { useSyncExternalStore } from 'react'

import type { DataGridInstance } from './data-grid-instance'
import type { TableState } from '@ez-kit/data-grid-core'

/**
 * Subscribe to a slice of a {@link DataGridInstance}'s table state.
 *
 * **Contract:** the selector must return a referentially stable value when
 * the underlying TableState hasn't changed. Direct field access
 * (`(s) => s.sorting`) and primitive computations
 * (`(s) => s.columnFilters.length`) satisfy this — TanStack keeps the same
 * reference for each `TableState` field across reads until that field is
 * mutated. Returning a fresh object or array on every call
 * (`(s) => [...s.sorting]`, `(s) => ({ n: s.columnFilters.length })`)
 * violates the contract and will cause an infinite render loop — derive
 * such values with `useMemo` outside this hook instead.
 *
 * @example
 *   const sorting = useDataGridSelector(instance, (s) => s.sorting)
 *   const pagination = useDataGridSelector(instance, (s) => s.pagination)
 *   const filterCount = useDataGridSelector(
 *     instance,
 *     (s) => s.columnFilters.length,
 *   )
 */
export function useDataGridSelector<TRow extends object, TSelected>(
	instance: DataGridInstance<TRow>,
	selector: (state: TableState) => TSelected,
): TSelected {
	return useSyncExternalStore(
		instance.store.subscribe,
		() => selector(instance.store.getSnapshot()),
		() => selector(instance.store.getServerSnapshot()),
	)
}
