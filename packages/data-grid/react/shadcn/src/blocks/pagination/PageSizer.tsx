'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'

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
				{/* The `<span>` beside the trigger is text, not a `<label>`, so it names nothing:
				    the trigger's own content is the current page size and axe reports
				    `button-name`. Named from the same key the visible text uses — the heroui
				    kit's Select carries the identical `aria-label`. */}
				<SelectTrigger aria-label={messages.pagination.rowsPerPage}>
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
