'use client'

import { Columns2 } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Checkbox } from '@grid-shadcn/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@grid-shadcn/components/ui/popover'

import type { VisibilityMenuProps } from '@ez-kit/data-grid-react'

export function VisibilityMenu({ columns }: VisibilityMenuProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-8 gap-1.5'
				>
					<Columns2 className='h-4 w-4' />
					Columns
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='end'
				className='w-48 p-2'
			>
				<div className='space-y-1'>
					{columns.map((col) => (
						<label
							key={col.id}
							className='flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted'
							htmlFor={`col-vis-${col.id}`}
						>
							<Checkbox
								id={`col-vis-${col.id}`}
								checked={col.isVisible}
								onCheckedChange={() => {
									col.onToggle()
								}}
							/>
							{col.label}
						</label>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}
