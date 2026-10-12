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
 * **Renders nothing unless the column surface it sits in is draggable.** A control that promises a
 * gesture the grid cannot perform is worse than no control, which is why the check is whether a
 * sortable was published above it rather than anything about the current drag.
 *
 * It serves **both** surfaces of the column axis, and the conditions differ between them:
 *
 * - In a **header cell**: no adapter bound with `createDataGrid({ dnd })`, column ordering off, a
 *   system column, `column.ordering === false`, or a header that is not a leaf.
 * - In a **column-panel row** (`<DataGrid.VisibilityItem>`): no adapter, `ordering.column.visibilityMenu`
 *   off — which is what turns the Columns toggle into a panel at all — or `column.ordering === false`.
 *   There is no leaf condition here, and a *hidden* column does get a grip: listing hidden columns so
 *   they can be reordered is the panel's whole reason to exist.
 *
 * **It takes no `columnId`, unlike `<DataGrid.RowDragHandle />`, and that asymmetry is measured.**
 * The row's handle needs an id because a column's `cell.component` renders *outside* the row's React
 * subtree in the HeroUI kit — React Aria's collection puts each cell in its own node — so a
 * row-level context is unreachable from it. A header cell's body is not: there the provider and the
 * content are children of one `Column` node, verified by probe in that kit. So the shell's context
 * is always directly above this component and there is nothing to look up.
 *
 * Note the scope of that probe: it was run for a header cell inside one React Aria `Column` node. The
 * panel row is a third door and a different arrangement — a `div` inside a portalled popover — and it
 * needs no id for a plainer reason: the shell that publishes the context *is* the row element, so the
 * context is again directly above. What was measured for the panel is the drag working end to end in
 * both kits, which is `column-panel-drag.spec.ts`, not a context probe.
 *
 * Place it from any of three doors:
 *
 * ```tsx
 * <DataGrid.HeaderCell header={header}>
 *   {({ dragHandle, sortTrigger, menu }) => (
 *     <DataGrid.HeaderMain>{dragHandle}{sortTrigger}{menu}</DataGrid.HeaderMain>
 *   )}
 * </DataGrid.HeaderCell>
 * ```
 *
 * …or this component inside a header cell body that reads `useDataGridHeaderCell()`; or inside a
 * `<DataGrid.VisibilityItem>`, which is how both kits' `VisibilityMenu` place it and the door a kit
 * writing its own column panel uses. All three are the same handle on the same sortable — a shell
 * owns it, and this reads it.
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
	const components = useGridComponents()
	const messages = useGridMessages()

	if (!drag) return null

	/*
	 * Destructured **after** the early return rather than beside the hook reads above it.
	 *
	 * This is no longer load-bearing and the comment says so rather than claiming a hazard it fixed.
	 * When it was written, `useGridComponents()` outside a grid returned `{} as FullGridComponents`, so
	 * `.core` was `undefined` and this line threw `Cannot destructure property 'Button' of undefined`
	 * before the `null` above could be reached — which is how a kit's own standalone `VisibilityMenu`
	 * test found it. `components-context.tsx` now hands back one empty object per group, so the
	 * destructure is safe wherever it sits.
	 *
	 * It stays below the return because that is the honest order for a component whose first decision
	 * is whether it renders at all, and because `visibility-item.test.tsx` pins the behaviour either
	 * way: rendered with no drag surface above it, this component produces nothing.
	 */
	const { Button } = components.core

	// `aria-roledescription` comes from the catalogue, for the reasons `row-drag-handle.tsx` states in
	// full: the drag library writes English `"draggable"` there when the attribute is absent, and one
	// of the two kits drops it on the way to the DOM.
	return (
		<Button
			ref={drag.handleRef}
			type='button'
			data-slot='column-drag-handle'
			aria-label={ariaLabel ?? messages.ordering.dragColumn}
			aria-roledescription={messages.ordering.draggable}
		>
			{children}
		</Button>
	)
}
