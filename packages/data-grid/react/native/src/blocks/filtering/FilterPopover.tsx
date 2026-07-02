import { useState } from 'react'

import type { FilterPopoverProps } from '@ez-kit/data-grid-react'

export function FilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	const [open, setOpen] = useState(false)
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				aria-label='Filter'
				aria-expanded={open}
				onClick={() => {
					setOpen((p) => !p)
				}}
				style={{ opacity: hasActiveFilter ? 1 : 0.5, cursor: 'pointer' }}
			>
				⊟
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						background: 'white',
						border: '1px solid #ccc',
						padding: '8px',
						zIndex: 10,
						minWidth: 200,
					}}
				>
					{children}
				</div>
			)}
		</div>
	)
}
