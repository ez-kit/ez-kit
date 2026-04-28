import { ArrowDown, ArrowUp, MoreHorizontal, PinOff } from 'lucide-react'

import { Button } from '../components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

import type { RowPinMenuProps } from '@ez-kit/data-grid-react'

export function RowPinMenu({ isPinned, canPinTop, canPinBottom, onPinTop, onPinBottom, onUnpin }: RowPinMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8'
				>
					<MoreHorizontal className='h-4 w-4' />
					<span className='sr-only'>Pin row</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuLabel>Pin</DropdownMenuLabel>
				{canPinTop && (
					<DropdownMenuItem
						onClick={onPinTop}
						disabled={isPinned === 'top'}
					>
						<ArrowUp className='mr-2 h-4 w-4' />
						Pin Top
					</DropdownMenuItem>
				)}
				{canPinBottom && (
					<DropdownMenuItem
						onClick={onPinBottom}
						disabled={isPinned === 'bottom'}
					>
						<ArrowDown className='mr-2 h-4 w-4' />
						Pin Bottom
					</DropdownMenuItem>
				)}
				{isPinned && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onUnpin}>
							<PinOff className='mr-2 h-4 w-4' />
							Unpin
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
