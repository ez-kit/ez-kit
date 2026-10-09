/**
 * Which side of the target the held item has been displaced to.
 *
 * Named members for internal reference; the field is typed as the plain string union.
 */
export const DragPlacement = {
	/** Immediately in front of the target — where an item dragged upwards over it lands. */
	Before: 'before',
	/** Immediately behind the target — where an item dragged downwards over it lands. */
	After: 'after',
} as const

export type DragPlacement = (typeof DragPlacement)[keyof typeof DragPlacement]

/**
 * Where a drag in flight has **displaced** the held item to: next to `targetId`, on `placement`'s side.
 *
 * Drag-local and never committed. The commit is still the drop, by id, through `dropRow`; this only
 * describes the arrangement the drag library is showing while the pointer is down, so that a body which
 * re-renders mid-gesture can render that arrangement instead of the model's.
 *
 * Expressed relative to a neighbour rather than as an index, for the reason the drag port carries no
 * index anywhere: a position means something only while the list it counts in holds still, and the
 * list a virtualized body renders is the thing that turns over during a drag. A neighbour's id survives
 * that — and survives rows being appended underneath, which an infinite loader may do mid-gesture.
 */
export type DragProjection = {
	/** The item being held. */
	sourceId: string
	/** The item it was last displaced past. */
	targetId: string
	placement: DragPlacement
}

/**
 * The order with the held item moved to where the drag has displaced it, or `items` itself when there
 * is nothing to project — no drag, or a source or target the order does not hold (a row filtered away
 * mid-gesture). Returning the same array is what lets a caller skip any work for the common case.
 *
 * Generic over the item so a body can project its `Row`s directly, and the projection costs one copy of
 * the list rather than a map back from ids.
 */
export function projectDragOrder<T>(
	items: readonly T[],
	idOf: (item: T) => string,
	projection: DragProjection | null,
): readonly T[] {
	if (projection === null) return items
	const sourceIndex = items.findIndex((item) => idOf(item) === projection.sourceId)
	if (sourceIndex < 0) return items
	const source = items[sourceIndex] as T
	const rest = [...items.slice(0, sourceIndex), ...items.slice(sourceIndex + 1)]
	const targetIndex = rest.findIndex((item) => idOf(item) === projection.targetId)
	if (targetIndex < 0) return items
	const insertAt = projection.placement === DragPlacement.After ? targetIndex + 1 : targetIndex

	return [...rest.slice(0, insertAt), source, ...rest.slice(insertAt)]
}

/**
 * The projection after the held item has been displaced onto `targetId` — the same step the drag
 * library takes, so the two arrive at the same arrangement.
 *
 * `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin` displaces with an `arrayMove(source, target)` over
 * the group **as it currently stands**: an item above its target lands behind it, an item below it
 * lands in front of it (`sortable.js`, `move` / `arrayMove`). Which side is decided by the current
 * arrangement, not by the model — so this is a step from `previous`, not a function of the model alone.
 * Carried two rows down and then hovered back one, the item goes *in front of* that row, where a
 * reading of the model would put it behind.
 *
 * `previous` for a different source is ignored: a new drag starts from the model. A self-hover, or an
 * id the order does not hold, leaves the projection as it was — neither is a displacement.
 */
export function advanceDragProjection(
	ids: readonly string[],
	previous: DragProjection | null,
	sourceId: string,
	targetId: string,
): DragProjection | null {
	if (sourceId === targetId) return previous
	const current = projectDragOrder(ids, identity, previous?.sourceId === sourceId ? previous : null)
	const sourceIndex = current.indexOf(sourceId)
	const targetIndex = current.indexOf(targetId)
	if (sourceIndex < 0 || targetIndex < 0) return previous

	return {
		sourceId,
		targetId,
		placement: sourceIndex < targetIndex ? DragPlacement.After : DragPlacement.Before,
	}
}

function identity(id: string): string {
	return id
}
