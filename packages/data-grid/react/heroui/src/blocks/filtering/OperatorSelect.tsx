'use client'

import { ListBox, Select } from '@heroui/react'

import type { OperatorSelectProps } from '@ez-kit/data-grid-react'

/** `.select` is a stretched flex item inside `header-extras`; `w-fit` keeps the trigger
 *  compact instead of spanning the column like a second filter input. */
const SELECT_CLASS = 'w-fit'
/** Neutralises the HeroUI field look (`min-h-9 border bg-field shadow-field px-3 py-2`)
 *  so the operator reads as an inline affordance, matching the shadcn flavour.
 *  `items-center` is load-bearing: `.select__trigger` is a bare `inline-flex`, so its items
 *  stretch and the single line of text renders at the *top* of the box. HeroUI never sees
 *  that because `min-h-9 py-2` leaves the line no room to sit off-centre — dropping the
 *  padding here exposes it, and the text drifts above the vertically centred indicator.
 *  Gap and padding assume an in-flow indicator; see INDICATOR_CLASS. */
const TRIGGER_CLASS = 'h-7 min-h-0 items-center gap-1 border-0 bg-transparent px-1.5 py-0 shadow-none'
/** HeroUI positions the chevron out of flow (`absolute inset-y-0 right-2`) and reserves room
 *  for it with `pr-7` on the trigger — spacing tuned for a 36px-tall field, which leaves a
 *  visible dead zone at this size. Putting it back in flow lets the trigger's `gap` and
 *  padding do the spacing, so nothing has to be restated. The utilities layer wins over the
 *  `components`-layer rule these override. */
const INDICATOR_CLASS = 'static size-3.5'
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
				<Select.Indicator className={INDICATOR_CLASS} />
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
