'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button, Dropdown, Label } from '@heroui/react'

import { KIT_CLASS_NAME } from '../../lib/kit-class-name'

import type { FilterOperatorOption, OperatorSelectProps } from '@ez-kit/data-grid-react'
import type { Selection } from '@heroui/react'

/** Matches the field beside it: HeroUI fields are `min-h-9`. */
const TRIGGER_CLASS = 'h-9 min-w-9 shrink-0 text-xs font-normal'
/** A label stands in for a missing icon, so it is clipped rather than allowed to take the row. */
const TRIGGER_LABEL_CLASS = 'max-w-28 px-2'
const ITEM_ICON_CLASS = 'w-6 shrink-0 text-center text-muted'

/**
 * The operator switch, first in the filter's row.
 *
 * It shows the current operator's icon when the grid names one and its label otherwise — clipped,
 * because a label as long as "Greater than or equal" would take the row from the value control.
 * The full label stays in the accessible name and in the menu.
 *
 * Unlike the shadcn flavour it carries no tooltip. HeroUI's `Tooltip.Trigger` wraps its child in a
 * focusable `div`, and the trigger button has to be a direct child of `Dropdown` — wrapped, it is
 * no longer the menu's trigger. The accessible name and the menu already hold the full label.
 *
 * The button is a direct child of `Dropdown` for the same reason the kit's `Menu` gives:
 * `Dropdown.Trigger` would render a second `<button>` around it. The entries go through `items`
 * and a render prop, per this kit's collection rule: a column's operator set can change shape, and
 * the model hands out fresh option objects every render, which is what that cache keys on.
 */
export function OperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	const messages = useGridMessages()
	const current = operators.find((op) => op.id === currentOperatorId)
	const label = current?.label ?? currentOperatorId
	const icon = current?.icon
	return (
		<Dropdown>
			<Button
				variant='tertiary'
				aria-label={messages.filtering.operatorTrigger({ label })}
				className={icon === undefined ? `${TRIGGER_CLASS} ${TRIGGER_LABEL_CLASS}` : TRIGGER_CLASS}
				{...(icon === undefined ? {} : { isIconOnly: true })}
			>
				{icon ?? <span className='truncate'>{label}</span>}
			</Button>
			<Dropdown.Popover className={KIT_CLASS_NAME}>
				<Dropdown.Menu
					aria-label={messages.filtering.operator}
					items={operators}
					selectionMode='single'
					selectedKeys={new Set([currentOperatorId])}
					disallowEmptySelection
					onSelectionChange={(keys: Selection) => {
						if (keys === 'all') return
						const [next] = keys
						if (next !== undefined) onChange(String(next))
					}}
				>
					{(op: FilterOperatorOption) => (
						<Dropdown.Item
							id={op.id}
							textValue={op.label}
							className='text-xs'
						>
							{op.icon === undefined ? null : (
								<span
									aria-hidden
									className={ITEM_ICON_CLASS}
								>
									{op.icon}
								</span>
							)}
							<Label>{op.label}</Label>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
