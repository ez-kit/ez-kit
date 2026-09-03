'use client'

import { GridMenuVariant } from '@ez-kit/data-grid-react'
import { EllipsisVertical, MoreHorizontal } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@grid-shadcn/components/ui/dropdown-menu'

import { renderGridMenuIcon } from '../icons'

import type { GridMenuProps } from '@ez-kit/data-grid-react'

/**
 * The grid's overflow menu — column header options and row actions both render through here.
 * Only the trigger differs between the two, so `variant` is the only thing that branches.
 */
export function Menu({ variant, sections, 'aria-label': ariaLabel }: GridMenuProps) {
	const isColumn = variant === GridMenuVariant.Column

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{/* Row variant matches the edit / delete buttons so the three line up. */}
				<Button
					variant='ghost'
					size='icon'
					{...(isColumn ? { className: 'h-5 w-5' } : {})}
				>
					{isColumn ? <EllipsisVertical className='h-3 w-3' /> : <MoreHorizontal />}
					<span className='sr-only'>{ariaLabel}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align={isColumn ? 'start' : 'end'}>
				{sections.map((section, index) => (
					<div key={section.id}>
						{index > 0 && <DropdownMenuSeparator />}
						{section.label !== undefined && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
						{section.items.map((item) => (
							<DropdownMenuItem
								key={item.id}
								onClick={item.onSelect}
								disabled={item.disabled ?? false}
								variant={item.destructive ? 'destructive' : 'default'}
							>
								{renderGridMenuIcon(item.icon)}
								{item.label}
							</DropdownMenuItem>
						))}
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
