import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../components/ui/select'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<Select
			value={currentOperatorId}
			onValueChange={onChange}
		>
			<SelectTrigger className='h-7 w-auto min-w-0 gap-1 border-0 px-1.5 text-xs shadow-none focus:ring-0'>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align='start'>
				{operators.map((op) => (
					<SelectItem
						key={op.id}
						value={op.id}
						className='text-xs'
					>
						{op.symbol ? (
							<span className='font-mono'>{op.symbol}</span>
						) : null}
						{' '}
						{op.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
