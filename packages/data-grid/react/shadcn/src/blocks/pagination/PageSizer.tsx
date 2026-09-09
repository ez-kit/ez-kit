'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'

import type { PageSizerProps } from '@ez-kit/data-grid-react'

export function PageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	const messages = useGridMessages()
	return (
		<div
			data-slot='page-sizer'
			className='flex items-center gap-2'
		>
			<span className='text-sm text-muted-foreground whitespace-nowrap'>{messages.pagination.rowsPerPage}</span>
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
		</div>
	)
}
