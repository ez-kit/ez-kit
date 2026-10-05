'use client'

import { useGridComponents } from '../components-context'
import { useGridMessages } from '../use-grid-messages'

import { useDataGridCell } from './composition-context'
import { useRowDrag } from './row-drag-registry'

import type { ReactNode } from 'react'

export type DataGridRowDragHandleProps = {
	/** Optional custom content. When omitted the kit renders its default (icon-only). */
	children?: ReactNode
	/** Accessibility label. Defaults to `messages.ordering.dragRow` when omitted. */
	'aria-label'?: string
	/**
	 * Which row this handle drags. Optional: inside a column's `cell.component` — the ordinary
	 * placement — it is taken from the cell, so nothing has to be passed.
	 *
	 * Name it where there is no cell above: a row's own render function does, which is why the
	 * ready-made `dragHandle` it hands back carries it already.
	 */
	rowId?: string
}

/**
 * Compound member: the grip that starts a row drag.
 *
 * **Renders nothing unless the row it sits in is draggable** — no adapter bound with
 * `createDataGrid({ dnd })`, row ordering off, or a synthetic group row, and there is no handle at
 * all. A control that promises a gesture the grid cannot perform is worse than no control, which
 * is why the check is the adapter's presence rather than anything about the current drag.
 *
 * Place it wherever a row has room: inside a column's `cell.component` is the ordinary way, since
 * a consumer already owns that renderer. The other door is the row's own render function, which
 * hands back the same element ready-made:
 *
 * ```tsx
 * <DataGrid.Row row={row}>{({ dragHandle, content }) => <>{dragHandle}{content}</>}</DataGrid.Row>
 * ```
 *
 * Both are the same handle on the same sortable — the row owns it, and this reads it. The shape
 * mirrors `<DataGrid.HeaderCell>`, which publishes its pieces through render args and a provider
 * alike.
 *
 * The visual is the kit's, through the `core.Button` slot; a drag handle is a button and needed no
 * slot of its own.
 */
/**
 * This cell's row id, or `undefined` when the handle was not rendered in a cell. `useDataGridCell`
 * throws outside one, which is right for a component that needs a cell and wrong here — a handle
 * placed by a row's render function is legitimately outside.
 */
function useOptionalCellRowId(): string | undefined {
	try {
		return useDataGridCell().cell.row.id
	} catch {
		return undefined
	}
}

export function RowDragHandle({ children, 'aria-label': ariaLabel, rowId }: DataGridRowDragHandleProps = {}) {
	/*
	 * The cell is the fallback rather than the row, and that is not a preference: in the HeroUI kit
	 * a cell renderer sits outside the row's React subtree, so a row-level context is unreachable
	 * from it. The cell's own context is not — see `row-drag-registry.tsx`.
	 */
	const cell = useOptionalCellRowId()
	const drag = useRowDrag(rowId ?? cell)
	const { Button } = useGridComponents().core
	const messages = useGridMessages()

	if (!drag) return null

	/*
	 * `aria-roledescription` comes from the catalogue, because the drag library writes `"draggable"`
	 * there otherwise — in English whatever the app's locale. `@dnd-kit/dom@0.1.21`'s `Accessibility`
	 * plugin sets the attribute **only when it is absent**, so ours is what a reader hears wherever it
	 * reaches the DOM.
	 *
	 * It does not reach the DOM in every kit, and that is accepted rather than worked around: shadcn's
	 * `Button` spreads the caller's props last, so the attribute lands, while HeroUI's forwards to a
	 * React Aria button that drops it — measured, and pinned by that kit's own test. There the plugin's
	 * value stays, which is the same word in English and the honest outcome of a kit not forwarding it.
	 */
	return (
		<Button
			ref={drag.handleRef}
			type='button'
			data-slot='row-drag-handle'
			aria-label={ariaLabel ?? messages.ordering.dragRow}
			aria-roledescription={messages.ordering.draggable}
		>
			{children}
		</Button>
	)
}
