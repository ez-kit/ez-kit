import { GridMenuIcon, RowMoveDirection } from '@ez-kit/data-grid-core'

import { RowActionId } from '../types'

import type { GridMenuItem } from '../menu'
import type { GridFeatures } from '../types'
import type { GridMessages } from '@ez-kit/data-grid-core'
import type { Row, Table } from '@tanstack/table-core'

/**
 * The two move entries for one row.
 *
 * Both directions are always listed, disabled wherever the step is unavailable — at an end of
 * the order, across a pinning band, outside the row's own subtree, or anywhere at all while a
 * sort is applied. An entry that appeared and disappeared as the row travelled would make the
 * menu jump under the pointer, and the disabled state is also what says "this row is already
 * at the top" rather than saying nothing. Same reasoning as `buildColumnMenuSections`.
 *
 * The wording arrives as `messages` — the grid's resolved `messages.rowActions` — rather than
 * from a table in this module: this is the one place these entries are named, so a hardcoded
 * label here would be untranslatable in both kits at once.
 */
export function buildRowOrderItems(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<GridFeatures, any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<GridFeatures, any>,
	messages: GridMessages['rowActions'],
): GridMenuItem[] {
	return [
		{
			id: RowActionId.MoveUp,
			label: messages.moveUp,
			icon: GridMenuIcon.MoveUp,
			disabled: !table.ordering.canMoveRow(row.id, RowMoveDirection.Up),
			onAction: () => {
				table.ordering.moveRow(row.id, RowMoveDirection.Up)
			},
		},
		{
			id: RowActionId.MoveDown,
			label: messages.moveDown,
			icon: GridMenuIcon.MoveDown,
			disabled: !table.ordering.canMoveRow(row.id, RowMoveDirection.Down),
			onAction: () => {
				table.ordering.moveRow(row.id, RowMoveDirection.Down)
			},
		},
	]
}
