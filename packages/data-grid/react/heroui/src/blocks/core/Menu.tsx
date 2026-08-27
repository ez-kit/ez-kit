'use client'

import { GridMenuVariant } from '@ez-kit/data-grid-react'
import { Button, Dropdown, Header } from '@heroui/react'
import { EllipsisVertical, MoreHorizontal } from 'lucide-react'

import { GRID_MENU_ICON_PLACEHOLDER, GRID_MENU_ICONS } from '../icons'

import type { GridMenuItem, GridMenuProps, GridMenuSection } from '@ez-kit/data-grid-react'
import type { Key } from 'react'

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
		flat.find((item) => item.id === key)?.onSelect()
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
					disabledKeys={flat.filter((item) => item.disabled).map((item) => item.id)}
					onAction={onAction}
				>
					{(section: GridMenuSection) => (
						<Dropdown.Section id={section.id}>
							{section.label !== undefined && <Header>{section.label}</Header>}
							{section.items.map((item) => (
								<Dropdown.Item
									key={item.id}
									id={item.id}
									textValue={item.label}
									variant={item.danger ? 'danger' : 'default'}
								>
									{item.icon ? GRID_MENU_ICONS[item.icon] : GRID_MENU_ICON_PLACEHOLDER} {item.label}
								</Dropdown.Item>
							))}
						</Dropdown.Section>
					)}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
