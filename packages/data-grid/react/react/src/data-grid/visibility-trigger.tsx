import { ColumnMoveDirection, ColumnMoveScope, canMoveColumn, moveColumn } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'

import { useDataGridState, useDataGridTable } from './table-context'

import type { VisibilityColumnItem } from '../types'
import type { ReactNode } from 'react'

/**
 * Renders the VisibilityMenu DI component populated with all
 * hideable (non-system, enableHiding !== false) leaf columns.
 */
/** What a `<DataGrid.VisibilityTrigger>` render function receives. */
export type DataGridVisibilityTriggerRenderArgs = {
	/**
	 * Every listed column with its current state and ready callbacks.
	 *
	 * By default that is the hideable, non-system columns: system columns and those a
	 * `visibility: false` column def locked out are filtered out, so a custom menu cannot offer
	 * to hide something that must stay. Under `ordering.column.visibilityMenu` the list widens
	 * to every non-system column and each item carries its `ordering` pair — see
	 * {@link VisibilityColumnItem}.
	 */
	columns: VisibilityColumnItem[]
}

export type DataGridVisibilityTriggerProps = {
	/**
	 * Custom content, replacing the kit's `VisibilityMenu` component.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.VisibilityTrigger>
	 *   {({ columns }) =>
	 *     columns.map((column) => (
	 *       <label key={column.id}>
	 *         <input type='checkbox' checked={column.isVisible} onChange={column.onToggle} />
	 *         {column.label}
	 *       </label>
	 *     ))
	 *   }
	 * </DataGrid.VisibilityTrigger>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridVisibilityTriggerRenderArgs) => ReactNode)
}

export function VisibilityTrigger({ children }: DataGridVisibilityTriggerProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	// The list *is* the order once moves are offered, so a reorder has to re-render it.
	useDataGridState((s) => s.columnOrder)
	const { VisibilityMenu } = useGridComponents().visibility

	// One flag decides both halves of the mode: a menu that offers moves lists every column the
	// order contains, because a list that skipped some of them could not be read as the order.
	const withOrdering = table.grid.ordering.visibilityMenu

	const columns: VisibilityColumnItem[] = table
		.getAllLeafColumns()
		.filter((col) => !col.columnDef.meta?.isSystemColumn && (withOrdering || col.getCanHide()))
		.map((col) => ({
			id: col.id,
			label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
			isVisible: col.getIsVisible(),
			canHide: col.getCanHide(),
			onToggle: () => {
				col.toggleVisibility()
			},
			...(withOrdering
				? {
						ordering: {
							canMoveStart: canMoveColumn(table, col.id, ColumnMoveDirection.Start, ColumnMoveScope.All),
							canMoveEnd: canMoveColumn(table, col.id, ColumnMoveDirection.End, ColumnMoveScope.All),
							onMoveStart: () => {
								table.setColumnOrder(moveColumn(table, col.id, ColumnMoveDirection.Start, ColumnMoveScope.All))
							},
							onMoveEnd: () => {
								table.setColumnOrder(moveColumn(table, col.id, ColumnMoveDirection.End, ColumnMoveScope.All))
							},
						},
					}
				: {}),
		}))

	if (children !== undefined) {
		return typeof children === 'function' ? children({ columns }) : children
	}

	return <VisibilityMenu columns={columns} />
}
