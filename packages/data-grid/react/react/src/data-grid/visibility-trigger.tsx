import { ColumnMoveDirection, ColumnMoveScope, canMoveColumn, moveColumn } from '@ez-kit/data-grid-core'
import { useEffect } from 'react'

import { useGridComponents } from '../components-context'
import { resolvePanelAffordances } from '../utils/visibility-panel-affordances'
import { getVisibilityPanelColumns } from '../utils/visibility-panel-columns'

import { useDndEnabled } from './dnd'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ResolvedGridOptions } from '../resolved-options'
import type { VisibilityColumnItem } from '../types'
import type { PanelAffordances } from '../utils/visibility-panel-affordances'
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
	 * nobody, because a grip and two arrows are the same move. `visibilityMenu.moveControls`
	 * overrides either way.
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
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	// The list *is* the order once moves are offered, so a reorder has to re-render it.
	useDataGridState((s) => s.columnOrder)
	const { VisibilityMenu } = useGridComponents().visibility
	const isDndEnabled = useDndEnabled()

	/*
	 * The list widens on `enabled` and the pair is offered on `moveControls`, which are two
	 * different questions — one flag used to answer both. The wide list follows from the author
	 * asking for an ordering panel; which affordance that panel then carries depends on whether a
	 * drag adapter is bound, which only `resolvePanelAffordances` can say. `getVisibilityPanelColumns`
	 * reads `enabled` itself, for the same reason and so that all three of its readers agree.
	 */
	const affordances = resolvePanelAffordances(table.grid.ordering.visibilityMenu, isDndEnabled)
	usePanelAffordanceWarnings(table.grid.ordering.visibilityMenu, isDndEnabled, affordances)
	const withOrdering = affordances.moveControls

	/*
	 * The list itself is `getVisibilityPanelColumns`, shared rather than written out here, because
	 * two other readers have to agree with it exactly: `<DataGrid.VisibilityItem>` takes an item's
	 * drag index from its position in this list, and `GridDndProvider` resolves a panel drop's
	 * target from it. A drag's index space is those positions, and a disagreement puts a gap in it —
	 * which kills the surface's drag silently. That helper's docblock has the rest.
	 */
	const columns: VisibilityColumnItem[] = getVisibilityPanelColumns(table).map((col) => ({
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

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Say so, in development, when the panel's two switches describe something it cannot do.
 *
 * Both cases are **silent** otherwise, which is the whole reason this exists: a panel that offers
 * neither affordance is a wide list of checkboxes that reads as the column order and refuses to
 * change it, and a `drag: true` that no adapter backs looks exactly like a grid whose author never
 * asked for drag. Neither is catchable in the types — the adapter is a runtime binding one layer
 * above `useDataGrid`, which is also why this is not core's `REQUIRED_FEATURE` warning.
 *
 * In an effect rather than in render so that a re-render on an unrelated state slice does not
 * repeat it, and keyed on the condition so a fixed config stops warning.
 */
function usePanelAffordanceWarnings(
	visibilityMenu: ResolvedGridOptions['ordering']['visibilityMenu'],
	hasAdapter: boolean,
	{ drag, moveControls }: PanelAffordances,
): void {
	const wantedDragWithoutAdapter = visibilityMenu.enabled && visibilityMenu.drag === true && !hasAdapter
	const offersNothing = visibilityMenu.enabled && !drag && !moveControls

	useEffect(() => {
		if (!IS_DEV) return

		if (wantedDragWithoutAdapter) {
			console.warn(
				'`ordering.column.visibilityMenu.drag` is `true` but this grid has no drag-and-drop adapter, ' +
					'so the column panel cannot be dragged. Bind one with `createDataGrid({ dnd })`, or drop the ' +
					'field and let the panel take its move controls instead — which is what it has done here.',
			)
		}

		if (offersNothing) {
			console.warn(
				'`ordering.column.visibilityMenu` offers neither a drag nor move controls, so the column panel ' +
					'lists every column as the order and offers no way to change it. Either bind a drag-and-drop ' +
					'adapter with `createDataGrid({ dnd })`, or drop `moveControls: false`.',
			)
		}
	}, [wantedDragWithoutAdapter, offersNothing])
}
