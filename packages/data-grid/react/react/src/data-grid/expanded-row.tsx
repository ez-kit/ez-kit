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

	// `data-slot` is passed explicitly, as every other row and cell in the body does. Without it
	// the kit's own default wins — shadcn's `Tr` stamps `data-slot="table-row"` — and the panel
	// becomes the one row in the grid that `[data-slot="tr"]` does not match, so a kit stylesheet
	// or a consumer's selector written against the documented contract silently skips it.
	// It carries no `data-row-id`: like the creating draft row, it is not a row of the data.
	//
	// `data-expanded-row`, not `data-expanded`: React Aria owns the latter on its rows and strips
	// whatever a kit passes, so the attribute reached the DOM under shadcn and never under heroui
	// — where both kits' `tr[data-expanded]` panel styling therefore did nothing. Same trap as
	// `data-selected`, which became `data-row-selected` for the same reason (see `row.tsx`), and
	// the name follows the creating draft row's `data-creating-row`.
	return (
		<Tr
			data-slot='tr'
			data-expanded-row='true'
		>
			<Td
				data-slot='td'
				colSpan={colSpan}
				pinned={false}
			>
				{flexRender(expandedComponent, { row, table })}
			</Td>
		</Tr>
	)
}
