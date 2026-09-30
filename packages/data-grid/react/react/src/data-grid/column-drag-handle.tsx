'use client'

import { useGridComponents } from '../components-context'
import { useGridMessages } from '../use-grid-messages'

import { useColumnDrag } from './column-drag'

import type { ReactNode } from 'react'

export type DataGridColumnDragHandleProps = {
	/** Optional custom content. When omitted the kit renders its default (icon-only). */
	children?: ReactNode
	/** Accessibility label. Defaults to `messages.ordering.dragColumn` when omitted. */
	'aria-label'?: string
}

/**
 * Compound member: the grip that starts a column drag.
 *
 * **Renders nothing unless the header cell it sits in is draggable** — no adapter bound with
 * `createDataGrid({ dnd })`, column ordering off, a system column, `column.ordering === false`, or a
 * header that is not a leaf. A control that promises a gesture the grid cannot perform is worse than
 * no control, which is why the check is the adapter's presence rather than anything about the
 * current drag.
 *
 * **It takes no `columnId`, unlike `<DataGrid.RowDragHandle />`, and that asymmetry is measured.**
 * The row's handle needs an id because a column's `cell.component` renders *outside* the row's React
 * subtree in the HeroUI kit — React Aria's collection puts each cell in its own node — so a
 * row-level context is unreachable from it. A header cell's body is not: there the provider and the
 * content are children of one `Column` node, verified by probe in that kit. So the shell's context
 * is always directly above this component and there is nothing to look up.
 *
 * Place it from either door, exactly as the row's handle has two:
 *
 * ```tsx
 * <DataGrid.HeaderCell header={header}>
 *   {({ dragHandle, sortTrigger, menu }) => (
 *     <DataGrid.HeaderMain>{dragHandle}{sortTrigger}{menu}</DataGrid.HeaderMain>
 *   )}
 * </DataGrid.HeaderCell>
 * ```
 *
 * …or this component inside a header cell body that reads `useDataGridHeaderCell()`. Both are the
 * same handle on the same sortable — the shell owns it, and this reads it.
 *
 * **Not inside `column.header`.** That content renders within the `sort-trigger` `<button>`, and a
 * nested button is invalid HTML — the parser closes the outer one and the header comes apart. A
 * header that needs a control beside the label composes `<DataGrid.HeaderCell>` and places `label`
 * outside `sortTrigger`, which is the same rule `sortTrigger`'s docblock already states.
 *
 * The visual is the kit's, through the `core.Button` slot; a drag handle is a button and needed no
 * slot of its own.
 */
export function ColumnDragHandle({ children, 'aria-label': ariaLabel }: DataGridColumnDragHandleProps = {}) {
	const drag = useColumnDrag()
	const { Button } = useGridComponents().core
	const messages = useGridMessages()

	if (!drag) return null

	return (
		<Button
			ref={drag.handleRef}
			type='button'
			data-slot='column-drag-handle'
			aria-label={ariaLabel ?? messages.ordering.dragColumn}
		>
			{children}
		</Button>
	)
}
