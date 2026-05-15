import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

import type { VisibilityColumnItem } from '../types'

/**
 * Renders the ColumnVisibilityMenu DI component populated with all
 * hideable (non-system, enableHiding !== false) leaf columns.
 */
export function ColumnVisibilityTrigger() {
	const table = useTable()
	const { ColumnVisibilityMenu } = useGridComponents()

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

	return <ColumnVisibilityMenu columns={columns} />
}
