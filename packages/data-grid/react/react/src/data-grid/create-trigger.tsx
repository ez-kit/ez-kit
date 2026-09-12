import { ACTIONS_COLUMN_ID, CommitStatus, CreatingMode } from '@ez-kit/data-grid-core'
import { type ReactNode } from 'react'

import { useGridComponents } from '../components-context'

import { useDataGridState, useDataGridTable } from './table-context'

export type DataGridCreateTriggerProps = {
	children?: ReactNode
}

/**
 * Button that opens the create form. `children` is its label; omit it for the default `+ Add`.
 *
 * While an inline draft row (`creating.mode: 'row'`) is open in a grid with **no** actions column,
 * this button is replaced by that row's Save / Cancel pair. Those two normally live in the actions cell, but a grid whose
 * only row-level feature is `creating` has no such column and gets none: mounting one on open
 * would take its fixed width off the `1fr` tracks and jump every column, on each open and again
 * on each close. The toolbar is already on screen, so swapping this button's contents reflows
 * nothing — and it sits directly above the draft row. `Enter` and `Escape` do the same from the
 * row itself (see `creating-row.tsx`).
 */
export function CreateTrigger({ children }: DataGridCreateTriggerProps = {}) {
	const table = useDataGridTable()
	const { Button } = useGridComponents().core
	const isOpen = useDataGridState((s) => s.creating.isOpen)
	const commitStatus = useDataGridState((s) => s.creating.commitStatus)

	// `mode: 'modal'` is deliberately excluded: the dialog carries its own Cancel / Save, and the
	// trigger stays a trigger behind it — swapping it would animate a second pair under the
	// overlay while the modal's own pair sits on top of it.
	const isDraftRow = (table.options.creating?.mode ?? CreatingMode.Row) === CreatingMode.Row
	const hasActionsColumn = table.getAllColumns().some((col) => col.id === ACTIONS_COLUMN_ID)

	if (isOpen && isDraftRow && !hasActionsColumn) {
		const isPending = commitStatus !== CommitStatus.Idle
		return (
			<>
				<Button
					data-slot='creating-cancel'
					disabled={isPending}
					onClick={() => {
						table.creating.cancel()
					}}
				>
					{table.grid.messages.form.cancel}
				</Button>
				<Button
					data-slot='creating-save'
					disabled={isPending}
					onClick={() => void table.creating.commit()}
				>
					{table.grid.messages.form.save}
				</Button>
			</>
		)
	}

	return (
		<Button
			data-slot='create-trigger'
			onClick={() => {
				table.creating.start()
			}}
		>
			{children ?? table.grid.messages.creating.trigger}
		</Button>
	)
}
