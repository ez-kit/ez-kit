import type { ResizerProps } from '@ez-kit/data-grid-react'

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
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				width: '4px',
				height: '100%',
				cursor: 'col-resize',
				userSelect: 'none',
				touchAction: 'none',
			}}
		/>
	)
}
