'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Button, buttonVariants, Checkbox, Dropdown, Label, Popover } from '@heroui/react'
import { ArrowDown, ArrowUp, Columns2 } from 'lucide-react'

import type { GridMessages, VisibilityMenuProps, VisibilityColumnItem } from '@ez-kit/data-grid-react'
import type { Selection } from '@heroui/react'

/**
 * The panel's trigger content — icon and label, and **not** a `<Button>`.
 *
 * `Popover.Trigger` renders its own `div[role="button"]` around whatever it is given (it wraps
 * the child in react-aria's `Pressable`), so a `<Button>` inside it is a button inside a button:
 * axe reports `nested-interactive`, serious, on every grid that mounts this control. HeroUI's own
 * "interactive content" example puts plain markup in the trigger for exactly this reason.
 *
 * The button's looks come from `buttonVariants`, which is HeroUI's documented way to put a
 * component's styles on an element that is not that component — so this stays the kit's own
 * button styling rather than a hand-rolled copy of it, and follows the recipe when it changes.
 */
function TriggerContent({ label }: { label: string }) {
	return (
		<>
			<Columns2 size={16} />
			{label}
		</>
	)
}

/**
 * The same trigger as a real `<Button>`, for the `Dropdown` form below.
 *
 * `Dropdown` follows react-aria's menu-trigger pattern and takes the button itself rather than
 * wrapping it, so here the `<Button>` is right — the nesting above is a `Popover.Trigger`
 * property, not a rule about triggers.
 */
function Trigger({ label }: { label: string }) {
	return (
		<Button
			data-slot='column-visibility-trigger'
			size='sm'
			variant='outline'
		>
			<TriggerContent label={label} />
		</Button>
	)
}

/**
 * The column panel: a checkbox list rather than a selection menu.
 *
 * A react-aria menu item owns the press that lands on it — which is exactly what makes the
 * selection form below right for a plain visibility toggle, and wrong the moment a row also
 * carries buttons, since pressing one would toggle the column on its way to moving it. So the
 * mode that has moves is drawn as a dialog of checkboxes instead.
 *
 * The arrows point up and down: the contract names the two moves logically (`start` / `end`,
 * because the column order flips under RTL) and leaves the glyph to the kit, and this list runs
 * top to bottom in either writing direction.
 */
function ColumnPanel({ columns, messages }: { columns: VisibilityColumnItem[]; messages: GridMessages }) {
	return (
		<Popover>
			<Popover.Trigger
				data-slot='column-visibility-trigger'
				className={buttonVariants({ size: 'sm', variant: 'outline' })}
			>
				<TriggerContent label={messages.visibility.trigger} />
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog
					aria-label={messages.visibility.menu}
					className='p-2'
				>
					<div className='grid min-w-60 gap-1'>
						{columns.map((col) => (
							<div
								key={col.id}
								className='flex items-center gap-1 rounded pe-1'
								data-slot='column-visibility-item'
							>
								<Checkbox
									className='min-w-0 flex-1 px-2 py-1.5'
									isDisabled={!col.canHide}
									isSelected={col.isVisible}
									onChange={() => {
										col.onToggle()
									}}
								>
									<Checkbox.Control>
										<Checkbox.Indicator />
									</Checkbox.Control>
									{/*
									 * A plain span, not `Label`: HeroUI's `Checkbox` root already *is* the
									 * `<label>`, and nesting a second one inside it is invalid markup. The
									 * name still resolves — an implicit label names the control it wraps.
									 */}
									<Checkbox.Content>
										<span className='truncate'>{col.label}</span>
									</Checkbox.Content>
								</Checkbox>
								<Button
									aria-label={`${messages.visibility.moveStart}: ${col.label}`}
									data-slot='column-visibility-move-start'
									isDisabled={col.ordering?.canMoveStart !== true}
									isIconOnly
									size='sm'
									variant='ghost'
									onPress={() => {
										col.ordering?.onMoveStart()
									}}
								>
									<ArrowUp className='size-4' />
								</Button>
								<Button
									aria-label={`${messages.visibility.moveEnd}: ${col.label}`}
									data-slot='column-visibility-move-end'
									isDisabled={col.ordering?.canMoveEnd !== true}
									isIconOnly
									size='sm'
									variant='ghost'
									onPress={() => {
										col.ordering?.onMoveEnd()
									}}
								>
									<ArrowDown className='size-4' />
								</Button>
							</div>
						))}
					</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}

export function VisibilityMenu({ columns }: VisibilityMenuProps) {
	const messages = useGridMessages()
	if (columns.some((col) => col.ordering !== undefined)) {
		return (
			<ColumnPanel
				columns={columns}
				messages={messages}
			/>
		)
	}

	const selectedKeys = new Set(columns.filter((col) => col.isVisible).map((col) => col.id))

	/**
	 * react-aria reports the whole next selection rather than the item that was pressed, so toggle
	 * exactly the columns whose visibility flipped. `'all'` means every key is selected.
	 */
	const onSelectionChange = (keys: Selection) => {
		for (const col of columns) {
			const willBeVisible = keys === 'all' || keys.has(col.id)
			if (willBeVisible !== col.isVisible) col.onToggle()
		}
	}

	return (
		<Dropdown>
			<Trigger label={messages.visibility.trigger} />
			<Dropdown.Popover placement='bottom end'>
				<Dropdown.Menu
					aria-label={messages.visibility.menu}
					items={columns}
					selectedKeys={selectedKeys}
					selectionMode='multiple'
					onSelectionChange={onSelectionChange}
				>
					{(col: VisibilityColumnItem) => (
						<Dropdown.Item
							id={col.id}
							textValue={col.label}
						>
							<Label>{col.label}</Label>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
