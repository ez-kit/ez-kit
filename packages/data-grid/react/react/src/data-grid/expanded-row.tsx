import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useTable } from './table-context'

import type { ExpandedRowProps } from '../use-data-grid'
import type { Row } from '@tanstack/table-core'
import type { ComponentType } from 'react'

type ExpandedRowComponentProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

type ExpandConfig = {
	renderExpanded?: ComponentType<ExpandedRowProps<object>>
}

/**
 * Renders a full-width row below an expanded row for the sub-content variant.
 * Reads `renderExpanded` from the grid's resolved options (`table.grid.expanding`).
 */
export function ExpandedRow({ row }: ExpandedRowComponentProps) {
	const table = useTable()
	const { Tr, Td } = useGridComponents().core

	const renderExpanded = table.grid.expanding.renderExpanded as ExpandConfig['renderExpanded']
	if (!renderExpanded) return null

	const colSpan = row.getVisibleCells().length

	return (
		<Tr data-expanded='true'>
			<Td
				colSpan={colSpan}
				pinned={false}
			>
				{flexRender(renderExpanded, { row, table })}
			</Td>
		</Tr>
	)
}
