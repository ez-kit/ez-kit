'use client'

import { ListBox, Select } from '@heroui/react'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<Select
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			selectedKey={currentOperatorId}
			aria-label='Filter operator'
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			onSelectionChange={(key) => {
				if (key != null) onChange(String(key))
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
