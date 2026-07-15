import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<select
			value={currentOperatorId}
			onChange={(e) => {
				onChange(e.target.value)
			}}
			style={{ fontSize: '0.75rem', padding: '0 2px' }}
		>
			{operators.map((op) => (
				<option
					key={op.id}
					value={op.id}
				>
					{op.label}
				</option>
			))}
		</select>
	)
}
