import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ExpandedRowProps } from '../use-data-grid'
import type { Row } from '@tanstack/table-core'
import type { ComponentType } from 'react'

type ExpandedRowComponentProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

type ExpandConfig = {
	component?: ComponentType<ExpandedRowProps<object>>
}

/**
 * Renders a full-width row below an expanded row for the sub-content variant.
 * Reads `expandedComponent` from the grid's resolved options (`table.grid.expanding`).
 */
export function ExpandedRow({ row }: ExpandedRowComponentProps) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	const { Tr, Td } = useGridComponents().core

	const expandedComponent = table.grid.expanding.component as ExpandConfig['component']
	if (!expandedComponent) return null

	const colSpan = row.getVisibleCells().length

	return (
		<Tr data-expanded='true'>
			<Td
				colSpan={colSpan}
				pinned={false}
			>
				{flexRender(expandedComponent, { row, table })}
			</Td>
		</Tr>
	)
}
