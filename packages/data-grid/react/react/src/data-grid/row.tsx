import { useGridComponents } from '../components-context'

import { DataGridCell } from './cell'

import type { Row } from '@tanstack/table-core'
import type { CSSProperties, Ref } from 'react'

type RowProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
	style?: CSSProperties
	/** Forwarded to the kit's `Tr`; pinned rows are measured through it (see `usePinnedRowOffsets`). */
	ref?: Ref<HTMLTableRowElement>
	'data-pinned'?: 'top' | 'bottom'
	'data-virtual'?: 'row'
}

/**
 * Renders a single table body row with all its cells.
 *
 * Emits structural data attributes:
 * - `data-slot="tr"` (identity)
 * - `data-row-id` (table row id)
 * - `data-depth` (sub-row depth for expansion)
 * - `data-pinned="top" | "bottom"` for pinned rows (offset from `--dg-row-pin-offset`)
 * - `data-virtual="row"` for virtualized rows (positioned via runtime `transform`)
 */
export function DataGridRow({ row, style, ref, 'data-pinned': dataPinned, 'data-virtual': dataVirtual }: RowProps) {
	const { Tr } = useGridComponents().core
	return (
		<Tr
			ref={ref}
			data-slot='tr'
			data-row-id={row.id}
			data-depth={row.depth > 0 ? row.depth : undefined}
			style={style}
			data-pinned={dataPinned}
			data-virtual={dataVirtual}
		>
			{row.getVisibleCells().map((cell) => (
				<DataGridCell
					key={cell.id}
					cell={cell}
					row={row}
				/>
			))}
		</Tr>
	)
}
