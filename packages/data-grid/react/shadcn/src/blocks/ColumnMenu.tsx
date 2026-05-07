import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EllipsisVertical, EyeOff, PinOff, X } from 'lucide-react'

import { Button } from '../components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

import type { ColumnMenuProps } from '@ez-kit/data-grid-react'

export function ColumnMenu({ sections }: ColumnMenuProps) {
	const { pin, visibility, sorting } = sections

	if (!pin && !visibility && !sorting) return null

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='h-6 w-6'
				>
					<EllipsisVertical className='h-3 w-3' />
					<span className='sr-only'>Column options</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start'>
				{sorting && (
					<>
						<DropdownMenuLabel>Sorting</DropdownMenuLabel>
						{sorting.canAsc && (
							<DropdownMenuItem onClick={sorting.onSortAsc}>
								<ArrowUp className='mr-2 h-4 w-4' />
								Asc
							</DropdownMenuItem>
						)}
						{sorting.canDesc && (
							<DropdownMenuItem onClick={sorting.onSortDesc}>
								<ArrowDown className='mr-2 h-4 w-4' />
								Desc
							</DropdownMenuItem>
						)}
						{sorting.currentSort && (
							<DropdownMenuItem onClick={sorting.onClearSort}>
								<X className='mr-2 h-4 w-4' />
								Clear sort
							</DropdownMenuItem>
						)}
					</>
				)}
				{sorting && pin && <DropdownMenuSeparator />}
				{pin && (
					<>
						<DropdownMenuLabel>Pin</DropdownMenuLabel>
						{pin.canPinLeft && (
							<DropdownMenuItem onClick={pin.onPinLeft}>
								<ArrowLeft className='mr-2 h-4 w-4' />
								Pin Left
							</DropdownMenuItem>
						)}
						{pin.canPinRight && (
							<DropdownMenuItem onClick={pin.onPinRight}>
								<ArrowRight className='mr-2 h-4 w-4' />
								Pin Right
							</DropdownMenuItem>
						)}
						{pin.isPinned && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={pin.onUnpin}>
									<PinOff className='mr-2 h-4 w-4' />
									Unpin
								</DropdownMenuItem>
							</>
						)}
					</>
				)}
				{(sorting || pin) && visibility && <DropdownMenuSeparator />}
				{visibility && (
					<DropdownMenuItem onClick={visibility.onHide}>
						<EyeOff className='mr-2 h-4 w-4' />
						Hide
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
