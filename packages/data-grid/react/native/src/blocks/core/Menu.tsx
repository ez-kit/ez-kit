import { useState } from 'react'

import type { GridMenuProps } from '@ez-kit/data-grid-react'

/**
 * The grid's overflow menu — column header options and row actions both render through here.
 * This kit ships no popover primitive, so it is a plain toggle over a positioned div.
 */
export function Menu({ sections, 'aria-label': ariaLabel }: GridMenuProps) {
	const [open, setOpen] = useState(false)

	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				aria-label={ariaLabel}
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
					{sections.flatMap((section) =>
						section.items.map((item) => (
							<button
								key={item.id}
								type='button'
								disabled={item.disabled ?? false}
								onClick={() => {
									item.onSelect()
									setOpen(false)
								}}
							>
								{item.label}
							</button>
						)),
					)}
				</div>
			)}
		</div>
	)
}
