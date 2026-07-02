import { useState } from 'react'

import type { ColumnVisibilityMenuProps } from '@ez-kit/data-grid-react'

export function ColumnVisibilityMenu({ columns }: ColumnVisibilityMenuProps) {
	const [open, setOpen] = useState(false)
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
			>
				Columns
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						right: 0,
						background: 'white',
						border: '1px solid #ccc',
						zIndex: 10,
						minWidth: 160,
						padding: '4px 0',
					}}
				>
					{columns.map((col) => (
						<label
							key={col.id}
							style={{ display: 'flex', gap: 8, padding: '4px 12px', cursor: 'pointer' }}
						>
							<input
								type='checkbox'
								checked={col.isVisible}
								onChange={col.onToggle}
							/>
							{col.label}
						</label>
					))}
				</div>
			)}
		</div>
	)
}
