'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'

import { Button } from '@grid-shadcn/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@grid-shadcn/components/ui/dropdown-menu'
import { KIT_CLASS_NAME } from '@grid-shadcn/lib/kit-class-name'

import { Tooltip } from '../core/Tooltip'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

/**
 * The operator switch, first in the filter's row and sized to the input beside it (`h-8`).
 *
 * It shows the current operator's icon when the grid names one and its label otherwise — clipped,
 * because a label as long as "Greater than or equal" would take the row from the value control.
 * Whatever it shows, the full label is in the tooltip, in the accessible name and in the menu.
 *
 * The menu sizes to its entries (`w-auto`) rather than to the trigger, which the primitive's own
 * width does — a sign-sized trigger would otherwise clip every label.
 *
 * The triggers nest the way shadcn composes them: the tooltip's `asChild` lands on the menu's
 * trigger, whose `asChild` lands on the button, so one element carries both behaviours.
 */
export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	const messages = useGridMessages()
	const current = operators.find((op) => op.id === currentOperatorId)
	const label = current?.label ?? currentOperatorId
	const icon = current?.icon
	return (
		<DropdownMenu>
			<Tooltip content={label}>
				<DropdownMenuTrigger asChild>
					<Button
						type='button'
						variant='outline'
						size={icon === undefined ? 'default' : 'icon'}
						aria-label={messages.filtering.operatorTrigger({ label })}
						className={icon === undefined ? 'max-w-28 px-2 text-xs font-normal' : 'text-xs font-normal'}
					>
						{icon ?? <span className='truncate'>{label}</span>}
					</Button>
				</DropdownMenuTrigger>
			</Tooltip>
			<DropdownMenuContent
				className={`${KIT_CLASS_NAME} w-auto`}
				align='start'
				aria-label={messages.filtering.operator}
			>
				<DropdownMenuRadioGroup
					value={currentOperatorId}
					onValueChange={onChange}
				>
					{operators.map((op) => (
						<DropdownMenuRadioItem
							key={op.id}
							value={op.id}
							className='text-xs whitespace-nowrap'
						>
							{op.icon === undefined ? null : (
								<span
									aria-hidden
									className='w-6 shrink-0 text-center text-muted-foreground'
								>
									{op.icon}
								</span>
							)}
							{op.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
