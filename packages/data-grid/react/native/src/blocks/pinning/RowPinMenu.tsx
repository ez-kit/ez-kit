import type { RowPinMenuProps } from '@ez-kit/data-grid-react'

export function RowPinMenu({ isPinned, canPinTop, canPinBottom, onPinTop, onPinBottom, onUnpin }: RowPinMenuProps) {
	if (isPinned) {
		return (
			<button
				type='button'
				onClick={onUnpin}
			>
				Unpin
			</button>
		)
	}
	return (
		<>
			{canPinTop && (
				<button
					type='button'
					onClick={onPinTop}
				>
					Pin Top
				</button>
			)}
			{canPinBottom && (
				<button
					type='button'
					onClick={onPinBottom}
				>
					Pin Bottom
				</button>
			)}
		</>
	)
}
