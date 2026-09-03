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
	 * Every hideable, non-system column with its current state and a ready `onToggle`.
	 * System columns and those a `visibility: false` column def locked out are already
	 * filtered out, so a custom menu cannot offer to hide something that must stay.
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
	const { VisibilityMenu } = useGridComponents().visibility

	const columns: VisibilityColumnItem[] = table
		.getAllLeafColumns()
		.filter((col) => !col.columnDef.meta?.isSystemColumn && col.getCanHide())
		.map((col) => ({
			id: col.id,
			label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
			isVisible: col.getIsVisible(),
			onToggle: () => {
				col.toggleVisibility()
			},
		}))

	if (children !== undefined) {
		return typeof children === 'function' ? children({ columns }) : children
	}

	return <VisibilityMenu columns={columns} />
}
