'use client'

import { resolvePanelAffordances } from '../utils/visibility-panel-affordances'
import { getVisibilityPanelColumns } from '../utils/visibility-panel-columns'

import { ColumnDragContext, type ColumnDragValue } from './column-drag'
import { DragAxis, DragSurface, useDndEnabled, useSortableItem } from './dnd'
import { useDataGridTable, useOptionalDataGridTable } from './table-context'

import type { ReactNode } from 'react'

export type DataGridVisibilityItemProps = {
	/**
	 * The leaf column this row of the panel stands for.
	 *
	 * **Render one of these for every column the panel lists, and each one once.** That is an
	 * obligation on the caller, not a suggestion, and the penalty for breaking it is silent: the
	 * index a row registers is its position in the panel's own list, so a panel that renders a
	 * *subset* — a search box filtering the rows, a collapsed section, hidden columns kept in a group
	 * that is folded away — leaves gaps in the drag's index space, and gaps kill panel dragging
	 * entirely. No displacement, no commit, no error. A duplicated `columnId` does the same.
	 *
	 * The list is `<DataGrid.VisibilityTrigger>`'s `columns`, which is why both kits simply map it. A
	 * panel that needs to show less than all of it can filter what each row *renders* — it cannot
	 * filter the rows themselves while the drag is on.
	 */
	columnId: string
	/** The kit's own class for the row. Passed through, never authored here. */
	className?: string
	children: ReactNode
}

/**
 * One row of the column visibility panel: the element a panel drag moves.
 *
 * **A kit's `VisibilityMenu` renders this instead of its own wrapper element**, which is the only
 * way the drag can live in this package rather than in the kits. The panel's list is built by
 * `<DataGrid.VisibilityTrigger>` and *rendered* by the kit's DI component, so the element the
 * sortable's `ref` has to land on is one only the kit puts in the DOM — and a shared component the
 * kit mounts is the seam that keeps every decision (the index space, the participation rule, the
 * scope) on this side of it. The kit keeps its class and its contents.
 *
 * It renders a plain `div` and carries `data-slot='column-visibility-item'`, the slot both kits
 * authored before this and the one the browser specs address. A `data-*` attribute is not styling —
 * see the rule AGENTS.md states for this package — and `className` is passed through exactly as
 * `column.headerClassName` is.
 *
 * **Why a panel item is a different index space from a header cell, and not a different axis.** Both
 * write `columnOrder`, so both are `DragAxis.Column`; what differs is the list an index counts in.
 * The header registers the *visible* leaves in visual (pin-banded) order; the panel registers what
 * `getVisibilityPanelColumns` lists, which is the `columnOrder` order with the hidden columns left
 * in. Those two runs cannot share one dense `0..n-1` space, and density is what the drag library requires — so the two
 * are told apart by {@link DragSurface}, and a drop from here commits under `ColumnMoveScope.All`.
 * `dnd/types.ts` has the measurement and `DragSurface` the reasoning; this is the surface that made
 * the field necessary.
 *
 * **Participation is decided by which component renders, because a hook cannot be skipped** — the
 * same shape `header-cell.tsx` uses for `ColumnDragShell`. A grid with no adapter, with the column
 * panel switched off, or with its drag switched off in favour of the move pair
 * (`visibilityMenu: { drag: false }`), renders {@link VisibilityItemBox} and registers nothing, so
 * it pays neither the list scan nor a sortable. A column the author locked (`ordering: false`)
 * *does* register, `disabled`, because leaving it out would put a gap in the index space.
 */
