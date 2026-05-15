import { useGridComponents } from '../components-context'

import { DataGridRow } from './row'
import { useTable } from './table-context'
import { useVirtualContext } from './virtual-context'

import type { VirtualItem } from '@tanstack/react-virtual'
import type { CSSProperties } from 'react'

/**
 * CSS custom property used to compute sticky offsets for pinned rows.
 * Same variable as Body — override with `--dg-row-height` to match your row height.
 */
const ROW_HEIGHT_CSS = 'var(--dg-row-height, 49px)'

/**
 * Virtualized tbody — renders only the rows currently in the viewport.
 *
 * The tbody emits `data-slot="tbody" data-virtualized="true"` and a single
 * runtime-computed `height` inline style (the virtualizer's total size). The
 * `display: grid` / `position: relative` shape comes from the structural
 * stylesheet shipped with this package.
 *
 * Each virtual row receives a runtime `transform: translateY(start)` inline
 * style — values change every scroll frame and cannot move to CSS — plus a
 * `data-slot="virtual-row"` for the structural CSS that sets
 * `position: absolute; left: 0; top: 0; width: 100%`.
 *
 * Pinned rows (top / bottom) use the same data-attr + `--dg-row-pin-offset`
 * pattern as the non-virtual Body.
 */
export function VirtualBody() {
	const table = useTable()
	const { Tbody } = useGridComponents()
	const { rowVirtualizer } = useVirtualContext()

	if (!rowVirtualizer) return null

	const hasPinning = Boolean(table.options.enableRowPinning)
	const topRows = hasPinning ? table.getTopRows() : []
	const centerRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
	const bottomRows = hasPinning ? table.getBottomRows() : []

	const virtualItems = rowVirtualizer.getVirtualItems()
	const totalSize = rowVirtualizer.getTotalSize()

	return (
		<Tbody
			data-slot='tbody'
			data-virtualized='true'
			style={{ height: `${String(totalSize)}px` }}
		>
			{topRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='top'
					style={{ '--dg-row-pin-offset': `calc(${String(index)} * ${ROW_HEIGHT_CSS})` } as CSSProperties}
				/>
			))}

			{virtualItems.map((virtualRow: VirtualItem) => {
				const row = centerRows[virtualRow.index]
				if (!row) return null
				return (
					<DataGridRow
						key={row.id}
						row={row}
						data-virtual='row'
						style={{ transform: `translateY(${String(virtualRow.start)}px)` }}
					/>
				)
			})}

			{bottomRows.map((row, index) => (
				<DataGridRow
					key={row.id}
					row={row}
					data-pinned='bottom'
					style={{ '--dg-row-pin-offset': `calc(${String(bottomRows.length - 1 - index)} * ${ROW_HEIGHT_CSS})` } as CSSProperties}
				/>
			))}
		</Tbody>
	)
}
