import { RowActionId } from '@ez-kit/data-grid-react'
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, PinOff, Trash2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'

import type { RowActionsMenuProps } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

const ICONS: Record<RowActionId, ReactNode> = {
	[RowActionId.Edit]: <Pencil className='mr-2 h-4 w-4' />,
	[RowActionId.Delete]: <Trash2 className='mr-2 h-4 w-4' />,
	[RowActionId.PinTop]: <ArrowUp className='mr-2 h-4 w-4' />,
	[RowActionId.PinBottom]: <ArrowDown className='mr-2 h-4 w-4' />,
	[RowActionId.Unpin]: <PinOff className='mr-2 h-4 w-4' />,
}

export function RowActionsMenu({ items, 'aria-label': ariaLabel = 'Row actions' }: RowActionsMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{/* Same Button shape as the edit / delete actions so the three line up. */}
				<Button
					variant='ghost'
					size='icon'
				>
					<MoreHorizontal />
					<span className='sr-only'>{ariaLabel}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				{items.map((item) => (
					<DropdownMenuItem
						key={item.id}
						onClick={item.onSelect}
						disabled={item.disabled ?? false}
						variant={item.danger ? 'destructive' : 'default'}
					>
						{ICONS[item.id]}
						{item.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
