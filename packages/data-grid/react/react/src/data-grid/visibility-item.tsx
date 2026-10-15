'use client'

import { resolvePanelAffordances } from '../utils/visibility-panel-affordances'
import { getVisibilityPanelColumns } from '../utils/visibility-panel-columns'

import { ColumnDragContext, type ColumnDragValue } from './column-drag'
import { DragAxis, DragSurface, useDndEnabled, useSortableItem } from './dnd'
import { COLUMN_DRAGGING_ATTR } from './dnd/dragging-attrs'
import { useDataGridTable, useOptionalDataGridTable } from './table-context'

import type { ReactNode } from 'react'

/** A ref a kit can put on any element: a callback, so it is assignable to every element's ref. */
type ElementRef = (node: HTMLElement | null) => void

/**
 * What the kit spreads onto **its own** row element in the render-function form.
 *
 * `ref` is present only when the row takes part in the drag; the slot and the column id are always
 * there, so a stylesheet or a spec addressing `column-visibility-item` finds the row whichever form
 * rendered it. `data-column-dragging` is present only while this row is being dragged.
 */
export type VisibilityItemElementProps = {
	ref?: ElementRef
	'data-slot': 'column-visibility-item'
	'data-column-id': string
	'data-column-dragging'?: 'true'
}

/** What the render-function form of `<DataGrid.VisibilityItem>` hands the kit. */
export type VisibilityItemRenderProps = {
	/** Spread onto the element the collection renders for this row — the element a drag moves. */
	itemProps: VisibilityItemElementProps
	/**
	 * Spread onto the kit's grip, or `null` when this row cannot be dragged: no adapter, the panel's
	 * drag switched off, a column whose place the author fixed, or no grid above. `null` is the whole
	 * "is it draggable" answer — render no grip for it.
	 */
	handleProps: { ref: ElementRef } | null
	/** Whether this row is the one being dragged right now. */
	isDragging: boolean
}

type VisibilityItemBaseProps = {
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
}

/** The element form: this component renders the row, and the kit fills it. */
type VisibilityItemElementFormProps = VisibilityItemBaseProps & {
	/** The kit's own class for the row. Passed through, never authored here. */
	className?: string
	children: ReactNode
}

/**
 * The render-function form: the kit renders the row, and this component renders nothing at all.
 *
 * For a kit whose panel is a collection that renders the row element itself — react-aria's
 * `GridList` above all — so a wrapper this component rendered would never sit around the row. The
 * kit's element carries its own class, which is why `className` is refused here rather than ignored.
 */
type VisibilityItemFunctionFormProps = VisibilityItemBaseProps & {
	className?: never
	children: (props: VisibilityItemRenderProps) => ReactNode
}

export type DataGridVisibilityItemProps = VisibilityItemElementFormProps | VisibilityItemFunctionFormProps

type VisibilityItemChildren = DataGridVisibilityItemProps['children']

/**
 * One row of the column visibility panel: the element a panel drag moves.
 *
 * **A kit's `VisibilityMenu` renders this for each row instead of a wrapper of its own**, which is the only
 * way the drag can live in this package rather than in the kits. The panel's list is built by
 * `<DataGrid.VisibilityTrigger>` and *rendered* by the kit's DI component, so the element the
 * sortable's `ref` has to land on is one only the kit puts in the DOM — and a shared component the
 * kit mounts is the seam that keeps every decision (the index space, the participation rule, the
 * scope) on this side of it. The kit keeps its class and its contents.
 *
 * In the element form it renders a plain `div` and carries `data-slot='column-visibility-item'`, the
 * slot both kits authored before this and the one the browser specs address; the render-function
 * form hands the same slot to the kit's own row. A `data-*` attribute is not styling —
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
 *
 * **Two forms, one set of decisions.** With JSX children this renders the row as a `div` and
 * publishes `ColumnDragContext`, so `<DataGrid.ColumnDragHandle />` inside it finds its activator.
 * With a function child it renders nothing and hands the kit {@link VisibilityItemRenderProps}
 * instead: the kit spreads `itemProps` onto the row its collection renders and `handleProps` onto its
 * grip. Both branches below serve both forms, so the index, the participation rule and the lock are
 * never decided twice. The function form publishes no context, and not by oversight: a react-aria
 * collection renders a row's content from the collection root rather than under the element that
 * declared it, so a provider here may never reach the grip — `handleProps` is the activator handed
 * over directly, which leaves the context nothing to do.
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
		return (
			<VisibilityItemBox
				className={className}
				columnId={columnId}
			>
				{children}
			</VisibilityItemBox>
		)
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
function VisibilityItemBox({
	columnId,
	className,
	children,
}: {
	columnId: string
	className: string | undefined
	children: VisibilityItemChildren
}) {
	if (typeof children === 'function') {
		return children({
			itemProps: { 'data-slot': 'column-visibility-item', 'data-column-id': columnId },
			handleProps: null,
			isDragging: false,
		})
	}

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
	children: VisibilityItemChildren
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

	if (typeof children === 'function') {
		return children({
			itemProps: {
				ref: sortable.ref,
				'data-slot': 'column-visibility-item',
				'data-column-id': columnId,
				...(drag?.isDragging ? { [COLUMN_DRAGGING_ATTR]: 'true' as const } : {}),
			},
			handleProps: drag ? { ref: drag.handleRef } : null,
			isDragging: drag?.isDragging ?? false,
		})
	}

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
