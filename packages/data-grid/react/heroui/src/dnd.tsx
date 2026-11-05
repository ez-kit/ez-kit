'use client'

/**
 * Compatibility entry for the optional shared adapter.
 * Install both @dnd-kit/react and @dnd-kit/dom, then opt in at bundle creation:
 *
 * ```tsx
 * import { adapter } from '@ez-kit/data-grid-heroui/dnd'
 * const { DataGrid } = createDataGrid({ components, features, dnd: adapter })
 * ```
 * This file may be removed together with both drag peers when drag is unused.
 */
export {
	adapter,
	AnchorSide,
	dragActivationConstraints,
	hasTravelled,
	toDragAnchor,
	toDragOverEvent,
	toDropEvent,
} from '@ez-kit/data-grid-react/dnd-kit'

export type {
	DragActivationConstraints,
	DragActivationEvent,
	DragActivationSource,
	SortableDragEndEvent,
	SortableDragStartEvent,
	DragAnchor,
	SortableManager,
	DropContext,
	SortableDragOverEvent,
} from '@ez-kit/data-grid-react/dnd-kit'