export function VisibilityItem({ columnId, className, children }: DataGridVisibilityItemProps) {
	/*
	 * The **non-throwing** table read, unlike everything else in this folder. A kit's
	 * `VisibilityMenu` is a DI component taking a `columns` array, so it is renderable — and in both
	 * kits unit-tested — outside a grid; this row then has no drag to register and falls back to the
	 * plain markup it replaced. `useOptionalDataGridTable`'s docblock records why that is the whole
	 * exception rather than an escape hatch.
	 */
	const table = useOptionalDataGridTable()
	const isDndEnabled = useDndEnabled()

	/*
	 * Gated on the adapter first, for the reason `header-cell.tsx` gates its own lookup: the scan is
	 * `O(n)` per row and therefore `O(n²)` per open panel in leaf columns, so the gate **confines**
	 * that cost to a grid that has a drag adapter *and* a panel offering moves — it does not remove
	 * it. Fine at any column count a panel is readable at; worth knowing before someone puts a
	 * hundred columns in one.
	 */
	const index =
		table !== null && isDndEnabled && resolvePanelAffordances(table.grid.ordering.visibilityMenu, isDndEnabled).drag
			? getVisibilityPanelColumns(table).findIndex((column) => column.id === columnId)
			: -1

	if (index < 0) {
		return <VisibilityItemBox className={className}>{children}</VisibilityItemBox>
	}

	return (
		<VisibilityItemDragShell
			className={className}
			columnId={columnId}
			index={index}
		>
			{children}
		</VisibilityItemDragShell>
	)
}

/** The row as it renders with no drag behind it — the markup both kits shipped before this phase. */
function VisibilityItemBox({ className, children }: { className: string | undefined; children: ReactNode }) {
	return (
		<div
			className={className}
			data-slot='column-visibility-item'
		>
			{children}
		</div>
	)
}

/**
 * The row of a **drag-participating** panel item: owns the sortable, lands its ref on the element
 * that moves, stamps the dragging state and publishes the activator to whatever renders a handle.
 *
 * Publishes `ColumnDragContext` — the same context a header cell's shell publishes — so
 * `<DataGrid.ColumnDragHandle />` is one component serving both surfaces of the axis. The handle
 * asks "is the column I am in draggable, and where is its activator", which is a question neither
 * surface answers differently.
 */
function VisibilityItemDragShell({
	columnId,
	index,
	className,
	children,
}: {
	columnId: string
	index: number
	className: string | undefined
	children: ReactNode
}) {
	const table = useDataGridTable()

	/*
	 * No state subscription here, deliberately. An earlier revision read `columnOrder` with the
	 * comment "the list *is* the order, so a committed reorder has to re-render the row it moved" —
	 * which is true of the *list* and false about this component: the index arrives as a prop, and
	 * `<DataGrid.VisibilityTrigger>` already subscribes to `columnOrder`, `columnVisibility` and
	 * `columnPinning` and rebuilds its `columns` array, so every row re-renders on a commit whatever
	 * this one does. The subscription was redundant and its comment credited it with the trigger's
	 * job.
	 */
	/*
	 * `disabled` carries only what is knowable about this column on its own — the author locking its
	 * place. Everything else a drop can be refused for (the pin band, the header group, the target's
	 * own lock) is `dropColumn`'s business under `ColumnMoveScope.All`, applied through `canDrop`
	 * while the drag is in flight and again at the commit. That split is the PRD's boundary model.
	 */
	const disabled = table.getColumn(columnId)?.columnDef.meta?.ordering === false
	const sortable = useSortableItem({
		id: columnId,
		index,
		axis: DragAxis.Column,
		surface: DragSurface.Panel,
		disabled,
	})

	/*
	 * Everything downstream reads `drag`, never `sortable` directly — including the attribute. A
	 * column that cannot be picked up cannot be dragging, whatever an adapter reports for an item it
	 * was handed as `disabled`; reading the raw hook for the attribute is the phase-4 defect that
	 * stamped it on every row of a grid with ordering off.
	 */
	const drag: ColumnDragValue | null = disabled
		? null
		: { handleRef: sortable.handleRef, isDragging: sortable.isDragging }

	return (
		<div
			ref={sortable.ref}
			className={className}
			data-column-id={columnId}
			data-slot='column-visibility-item'
			{...(drag?.isDragging ? { 'data-column-dragging': 'true' } : {})}
		>
			<ColumnDragContext.Provider value={drag}>{children}</ColumnDragContext.Provider>
		</div>
	)
}
