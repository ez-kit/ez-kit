import type { ResizerProps } from '@ez-kit/data-grid-react'

/**
 * Shadcn-styled column resize handle.
 * - 2px wide, primary color, full height, rounded edges.
 * - Always visible when the column is resizable.
 */
export function Resizer({ onMouseDown, onTouchStart, onDoubleClick }: ResizerProps) {
	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<div
			data-slot='column-resizer'
			role='separator'
			aria-label='Resize column'
			aria-orientation='vertical'
			onMouseDown={onMouseDown}
			onTouchStart={onTouchStart}
			onDoubleClick={onDoubleClick}
			className='absolute inset-y-0 right-0 w-[2px] cursor-col-resize touch-none select-none rounded-full bg-primary'
		/>
	)
}
