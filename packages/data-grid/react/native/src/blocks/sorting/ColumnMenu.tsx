import { useState } from 'react'

import type { ColumnMenuProps } from '@ez-kit/data-grid-react'

export function ColumnMenu({ sections }: ColumnMenuProps) {
	const [open, setOpen] = useState(false)
	const { pin, visibility } = sections

	if (!pin && !visibility) return null

	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
			>
				⋮
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						background: 'white',
						border: '1px solid #ccc',
						zIndex: 10,
						minWidth: 120,
					}}
				>
					{pin?.canPinLeft && (
						<button
							type='button'
							onClick={() => {
								pin.onPinLeft()
								setOpen(false)
							}}
						>
							Pin Left
						</button>
					)}
					{pin?.canPinRight && (
						<button
							type='button'
							onClick={() => {
								pin.onPinRight()
								setOpen(false)
							}}
						>
							Pin Right
						</button>
					)}
					{pin?.isPinned && (
						<button
							type='button'
							onClick={() => {
								pin.onUnpin()
								setOpen(false)
							}}
						>
							Unpin
						</button>
					)}
					{visibility && (
						<button
							type='button'
							onClick={() => {
								visibility.onHide()
								setOpen(false)
							}}
						>
							Hide
						</button>
					)}
				</div>
			)}
		</div>
	)
}
