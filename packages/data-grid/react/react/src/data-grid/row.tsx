import { useGridComponents } from '../components-context'

import { DataGridCell } from './cell'

import type { Row } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

interface RowProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
	style?: CSSProperties
	'data-pinned'?: 'top' | 'bottom'
}

/**
 * Renders a single table body row with all its cells.
 */
export function DataGridRow({ row, style, 'data-pinned': dataPinned }: RowProps) {
	const { Tr } = useGridComponents()
	return (
		<Tr
			data-row-id={row.id}
			style={style}
			data-pinned={dataPinned}
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
