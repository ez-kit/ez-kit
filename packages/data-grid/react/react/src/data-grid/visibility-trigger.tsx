import { ColumnMoveDirection, ColumnMoveScope, canMoveColumn, moveColumn } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { resolveReorderMode } from '../utils/reorder-mode'
import { shallow } from '../utils/shallow-equal'
import { getVisibilityPanelColumns } from '../utils/visibility-panel-columns'

import { useDndEnabled } from './dnd'
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
	 * to every non-system column — see {@link VisibilityColumnItem}.
	 *
	 * `ordering` on an item is the **one-step move pair**, and it is present only when that is
	 * the affordance the panel resolved to: a panel whose rows are draggable offers the pair to
	 * nobody unless `visibilityMenu: 'both'` asked for the two together.
	 */
	columns: VisibilityColumnItem[]
	/**
	 * Whether `ordering.column.visibilityMenu` made this a column panel — see
	 * {@link VisibilityMenuProps.isColumnPanel}, which is the same value under the same name.
	 */
	isColumnPanel: boolean
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
	const { VisibilityMenu } = useGridComponents().visibility
	const isDndEnabled = useDndEnabled()

	/*
	 * The list widens on `enabled` and the pair is offered on `moveControls`, which are two
	 * different questions. The wide list follows from the author asking for an ordering panel; which
	 * affordance that panel then carries depends on whether a drag adapter is bound, which only
	 * `resolveReorderMode` can say. `getVisibilityPanelColumns` reads `enabled` itself, for the same
	 * reason and so that all three of its readers agree.
	 */
	const withOrdering = resolveReorderMode(table.grid.ordering.visibilityMenu.mode, false, isDndEnabled).moveControls

	/*
	 * The list itself is `getVisibilityPanelColumns`, shared rather than written out here, because
	 * two other readers have to agree with it exactly: `<DataGrid.VisibilityItem>` takes an item's
	 * drag index from its position in this list, and `GridDndProvider` resolves a panel drop's
	 * target from it. A drag's index space is those positions, and a disagreement puts a gap in it —
	 * which kills the surface's drag silently. That helper's docblock has the rest.
	 */
	const model = useDataGridState(
		() =>
			getVisibilityPanelColumns(table).map((col) => ({
				col,
				isVisible: col.getIsVisible(),
				canHide: col.getCanHide(),
				canMoveStart: withOrdering && canMoveColumn(table, col.id, ColumnMoveDirection.Start, ColumnMoveScope.All),
				canMoveEnd: withOrdering && canMoveColumn(table, col.id, ColumnMoveDirection.End, ColumnMoveScope.All),
			})),
		{ compare: (a, b) => a.length === b.length && a.every((entry, index) => shallow(entry, b[index])) },
	)
	const columns: VisibilityColumnItem[] = model.map(({ col, isVisible, canHide, canMoveStart, canMoveEnd }) => ({
		id: col.id,
		label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
		isVisible,
		canHide,
		onToggle: () => {
			col.toggleVisibility()
		},
		...(withOrdering
			? {
					ordering: {
						canMoveStart,
						canMoveEnd,
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

	const isColumnPanel = table.grid.ordering.visibilityMenu.enabled

	if (children !== undefined) {
		return typeof children === 'function' ? children({ columns, isColumnPanel }) : children
	}

	return (
		<VisibilityMenu
			columns={columns}
			isColumnPanel={isColumnPanel}
		/>
	)
}
