'use client'

import { GridMenuVariant, isGridMenuItemSlot } from '@ez-kit/data-grid-react'
import { Button, Dropdown, Header, Label, Separator } from '@heroui/react'
import { EllipsisVertical, MoreHorizontal } from 'lucide-react'

import { renderGridMenuIcon } from '../icons'

import type { GridMenuItem, GridMenuProps, GridMenuSection } from '@ez-kit/data-grid-react'
import type { CSSProperties, Key } from 'react'

/** The colour `.menu-item--danger` gives a danger item's label, applied to its glyph too. */
const DANGER_ICON_STYLE: CSSProperties = { display: 'contents', color: 'var(--danger)' }

/**
 * The grid's overflow menu — column header options and row actions both render through here.
 * Only the trigger differs between the two, so `variant` is the only thing that branches.
 *
 * Sections drive `Dropdown.Menu` through `items` + a render prop, per this kit's collection
 * rule: react-aria caches each rendered node by item identity, and the section set changes
 * shape (a column that is already pinned left offers different entries than one that is not).
 * The entries inside a section are a plain keyed `map`, which is the sanctioned form — every
 * `Dropdown.Item` carries an explicit `id`, so React can never reconcile one entry's fiber
 * onto another's.
 */
export function Menu({ variant, sections, 'aria-label': ariaLabel }: GridMenuProps) {
	const flat: GridMenuItem[] = sections.flatMap((section) => section.items)

	const onAction = (key: Key) => {
		const item = flat.find((entry) => entry.id === key)
		// A slot entry has no handler of its own: whatever the author rendered inside the item
		// owns its interaction.
		if (item && !isGridMenuItemSlot(item)) item.onAction()
	}

	return (
		<Dropdown>
			{variant === GridMenuVariant.Column ? (
				<Dropdown.Trigger>
					<span
						aria-label={ariaLabel}
						className='inline-flex items-center'
					>
						<EllipsisVertical size={14} />
					</span>
				</Dropdown.Trigger>
			) : (
				/*
				 * The Button is the trigger and must be a *direct* child of `Dropdown`: wrapping it in
				 * `Dropdown.Trigger` makes that element render its own `<button>` around this one, which
				 * is invalid HTML and breaks hydration. Same shape as the edit / delete actions so the
				 * three buttons line up.
				 */
				<Button
					variant='ghost'
					size='sm'
					isIconOnly
					aria-label={ariaLabel}
				>
					<MoreHorizontal className='size-4' />
				</Button>
			)}
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label={ariaLabel}
					items={sections}
					disabledKeys={flat.filter((item) => !isGridMenuItemSlot(item) && item.disabled).map((item) => item.id)}
					onAction={onAction}
				>
					{(section: GridMenuSection) => (
						<Dropdown.Section id={section.id}>
							{/* HeroUI groups but does not divide: `Dropdown.Section` draws no rule of its own,
							    and its own examples place a `<Separator />` between sections by hand. This
							    kit's sections are the actions / custom / pin groups, so without one the pin
							    entries ran straight on from Delete — shadcn's menu has divided them all along.
							    It sits inside the section rather than between two of them because the menu is
							    a react-aria collection: a loose node between collection children is dropped by
							    the builder. */}
							{sections[0]?.id !== section.id && <Separator />}
							{section.label !== undefined && <Header>{section.label}</Header>}
							{section.items.map((item) =>
								isGridMenuItemSlot(item) ? (
									// The author's own entry still needs its `Dropdown.Item`: this menu is a
									// react-aria collection, and a loose node between items is dropped by the
									// collection builder rather than rendered.
									<Dropdown.Item
										key={item.id}
										id={item.id}
										textValue={item.id}
									>
										{item.component}
									</Dropdown.Item>
								) : (
									<Dropdown.Item
										key={item.id}
										id={item.id}
										textValue={item.label}
										variant={item.destructive ? 'danger' : 'default'}
										{...(item.className !== undefined ? { className: item.className } : {})}
									>
										{/* `variant='danger'` colours the label and the indicator — not the glyph.
										    HeroUI's own with-icons example hangs `text-danger` on the icon by hand, so
										    the kit does the same here, through the token that rule uses rather than the
										    utility class (which only exists once an app has generated it). The wrapper
										    is `display: contents` so it tints `currentColor` without taking a box in
										    the item's gutter layout. */}
										<span style={item.destructive === true ? DANGER_ICON_STYLE : undefined}>
											{renderGridMenuIcon(item.icon)}
										</span>
										{/* HeroUI's own item anatomy, and load-bearing rather than decorative: the danger
										    variant is styled as `.menu-item--danger [data-slot="label"]`, which only a
										    `<Label>` emits — a bare text node left Delete black. */}
										<Label>{item.label}</Label>
									</Dropdown.Item>
								),
							)}
						</Dropdown.Section>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
