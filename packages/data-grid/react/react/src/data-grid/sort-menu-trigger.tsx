import { useGridComponents } from '../components-context'
import { SortDirection } from '../types'
import { resolveReorderMode } from '../utils/reorder-mode'
import { isAllowedReorder, swapSortEntries } from '../utils/sort-entry-order'

import { useDndEnabled } from './dnd'
import { useDataGridState, useDataGridTable } from './table-context'
import { columnNameOf } from './visually-hidden'

import type { SortColumnOption, SortMenuItem } from '../types'
import type { ColumnSort } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * Renders the SortMenu DI component populated with the current multi-sort state.
 * - Reads all sortable, non-system columns
 * - Maps the current `sorting` slice to SortMenuItem[] with per-row available columns (deduped)
 * - Wires Add Sort, Reset Sorting, change column/direction, and remove handlers
 */
/**
 * What a `<DataGrid.SortMenuTrigger>` render function receives — the multi-sort builder model.
 *
 * `items[].availableColumns` is per-entry, not the global list: a column already used by
 * another sort entry is excluded from it, so a custom builder cannot offer a duplicate.
 */
export type DataGridSortMenuTriggerRenderArgs = {
	/**
	 * One entry per active sort, in priority order, with its own change/remove handlers — and the
	 * one-step move pair, `ordering`, when `sorting.multi.reorderable` resolved to it. Render each
	 * row through `<DataGrid.SortItem>` to make it draggable as well.
	 */
	items: SortMenuItem[]
	/** Every sortable, non-system column. */
	sortableColumns: SortColumnOption[]
	/**
	 * Whether another entry may be added: the sort is empty, or multi-sort is on, below its `max`,
	 * and some multi-sortable column is still unused.
	 *
	 * Multi-sort counts as on only when the author wrote `sorting.multi` — TanStack also accepts a
	 * Shift-click on a header when `multi` is absent, and the builder deliberately does not follow
	 * it there.
	 */
	canAddSort: boolean
	/** Appends the first still-unused column, ascending. No-op when `canAddSort` is false. */
	onAddSort: () => void
	onResetSorting: () => void
}

export type DataGridSortMenuTriggerProps = {
	/**
	 * Custom sort-builder content, replacing the kit's `SortMenu` component.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.SortMenuTrigger>
	 *   {({ items, canAddSort, onAddSort }) => (
	 *     <div>
	 *       {items.map((item) => (
	 *         <SortRow key={item.columnId} {...item} />
	 *       ))}
	 *       <button disabled={!canAddSort} onClick={onAddSort}>Add sort</button>
	 *     </div>
	 *   )}
	 * </DataGrid.SortMenuTrigger>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridSortMenuTriggerRenderArgs) => ReactNode)
}

export function SortMenuTrigger({ children }: DataGridSortMenuTriggerProps = {}) {
	const table = useDataGridTable()
	// The subscription is the read — see `active-filters-bar.tsx` for the note.
	const sorting = useDataGridState((s) => s.sorting)
	const { SortMenu } = useGridComponents().sorting
	const isDndEnabled = useDndEnabled()

	const sortable = table.getAllLeafColumns().filter((col) => !col.columnDef.meta?.isSystemColumn && col.getCanSort())
	// `columnNameOf` names the entry everywhere — here and in the drag announcements — so the step and
	// grip names cannot drift from the sentences a screen reader hears.
	const sortableColumns: SortColumnOption[] = sortable.map((col) => ({
		id: col.id,
		label: columnNameOf(col.columnDef.header, col.id),
	}))
	/*
	 * Only the first entry may name a column declared with `sorting: { multi: false }`: that is what
	 * a header click allows — such a column replaces the sort rather than joining it.
	 */
	const multiSortableIds = new Set(sortable.filter((col) => col.getCanMultiSort()).map((col) => col.id))
	const labelOf = (id: string) => columnNameOf(table.getColumn(id)?.columnDef.header, id)

	const withSteps = resolveReorderMode(table.grid.sortReorder, false, isDndEnabled).moveControls
	const canMultiSort = (id: string) => multiSortableIds.has(id)
	const canStep = (index: number, offset: number) => {
		const target = index + offset
		if (target < 0 || target >= sorting.length) return false
		return isAllowedReorder(sorting, swapSortEntries(sorting, index, target), canMultiSort)
	}
	const move = (index: number, offset: number) => {
		if (canStep(index, offset)) table.setSorting(swapSortEntries(sorting, index, index + offset))
	}

	const items: SortMenuItem[] = sorting.map((entry, index) => {
		const usedElsewhere = new Set(sorting.filter((_, i) => i !== index).map((s) => s.id))
		/*
		 * The entry's own column is always offered, even below the first place: a sort restored from
		 * state, or built by Shift-clicks with `multi` unwritten, can hold a column outside multi-sort
		 * there, and a select whose value is not among its options renders blank.
		 */
		const availableColumns = sortableColumns.filter(
			(c) => c.id === entry.id || (!usedElsewhere.has(c.id) && (index === 0 || multiSortableIds.has(c.id))),
		)

		return {
			columnId: entry.id,
			label: labelOf(entry.id),
			direction: entry.desc ? SortDirection.Desc : SortDirection.Asc,
			availableColumns,
			onChangeColumn: (nextId: string) => {
				const next: ColumnSort[] = sorting.map((s, i) => (i === index ? { id: nextId, desc: entry.desc } : s))
				table.setSorting(next)
			},
			onChangeDirection: (dir) => {
				const next: ColumnSort[] = sorting.map((s, i) =>
					i === index ? { id: entry.id, desc: dir === SortDirection.Desc } : s,
				)
				table.setSorting(next)
			},
			onRemove: () => {
				table.setSorting(sorting.filter((_, i) => i !== index))
			},
			...(withSteps
				? {
						ordering: {
							canMoveStart: canStep(index, -1),
							canMoveEnd: canStep(index, 1),
							onMoveStart: () => {
								move(index, -1)
							},
							onMoveEnd: () => {
								move(index, 1)
							},
						},
					}
				: {}),
		}
	})

	const used = new Set(sorting.map((s) => s.id))
	const firstFree = sortableColumns.find((c) => !used.has(c.id) && (sorting.length === 0 || multiSortableIds.has(c.id)))
	const canAddSort = firstFree !== undefined && canAppendEntry(table.options, sorting.length)

	const onAddSort = () => {
		if (!firstFree || !canAddSort) return
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

/**
 * Whether the sort may grow past `count` entries, by the flags core set from `sorting.multi`.
 *
 * `enableMultiSort` is read as on only when it is `true`: core sets it from a written `multi` and
 * leaves it unset otherwise, and the documented default is single-column.
 */
function canAppendEntry(options: { enableMultiSort?: boolean; maxMultiSortColCount?: number }, count: number): boolean {
	if (count === 0) return true
	if (options.enableMultiSort !== true) return false
	return options.maxMultiSortColCount === undefined || count < options.maxMultiSortColCount
}
