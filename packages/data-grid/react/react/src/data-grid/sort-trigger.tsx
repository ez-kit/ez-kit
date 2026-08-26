import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

import type { SortColumnOption, SortMenuItem } from '../types'
import type { ColumnSort } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * Renders the SortMenu DI component populated with the current multi-sort state.
 * - Reads all sortable, non-system columns
 * - Maps current `table.getState().sorting` to SortMenuItem[] with per-row available columns (deduped)
 * - Wires Add Sort, Reset Sorting, change column/direction, and remove handlers
 */
/**
 * What a `<DataGrid.SortTrigger>` render function receives — the multi-sort builder model.
 *
 * `items[].availableColumns` is per-entry, not the global list: a column already used by
 * another sort entry is excluded from it, so a custom builder cannot offer a duplicate.
 */
export type DataGridSortTriggerRenderArgs = {
	/** One entry per active sort, in priority order, with its own change/remove handlers. */
	items: SortMenuItem[]
	/** Every sortable, non-system column. */
	sortableColumns: SortColumnOption[]
	/** False when every sortable column is already used. */
	canAddSort: boolean
	/** Appends the first still-unused column, ascending. No-op when `canAddSort` is false. */
	onAddSort: () => void
	onResetSorting: () => void
}

export type DataGridSortTriggerProps = {
	/**
	 * Custom sort-builder content, replacing the kit's `SortMenu` component.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.SortTrigger>
	 *   {({ items, canAddSort, onAddSort }) => (
	 *     <div>
	 *       {items.map((item) => (
	 *         <SortRow key={item.columnId} {...item} />
	 *       ))}
	 *       <button disabled={!canAddSort} onClick={onAddSort}>Add sort</button>
	 *     </div>
	 *   )}
	 * </DataGrid.SortTrigger>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridSortTriggerRenderArgs) => ReactNode)
}

export function SortTrigger({ children }: DataGridSortTriggerProps = {}) {
	const table = useTable()
	const { SortMenu } = useGridComponents().sorting

	const sortableColumns: SortColumnOption[] = table
		.getAllLeafColumns()
		.filter((col) => !col.columnDef.meta?.isSystemColumn && col.getCanSort())
		.map((col) => ({
			id: col.id,
			label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
		}))

	const sorting = table.getState().sorting

	const items: SortMenuItem[] = sorting.map((entry, index) => {
		const usedElsewhere = new Set(sorting.filter((_, i) => i !== index).map((s) => s.id))
		const availableColumns = sortableColumns.filter((c) => !usedElsewhere.has(c.id))

		return {
			columnId: entry.id,
			direction: entry.desc ? 'desc' : 'asc',
			availableColumns,
			onChangeColumn: (nextId: string) => {
				const next: ColumnSort[] = sorting.map((s, i) => (i === index ? { id: nextId, desc: entry.desc } : s))
				table.setSorting(next)
			},
			onChangeDirection: (dir) => {
				const next: ColumnSort[] = sorting.map((s, i) => (i === index ? { id: entry.id, desc: dir === 'desc' } : s))
				table.setSorting(next)
			},
			onRemove: () => {
				table.setSorting(sorting.filter((_, i) => i !== index))
			},
		}
	})

	const used = new Set(sorting.map((s) => s.id))
	const firstFree = sortableColumns.find((c) => !used.has(c.id))
	const canAddSort = Boolean(firstFree)

	const onAddSort = () => {
		if (!firstFree) return
		table.setSorting([...sorting, { id: firstFree.id, desc: false }])
	}
	const onResetSorting = () => {
		table.setSorting([])
	}

	if (children !== undefined) {
		return typeof children === 'function'
			? children({ items, sortableColumns, canAddSort, onAddSort, onResetSorting })
			: children
	}

	return (
		<SortMenu
			items={items}
			canAddSort={canAddSort}
			onAddSort={onAddSort}
			onResetSorting={onResetSorting}
		/>
	)
}
