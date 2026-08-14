import { RowActionsVariant } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { RowActionId } from '../types'

import { useDataGridInstance, useDataGridStore } from './table-context'

import type { RowActionItem } from '../types'
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

/**
 * Builds the pin entries for a row: the two pin directions the config allows,
 * plus `Unpin` once the row is pinned.
 */
function buildPinItems(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>,
	config: RowPinningConfig,
): RowActionItem[] {
	const isPinned = row.getIsPinned()
	const items: RowActionItem[] = []

	if (config.top) {
		items.push({
			id: RowActionId.PinTop,
			label: LABELS[RowActionId.PinTop],
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
	const instance = useDataGridInstance()
	const table = instance.table
	const { ActionsCell: Renderer, RowActionsMenu } = useGridComponents()['row-actions']

	// Stable booleans — non-target rows stay `false` across any editing change.
	const isEditing = useDataGridStore((s) => s.editing.rowId === row.id)
	const isPending = useDataGridStore((s) => s.editing.rowId === row.id && s.editing.commitStatus !== 'idle')
	// Row pinning is derived state; subscribe so the menu re-derives on pin/unpin.
	useDataGridStore((s) => s.rowPinning)

	const hasEditing = Boolean(table.options.editing)
	const hasDeleting = Boolean(table.options.deleting)
	const editingMode = table.options.editing?.mode
	const pinConfig = table.options.pinning
	const isInlineEditing = isEditing && editingMode !== 'modal'

	const buttons = (
		<Renderer
			row={row}
			isEditing={isEditing}
			hasEditing={hasEditing}
			hasDeleting={hasDeleting}
			editingMode={editingMode}
			onEdit={() => {
				table.editing.start(row.id)
			}}
			onDelete={() => {
				table.requestDeleteRow(row.id)
			}}
			onSave={() => table.editing.commit()}
			onCancel={() => {
				table.editing.cancel()
			}}
			isPending={isPending}
		/>
	)

	// Mid-edit: save / cancel only, whatever the variant.
	if (isInlineEditing) return buttons

	const pinItems = pinConfig ? buildPinItems(row, pinConfig) : []
	const variant = table.options.rowActions?.variant ?? RowActionsVariant.Inline

	if (variant === RowActionsVariant.Menu) {
		const items: RowActionItem[] = [
			...(hasEditing
				? [
						{
							id: RowActionId.Edit,
							label: LABELS[RowActionId.Edit],
							onSelect: () => {
								table.editing.start(row.id)
							},
						},
					]
				: []),
			...(hasDeleting
				? [
						{
							id: RowActionId.Delete,
							label: LABELS[RowActionId.Delete],
							danger: true,
							onSelect: () => {
								table.requestDeleteRow(row.id)
							},
						},
					]
				: []),
			...pinItems,
		]
		return (
			<RowActionsMenu
				items={items}
				aria-label='Row actions'
			/>
		)
	}

	return (
		<>
			{buttons}
			{pinItems.length > 0 && (
				<RowActionsMenu
					items={pinItems}
					aria-label='Row pinning'
				/>
			)}
		</>
	)
}
