'use client'

import { DataGridColumnDragHandle } from '@ez-kit/data-grid-react'
import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button } from '@heroui/react'
import { GripVertical } from 'lucide-react'

import type { DataGridColumnDragHandleProps, VisibilityItemRenderProps } from '@ez-kit/data-grid-react'

/**
 * This kit's column drag handle: the shared control, wearing this kit's glyph.
 *
 * The shared `<DataGrid.ColumnDragHandle />` renders a `core.Button` and whatever children it is
 * given — it authors no visual, as nothing in `@ez-kit/data-grid-react` may. A grip is a visual, so
 * it lives here, in a `blocks/` adapter, exactly as the column resizer's `cursor-col-resize` does
 * rather than sitting in a stylesheet or in the shared package.
 *
 * `GripVertical`, the same glyph as the row handle: the grip sits before a header's label and in a
 * panel row, and one glyph reads as "drag this" on every surface of both axes.
 *
 * The cursor is on the element rather than in `styles.css` for the same reason and by the same
 * precedent. `touch-none` is not decoration: without it a touch drag scrolls the page instead of
 * moving the column.
 */
export function ColumnDragHandle({ children, ...props }: DataGridColumnDragHandleProps) {
	return <DataGridColumnDragHandle {...props}>{children ?? <GripGlyph />}</DataGridColumnDragHandle>
}

/** The grip glyph both column handles draw. */
function GripGlyph() {
	return (
		<GripVertical
			aria-hidden='true'
			className='size-4 cursor-grab touch-none select-none active:cursor-grabbing'
		/>
	)
}

/**
 * The column panel's grip, for a row rendered through `<DataGridVisibilityItem>`'s render function.
 *
 * That form hands the activator over as `handleProps` instead of publishing it to a context, because
 * the panel is a react-aria collection and a context around a row need not reach the row's content —
 * so {@link ColumnDragHandle}, which reads the context, has nothing to read there. This is the same
 * control wired directly: the same HeroUI button, the same `column-drag-handle` slot the stylesheet
 * and the browser specs address, the same role description and the same glyph.
 */
export function ColumnGrip({ handleRef, 'aria-label': ariaLabel }: { handleRef: ColumnGripRef; 'aria-label': string }) {
	const messages = useGridMessages()

	return (
		<Button
			ref={handleRef}
			aria-label={ariaLabel}
			aria-roledescription={messages.ordering.draggable}
			data-slot='column-drag-handle'
		>
			<GripGlyph />
		</Button>
	)
}

type ColumnGripRef = NonNullable<VisibilityItemRenderProps['handleProps']>['ref']
