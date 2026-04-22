'use client'

import { ListFilter } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'

import type { FilterPopoverProps } from '@ez-kit/data-grid-react'

export function FilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className={`h-6 w-6${hasActiveFilter ? '' : ' opacity-40'}`}
				>
					<ListFilter className={`h-3 w-3${hasActiveFilter ? ' text-primary' : ''}`} />
					<span className='sr-only'>Filter</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='start'
				className='w-64 p-3'
			>
				<div className='flex flex-col gap-2'>{children}</div>
			</PopoverContent>
		</Popover>
	)
}
