import { ArrowLeft, ArrowRight, EllipsisVertical, EyeOff, PinOff } from 'lucide-react'

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
	const { pin, visibility } = sections

	if (!pin && !visibility) return null

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
				{pin && visibility && <DropdownMenuSeparator />}
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
