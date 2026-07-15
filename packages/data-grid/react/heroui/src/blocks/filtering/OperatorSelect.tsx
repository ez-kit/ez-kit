'use client'

import { ListBox, Select } from '@heroui/react'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

/** `.select` is a stretched flex item inside `header-extras`; `w-fit` keeps the trigger
 *  compact instead of spanning the column like a second filter input. */
const SELECT_CLASS = 'w-fit'
/** Neutralises the HeroUI field look (`min-h-9 border bg-field shadow-field px-3 py-2`)
 *  so the operator reads as an inline affordance, matching the shadcn flavour.
 *  `pr-7` re-reserves room for the indicator, which HeroUI positions out of flow against
 *  the physical right edge (`right-2` + `size-4`). Its own `:has(.select__indicator)`
 *  padding sits in the `components` layer, so these utilities drop it and the space has to
 *  be restated or the chevron overlaps the label. Padding is per side: a `px-*` shorthand
 *  would race the per-side value, and physical sides keep it aligned with the physically
 *  positioned indicator. */
const TRIGGER_CLASS = 'h-7 min-h-0 border-0 bg-transparent pl-1.5 pr-7 py-0 shadow-none'
/** HeroUI sets a font-size on `.select__value` itself (`text-base sm:text-sm`), so a
 *  `text-xs` on the trigger would never cascade in — it has to land on the value. */
const VALUE_CLASS = 'text-xs'
const ITEM_CLASS = 'text-xs'

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
				<Select.Value className={VALUE_CLASS} />
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
							{op.label}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	)
}
