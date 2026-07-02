import type { PageSizerProps } from '@ez-kit/data-grid-react'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<select
			value={pageSize}
			onChange={(e) => {
				onPageSizeChange(Number(e.target.value))
			}}
		>
			{items.map((size) => (
				<option
					key={size}
					value={size}
				>
					{size}
				</option>
			))}
		</select>
	)
}
