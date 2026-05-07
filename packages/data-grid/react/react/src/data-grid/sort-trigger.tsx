import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

import type { SortColumnOption, SortMenuItem } from '../types'
import type { ColumnSort } from '@tanstack/table-core'

/**
 * Renders the SortMenu DI component populated with the current multi-sort state.
 * - Reads all sortable, non-system columns
 * - Maps current `table.getState().sorting` to SortMenuItem[] with per-row available columns (deduped)
 * - Wires Add Sort, Reset Sorting, change column/direction, and remove handlers
 */
export function SortTrigger() {
	const table = useTableContext()
	const { SortMenu } = useGridComponents()

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

	return (
		<SortMenu
			items={items}
			canAddSort={canAddSort}
			onAddSort={() => {
				if (!firstFree) return
				table.setSorting([...sorting, { id: firstFree.id, desc: false }])
			}}
			onResetSorting={() => {
				table.setSorting([])
			}}
		/>
	)
}
