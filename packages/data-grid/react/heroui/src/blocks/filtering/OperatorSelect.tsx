'use client'

import { ListBox, Select } from '@heroui/react'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<Select
			value={currentOperatorId}
			aria-label='Filter operator'
			onChange={(value) => {
				if (value != null) onChange(String(value))
			}}
		>
			<Select.Trigger>
				<Select.Value />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					{operators.map((op) => (
						<ListBox.Item
							key={op.id}
							id={op.id}
							textValue={op.label}
						>
							{op.symbol ?? op.label}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}
