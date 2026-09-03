import { CommitStatus, RowActionsVariant } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { GridMenuIcon, GridMenuVariant, toMenuSections } from '../menu'
import { ActionsCellState, RowActionId } from '../types'

import { buildActionItems } from './build-action-items'
import { useDataGridTable, useDataGridState } from './table-context'

import type { GridMenuItem, GridMenuSection } from '../menu'
import type { ActionItem, RowActionsContext, RowPinningConfig } from '@ez-kit/data-grid-core'
import type { Row, Table } from '@tanstack/table-core'
import type { ReactElement } from 'react'

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
const CUSTOM_SECTION = 'row-actions-custom'
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
 * Custom entries from `rowActions.actions` join the overflow menu in both layouts: under
 * `menu` there is only the one, and under `inline` they sit in the menu that already carries
 * the pin entries. They are not promoted to inline buttons — the cell is a fixed width and an
 * open-ended set of application actions has no icon budget there, nor a guaranteed icon.
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
	const { ActionsCell: Renderer } = useGridComponents().rowActions
	const { Menu } = useGridComponents().core

	// Stable booleans — non-target rows stay `false` across any editing change.
	const isEditing = useDataGridState((s) => s.editing.rowId === row.id)
	const isPending = useDataGridState((s) => s.editing.rowId === row.id && s.editing.commitStatus !== CommitStatus.Idle)
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
				state={ActionsCellState.Editing}
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
			state={ActionsCellState.Idle}
			row={row}
			hasEditing={hasEditing}
			hasDeleting={hasDeleting}
			onEdit={() => {
				table.editing.start(row.id)
			}}
			onDelete={() => {
				table.deleting.request(row.id)
			}}
		/>
	)

	const pinItems = pinConfig ? buildPinItems(row, pinConfig) : []
	const buildActions = table.options.rowActions?.actions
	// The augmented option is `RowActionsConfig<object, unknown>` — the row type and the node
	// type are both erased at the `table.options` boundary — so the row/table this cell holds
	// are narrowed at the call, and the returned items are re-bound to this layer's node type.
	// `buildActionItems` still checks each icon at runtime; see its `toMenuIcon`.
	const actionsCtx: RowActionsContext = { row: row as Row<object>, table: table as Table<object> }
	const customItems = buildActions ? buildActionItems(buildActions(actionsCtx) as ActionItem<ReactElement>[]) : []
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
				destructive: true,
				onSelect: () => {
					table.deleting.request(row.id)
				},
			})
		}

		const sections: GridMenuSection[] = toMenuSections([
			{ id: ACTIONS_SECTION, items: actions },
			{ id: CUSTOM_SECTION, items: customItems },
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

	// Inline: the built-ins stay icon buttons and the custom entries share the overflow menu
	// with the pin entries — one trigger, whose width `getActionsColumnSize` reserves.
	const overflowSections: GridMenuSection[] = toMenuSections([
		{ id: CUSTOM_SECTION, items: customItems },
		{ id: PIN_SECTION, items: pinItems },
	])

	return (
		<>
			{buttons}
			{overflowSections.length > 0 && (
				<Menu
					variant={GridMenuVariant.Row}
					sections={overflowSections}
					aria-label={customItems.length > 0 ? ROW_ACTIONS_LABEL : ROW_PINNING_LABEL}
				/>
			)}
		</>
	)
}
