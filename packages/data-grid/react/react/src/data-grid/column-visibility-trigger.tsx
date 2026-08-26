import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

import type { VisibilityColumnItem } from '../types'
import type { ReactNode } from 'react'

/**
 * Renders the ColumnVisibilityMenu DI component populated with all
 * hideable (non-system, enableHiding !== false) leaf columns.
 */
/** What a `<DataGrid.ColumnVisibilityTrigger>` render function receives. */
export type DataGridColumnVisibilityTriggerRenderArgs = {
	/**
	 * Every hideable, non-system column with its current state and a ready `onToggle`.
	 * System columns and those a `visibility: false` column def locked out are already
	 * filtered out, so a custom menu cannot offer to hide something that must stay.
	 */
	columns: VisibilityColumnItem[]
}

export type DataGridColumnVisibilityTriggerProps = {
	/**
	 * Custom content, replacing the kit's `ColumnVisibilityMenu` component.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.ColumnVisibilityTrigger>
	 *   {({ columns }) =>
	 *     columns.map((column) => (
	 *       <label key={column.id}>
	 *         <input type='checkbox' checked={column.isVisible} onChange={column.onToggle} />
	 *         {column.label}
	 *       </label>
	 *     ))
	 *   }
	 * </DataGrid.ColumnVisibilityTrigger>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridColumnVisibilityTriggerRenderArgs) => ReactNode)
}

export function ColumnVisibilityTrigger({ children }: DataGridColumnVisibilityTriggerProps = {}) {
	const table = useTable()
	const { ColumnVisibilityMenu } = useGridComponents()['column-visibility']

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

	return <ColumnVisibilityMenu columns={columns} />
}
