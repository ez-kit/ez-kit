'use client'

import { ListBox, Select } from '@heroui/react'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

/** `.select` is a stretched flex item inside `header-extras`; `w-fit` keeps the trigger
 *  compact instead of spanning the column like a second filter input. */
const SELECT_CLASS = 'w-fit'
/** Neutralises the HeroUI field look (`min-h-9 border bg-field shadow-field px-3 py-2`)
 *  so the operator reads as an inline affordance, matching the shadcn flavour.
 *  `pe-6` reserves room for the absolutely-positioned indicator (`end-2` + `size-4`):
 *  these utilities override HeroUI's `:has(.select__indicator) { pe-7 }`, so the space
 *  must be re-declared here or the chevron overlaps the label. Padding is set per side —
 *  a `px-*` shorthand would race `pe-*` on `padding-inline` in the same cascade layer. */
const TRIGGER_CLASS = 'h-7 min-h-0 gap-1 border-0 bg-transparent ps-1.5 pe-6 py-0 text-xs shadow-none'
const ITEM_CLASS = 'text-xs'
const SYMBOL_CLASS = 'font-mono'

export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<Select
			className={SELECT_CLASS}
			value={currentOperatorId}
			aria-label='Filter operator'
			onChange={(value) => {
				if (value != null) onChange(String(value))
			}}
		>
			<Select.Trigger className={TRIGGER_CLASS}>
				<Select.Value />
				<Select.Indicator />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					{operators.map((op) => (
						<ListBox.Item
							key={op.id}
							id={op.id}
							textValue={op.label}
							className={ITEM_CLASS}
						>
							{op.symbol ? <span className={SYMBOL_CLASS}>{op.symbol}</span> : null} {op.label}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}
