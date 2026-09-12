'use client'

import { useGridMessages } from '@ez-kit/data-grid-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	const messages = useGridMessages()
	return (
		<Select
			value={currentOperatorId}
			onValueChange={onChange}
		>
			{/* The trigger's visible text is the current operator ("Contains"); what it does not
			    say is *which* control this is, and there is one per filtered column. The heroui
			    kit names it from the same key. */}
			<SelectTrigger
				aria-label={messages.filtering.operator}
				className='h-7 w-auto min-w-0 gap-1 border-0 px-1.5 text-xs shadow-none focus:ring-0'
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align='start'>
				{operators.map((op) => (
					<SelectItem
						key={op.id}
						value={op.id}
						className='text-xs'
					>
						{op.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
