'use client'

import { createContext, useContext } from 'react'

import { useGridComponents } from '../components-context'

import { DragAxis, useSortableItem } from './dnd'

import type { SortableItemHandle } from './dnd'
import type { ThProps } from '../types'
import type { ReactNode } from 'react'

/** The drag half of one header cell: its activator ref, and whether it is the column being dragged. */
export type ColumnDragValue = Pick<SortableItemHandle, 'handleRef' | 'isDragging'>

/**
 * `ThProps` plus the structural `data-*` attributes a header cell writes.
 *
 * The index signature is needed because JSX admits arbitrary `data-*` attributes through a rule of
 * its own, while an object literal checked against `ThProps` does not — and a header cell now hands
 * its `<th>` props over as a value rather than writing them inline.
 */
export type HeaderThProps = ThProps & { [key: `data-${string}`]: string | undefined }

/**
 * Declared again rather than sharing `RowDragValue`: the two are the same shape today and are two
 * different published types, so folding them together would rename one of them. They may also
 * diverge — a column has a resizer beside its handle and a row does not.
 */
const ColumnDragContext = createContext<ColumnDragValue | null>(null)

/**
 * The drag state of the header cell this is rendered in — `null` when the column cannot be dragged,
 * or when there is no header cell above.
 *
 * The public read for `isDragging` on the column axis. It exists because the sortable lives in
 * {@link ColumnDragShell} rather than in `DataGridHeaderCell`, so the cell's render arguments cannot
 * carry the boolean the way a row's do; see that component's docblock for why. The `<th>` carries
 * `data-column-dragging` for anything CSS can answer, which is most of it.
 */
export function useColumnDrag(): ColumnDragValue | null {
	return useContext(ColumnDragContext)
}

export type ColumnDragShellProps = {
	/** The leaf column this header cell belongs to. The id the core drop helpers take. */
	columnId: string
	/**
	 * This column's position in the **visual** leaf order — `getVisualLeafColumns(table)`, never
	 * `getVisibleLeafColumns()`, and never a position within a rendered window.
	 *
	 * Must be dense across the axis: see the density note on the component below.
	 */
	index: number
	/** Whether this column may be picked up. A disabled item still occupies its index. */
	disabled: boolean
	/** Everything the header cell resolved for its `<th>` — attributes, style, class, `colSpan`. */
	thProps: HeaderThProps
	children: ReactNode
}

/**
 * The `<th>` of one **drag-participating** header cell: it owns the column's sortable, lands the
 * sortable's ref on the element that moves, stamps the dragging state, and publishes the activator
 * ref to whatever renders a handle inside it.
 *
 * **Why the sortable is not in `DataGridHeaderCell`, unlike the row's, which is in `DataGridRow`.**
 * A row is one component per row, so its hook can sit in it. A header cell is one component for
 * three different kinds of header — a leaf, a column group, and a placeholder standing in for a
 * leaf that renders in another row — and **only the leaf may register**. A hook cannot be skipped,
 * so participation has to be a decision about which *component* renders, which is what this shell
 * is. `DataGridHeaderCell` picks this or a bare `Th`.
 *
 * **The density requirement, which is the reason any of this is careful.** Measured in
 * `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin`: it sorts each group's registered sortables by
 * index and then asserts the i-th has `index === i`. One gap or one duplicate and the plugin
 * returns early — which costs the visual displacement **and the commit**, because `sortable.index`
 * is then never updated and the adapter's `toDropEvent` sees `index === initialIndex` and refuses.
 * The failure is silent: the handle works, the pointer moves, nothing happens. So every visible
 * leaf column registers exactly once, including the ones that cannot move — a system column and a
 * `ordering: false` column arrive here `disabled`, not absent.
 *
 * The corollary is a limitation nothing can detect from inside a cell: **a custom
 * `<DataGrid.Header>` that renders header cells for only some columns breaks the density**, and
 * with it the drag, for the whole grid. Render them all, or none.
 *
 * `disabled` carries only what is knowable here — the axis' `ordering` being off, a system column,
 * `column.ordering === false`, and no adapter at all. Every other refusal (a pin band, a header
 * group, the target's own lock) is `dropColumn`'s business and is applied on release. That split is
 * the PRD's boundary model.
 *
 * The attribute is `data-column-dragging`, matching `data-row-dragging` and the `data-column-*`
 * namespace `data-column-id` already established. **Not** because React Aria's `Column` would
 * overwrite `data-dragging` — measured, it would not: the seven it writes after spreading are
 * `data-hovered`, `data-pressed`, `data-focused`, `data-focus-visible`, `data-resizing`,
 * `data-allows-sorting` and `data-sort-direction`. The row's rename *was* a collision fix; this one
 * is consistency, and saying otherwise would be inventing a reason.
 *
 * No `mergeRefs` here, unlike the row: nothing else in this package holds the `<th>`'s ref — the
 * pinning measurement that forced the row's merge is on the `<tr>`. A later phase that gives the
 * `<th>` a second consumer has to memoise the merge, for the reason `mergeRefs` records.
 */
export function ColumnDragShell({ columnId, index, disabled, thProps, children }: ColumnDragShellProps) {
	const { Th } = useGridComponents().core
	const sortable = useSortableItem({ id: columnId, index, axis: DragAxis.Column, disabled })
	/*
	 * Everything downstream reads `drag`, never `sortable` directly — including the attribute. A
	 * column that cannot be picked up cannot be dragging, whatever an adapter reports for an item it
	 * was handed as `disabled`. Reading the raw hook for the attribute is the phase-4 defect that
	 * stamped it on every row of a grid with ordering off.
	 */
	const drag: ColumnDragValue | null = disabled
		? null
		: { handleRef: sortable.handleRef, isDragging: sortable.isDragging }

	return (
		<Th
			{...thProps}
			ref={sortable.ref}
			{...(drag?.isDragging ? { 'data-column-dragging': 'true' } : {})}
		>
			<ColumnDragContext.Provider value={drag}>{children}</ColumnDragContext.Provider>
		</Th>
	)
}
