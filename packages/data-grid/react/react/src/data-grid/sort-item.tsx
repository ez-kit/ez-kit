'use client'

import { createContext, useContext, useMemo } from 'react'

import { resolveReorderMode } from '../utils/reorder-mode'

import { DragAxis, DragSurface, useDndEnabled, useSortableItem } from './dnd'
import { SORT_DRAGGING_ATTR } from './dnd/dragging-attrs'
import { useOptionalDataGridTable } from './table-context'

import type { SortableItemHandle } from './dnd'
import type { ReactNode } from 'react'

/** A ref a kit can put on any element: a callback, so it is assignable to every element's ref. */
type ElementRef = (node: HTMLElement | null) => void

/** The sort-builder row's drag state, as the element form publishes it to the grip inside it. */
export type SortItemDragValue = Pick<SortableItemHandle, 'handleRef' | 'isDragging'>

const SortItemDragContext = createContext<SortItemDragValue | null>(null)

/**
 * The drag state of the sort-builder row this is rendered in, or `null` when the entry cannot be
 * dragged — no adapter, `sorting.multi.reorderable` not resolving to the grip, or no row above.
 *
 * The element form's counterpart of `handleProps`: a grip inside `<DataGrid.SortItem>` reads its
 * activator here, and renders nothing for `null`.
 */
export function useSortItemDrag(): SortItemDragValue | null {
	return useContext(SortItemDragContext)
}

/**
 * What the kit spreads onto **its own** row element in the render-function form.
 *
 * `ref` is present only when the entry takes part in the drag; the slot and the column id are always
 * there, so a stylesheet or a spec addressing `sort-row` finds the row whichever form rendered it.
 * `data-sort-dragging` is present only while this entry is being dragged.
 */
export type SortItemElementProps = {
	ref?: ElementRef
	'data-slot': 'sort-row'
	'data-column-id': string
	'data-sort-dragging'?: 'true'
}

/** What the render-function form of `<DataGrid.SortItem>` hands the kit. */
export type SortItemRenderProps = {
	/** Spread onto the element that renders this entry — the element a drag moves. */
	itemProps: SortItemElementProps
	/**
	 * Spread onto the kit's grip, or `null` when this entry cannot be dragged: no adapter,
	 * `sorting.multi.reorderable` resolving to the step pair or to `false`, or no grid above. `null`
	 * is the whole "is it draggable" answer — render no grip for it.
	 */
	handleProps: { ref: ElementRef } | null
	/** Whether this entry is the one being dragged right now. */
	isDragging: boolean
}

type SortItemBaseProps = {
	/**
	 * The column id of the sort entry this row stands for.
	 *
	 * **Render one of these for every entry of the sort, and each one once** — the obligation
	 * `<DataGrid.VisibilityItem>` states for the column panel, for the same reason: the index an entry
	 * registers is its position in the sort, and a gap or a duplicate in that index space stops the
	 * builder's drag silently. `<DataGrid.SortMenuTrigger>`'s `items` is that list, which is why both
	 * kits simply map it. The rows must also re-render with `items`: the index is read from the sort
	 * on render, so a row memoized past a reorder registers a stale place.
	 */
	sortId: string
}

/** The element form: this component renders the row, and the kit fills it. */
type SortItemElementFormProps = SortItemBaseProps & {
	/** The kit's own class for the row. Passed through, never authored here. */
	className?: string
	children: ReactNode
}

/** The render-function form: the kit renders the row, and this component renders nothing at all. */
type SortItemFunctionFormProps = SortItemBaseProps & {
	className?: never
	children: (props: SortItemRenderProps) => ReactNode
}

export type DataGridSortItemProps = SortItemElementFormProps | SortItemFunctionFormProps

type SortItemChildren = DataGridSortItemProps['children']

/**
 * One row of the sort builder: the element a builder drag moves.
 *
 * The sort builder's counterpart of `<DataGrid.VisibilityItem>`, with the same two forms and the same
 * contract, so a kit renders the grip of both lists with one piece of code. It is a shared component
 * rather than a slot: the decisions — whether the entry takes part, at which index, on which axis —
 * stay in this package, and the kit renders the markup.
 *
 * Its entries drag on {@link DragAxis.Sorting}, an axis of their own because the drop writes
 * `sorting`. The index is the entry's position in the sort — its priority — and that list is dense by
 * construction, since the builder renders every entry.
 *
 * **Participation is decided by which component renders, because a hook cannot be skipped** — the
 * shape `visibility-item.tsx` uses. With no adapter, or a builder whose mode resolved without the
 * grip, this renders {@link SortItemBox} and registers nothing.
 */
export function SortItem({ sortId, className, children }: DataGridSortItemProps) {
	/*
	 * The non-throwing read, for the reason `visibility-item.tsx` gives: a kit's `SortMenu` is a DI
	 * component taking an `items` array, and is renderable — and unit-tested — outside a grid.
	 */
	const table = useOptionalDataGridTable()
	const isDndEnabled = useDndEnabled()

	const index =
		table !== null && resolveReorderMode(table.grid.sortReorder, false, isDndEnabled).drag
			? table.store.state.sorting.findIndex((entry) => entry.id === sortId)
			: -1

	if (index < 0) {
		return (
			<SortItemBox
				className={className}
				sortId={sortId}
			>
				{children}
			</SortItemBox>
		)
	}

	return (
		<SortItemDragShell
			className={className}
			index={index}
			sortId={sortId}
		>
			{children}
		</SortItemDragShell>
	)
}

/** The row as it renders with no drag behind it. */
function SortItemBox({
	sortId,
	className,
	children,
}: {
	sortId: string
	className: string | undefined
	children: SortItemChildren
}) {
	if (typeof children === 'function') {
		return children({
			itemProps: { 'data-slot': 'sort-row', 'data-column-id': sortId },
			handleProps: null,
			isDragging: false,
		})
	}

	return (
		<div
			className={className}
			data-column-id={sortId}
			data-slot='sort-row'
		>
			{children}
		</div>
	)
}

/** The row of a drag-participating entry: owns the sortable and lands its ref on the row. */
function SortItemDragShell({
	sortId,
	index,
	className,
	children,
}: {
	sortId: string
	index: number
	className: string | undefined
	children: SortItemChildren
}) {
	const sortable = useSortableItem({ id: sortId, index, axis: DragAxis.Sorting, surface: DragSurface.Panel })
	// Memoized because the element form publishes it: a fresh object per render would re-render every
	// grip below on every render of the row.
	const drag: SortItemDragValue = useMemo(
		() => ({ handleRef: sortable.handleRef, isDragging: sortable.isDragging }),
		[sortable.handleRef, sortable.isDragging],
	)

	if (typeof children === 'function') {
		return children({
			itemProps: {
				ref: sortable.ref,
				'data-slot': 'sort-row',
				'data-column-id': sortId,
				...(drag.isDragging ? { [SORT_DRAGGING_ATTR]: 'true' as const } : {}),
			},
			handleProps: { ref: drag.handleRef },
			isDragging: drag.isDragging,
		})
	}

	return (
		<div
			ref={sortable.ref}
			className={className}
			data-column-id={sortId}
			data-slot='sort-row'
			{...(drag.isDragging ? { [SORT_DRAGGING_ATTR]: 'true' } : {})}
		>
			<SortItemDragContext.Provider value={drag}>{children}</SortItemDragContext.Provider>
		</div>
	)
}
