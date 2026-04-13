import type { PageSizerProps } from '@ez-kit/data-grid-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<Select
			value={String(pageSize)}
			onValueChange={(v) => {
				onPageSizeChange(Number(v))
			}}
		>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((size) => (
					<SelectItem
						key={size}
						value={String(size)}
					>
						{size}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
