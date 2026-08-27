import { RowActionsVariant } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { GridMenuIcon, GridMenuVariant, toMenuSections } from '../menu'
import { RowActionId, RowActionsMode } from '../types'

import { useDataGridTable, useDataGridState } from './table-context'

import type { GridMenuItem, GridMenuSection } from '../menu'
import type { RowPinningConfig } from '@ez-kit/data-grid-core'
import type { Row } from '@tanstack/table-core'

type ActionsCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

const LABELS: Record<RowActionId, string> = {
	[RowActionId.Edit]: 'Edit',
	[RowActionId.Delete]: 'Delete',
	[RowActionId.PinTop]: 'Pin Top',
	[RowActionId.PinBottom]: 'Pin Bottom',
	[RowActionId.Unpin]: 'Unpin',
}

const ICONS: Record<RowActionId, GridMenuIcon> = {
	[RowActionId.Edit]: GridMenuIcon.Edit,
	[RowActionId.Delete]: GridMenuIcon.Delete,
	[RowActionId.PinTop]: GridMenuIcon.PinTop,
	[RowActionId.PinBottom]: GridMenuIcon.PinBottom,
	[RowActionId.Unpin]: GridMenuIcon.Unpin,
}

const ACTIONS_SECTION = 'row-actions'
const PIN_SECTION = 'row-pinning'

const ROW_ACTIONS_LABEL = 'Row actions'
const ROW_PINNING_LABEL = 'Row pinning'

/**
 * Builds the pin entries for a row: the two pin directions the config allows,
 * plus `Unpin` once the row is pinned.
 */
function buildPinItems(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>,
	config: RowPinningConfig,
): GridMenuItem[] {
	const isPinned = row.getIsPinned()
	const items: GridMenuItem[] = []

	if (config.top) {
		items.push({
			id: RowActionId.PinTop,
			label: LABELS[RowActionId.PinTop],
			icon: ICONS[RowActionId.PinTop],
			disabled: isPinned === 'top',
			onSelect: () => {
				row.pin('top', false, false)
			},
		})
	}
	if (config.bottom) {
		items.push({
			id: RowActionId.PinBottom,
			label: LABELS[RowActionId.PinBottom],
			icon: ICONS[RowActionId.PinBottom],
			disabled: isPinned === 'bottom',
			onSelect: () => {
				row.pin('bottom', false, false)
			},
		})
	}
	if (isPinned) {
		items.push({
			id: RowActionId.Unpin,
			label: LABELS[RowActionId.Unpin],
			icon: ICONS[RowActionId.Unpin],
			onSelect: () => {
				row.pin(false, false, false)
			},
		})
	}

	return items
}

/**
 * Renders the per-row actions column: edit / delete plus the row-pin menu.
 *
 * Two layouts, chosen by `rowActions.variant`:
 * - `inline` — one icon button per action side by side, pin actions behind
 *   their own overflow menu;
 * - `menu` — a single overflow menu holding every action.
 *
 * A row in inline edit mode always falls back to the inline save / cancel
 * buttons: burying a commit inside a dropdown would hide it behind an extra
 * click while the row is mid-edit.
 *
 * Subscribes only via two boolean selectors that are stably `false` for
 * non-target rows — so editing mutations on a different row do NOT re-render
 * this `ActionsCell`. For the targeted row, the booleans flip exactly when
 * the row enters / leaves edit mode and when the commit status leaves `idle`.
 */
export function ActionsCell({ row }: ActionsCellProps) {
	const table = useDataGridTable()
	const { ActionsCell: Renderer } = useGridComponents()['row-actions']
	const { Menu } = useGridComponents().core

	// Stable booleans — non-target rows stay `false` across any editing change.
	const isEditing = useDataGridState((s) => s.editing.rowId === row.id)
	const isPending = useDataGridState((s) => s.editing.rowId === row.id && s.editing.commitStatus !== 'idle')
	// Row pinning is derived state; subscribe so the menu re-derives on pin/unpin.
	useDataGridState((s) => s.rowPinning)

	const hasEditing = Boolean(table.options.editing)
	const hasDeleting = Boolean(table.options.deleting)
	const editingMode = table.options.editing?.mode
	const pinConfig = table.options.pinning

	// Mid-edit: save / cancel only, whatever the variant.
	if (isEditing && editingMode !== 'modal') {
		return (
			<Renderer
				mode={RowActionsMode.Editing}
				row={row}
				onSave={() => table.editing.commit()}
				onCancel={() => {
					table.editing.cancel()
				}}
				isPending={isPending}
			/>
		)
	}

	const buttons = (
		<Renderer
			mode={RowActionsMode.Idle}
			row={row}
			hasEditing={hasEditing}
			hasDeleting={hasDeleting}
			onEdit={() => {
				table.editing.start(row.id)
			}}
			onDelete={() => {
				table.requestDeleteRow(row.id)
			}}
		/>
	)

	const pinItems = pinConfig ? buildPinItems(row, pinConfig) : []
	const variant = table.options.rowActions?.variant ?? RowActionsVariant.Inline

	if (variant === RowActionsVariant.Menu) {
		const actions: GridMenuItem[] = []
		if (hasEditing) {
			actions.push({
				id: RowActionId.Edit,
				label: LABELS[RowActionId.Edit],
				icon: ICONS[RowActionId.Edit],
				onSelect: () => {
					table.editing.start(row.id)
				},
			})
		}
		if (hasDeleting) {
			actions.push({
				id: RowActionId.Delete,
				label: LABELS[RowActionId.Delete],
				icon: ICONS[RowActionId.Delete],
				danger: true,
				onSelect: () => {
					table.requestDeleteRow(row.id)
				},
			})
		}

		const sections: GridMenuSection[] = toMenuSections([
			{ id: ACTIONS_SECTION, items: actions },
			{ id: PIN_SECTION, items: pinItems },
		])
		return (
			<Menu
				variant={GridMenuVariant.Row}
				sections={sections}
				aria-label={ROW_ACTIONS_LABEL}
			/>
		)
	}

	return (
		<>
			{buttons}
			{pinItems.length > 0 && (
				<Menu
					variant={GridMenuVariant.Row}
					sections={[{ id: PIN_SECTION, items: pinItems }]}
					aria-label={ROW_PINNING_LABEL}
				/>
			)}
		</>
	)
}
