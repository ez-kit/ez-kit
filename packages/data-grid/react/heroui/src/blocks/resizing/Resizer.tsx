import type { ResizerProps } from '@ez-kit/data-grid-react'

export function Resizer({ onMouseDown, onTouchStart, onDoubleClick, isResizing }: ResizerProps) {
	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<div
			data-slot='column-resizer'
			role='separator'
			aria-label='Resize column'
			aria-orientation='vertical'
			data-resizing={isResizing ? 'true' : undefined}
			onMouseDown={onMouseDown}
			onTouchStart={onTouchStart}
			onDoubleClick={onDoubleClick}
			className='absolute top-0 right-0 w-4 h-full cursor-col-resize select-none touch-action-none py-2'
		/>
	)
}
