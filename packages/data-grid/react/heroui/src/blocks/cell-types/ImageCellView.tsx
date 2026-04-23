'use client'

import type { CellViewProps, ImageCellConfig } from '@ez-kit/data-grid-react'

export function ImageCellView({ value, cellConfig }: CellViewProps) {
	const config = cellConfig as ImageCellConfig | undefined
	const src = String(value ?? '')

	if (!src) return null

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center' }}>
			<img
				src={src}
				alt={config?.alt ?? ''}
				width={config?.width}
				height={config?.height}
			/>
		</span>
	)
}
