import { GridMenuVariant } from '@ez-kit/data-grid-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Menu } from './Menu'

const sections = [
	{
		id: 'actions',
		items: [
			{ id: 'edit', label: 'Edit', onAction: () => undefined },
			{ id: 'delete', label: 'Delete', destructive: true, onAction: () => undefined },
		],
	},
]

describe('heroui Menu', () => {
	// HeroUI styles the danger variant as `.menu-item--danger [data-slot="label"]`, so an item
	// whose label is a bare text node renders the `variant='danger'` prop and no red at all.
	// The assertion is on the `<Label>` element, not on a colour: jsdom loads no kit stylesheet.
	it('wraps every item label in a Label so the danger variant has something to colour', async () => {
		render(
			<Menu
				variant={GridMenuVariant.Row}
				sections={sections}
				aria-label='Row actions'
			/>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Row actions' }))

		for (const label of ['Edit', 'Delete']) {
			const item = screen.getByRole('menuitem', { name: label })
			expect(item.querySelector('[data-slot="label"]')?.textContent).toBe(label)
		}
		expect(screen.getByRole('menuitem', { name: 'Delete' }).className).toContain('menu-item--danger')
	})

	// The other half of the same defect: HeroUI's danger rule reaches the label and the indicator
	// but never the glyph — its own with-icons example tints the icon by hand — so the kit tints
	// it here, and only for a destructive entry.
	it('tints a destructive entry’s glyph and leaves a neutral one alone', async () => {
		render(
			<Menu
				variant={GridMenuVariant.Row}
				sections={sections}
				aria-label='Row actions'
			/>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Row actions' }))

		const iconWrapper = (label: string) => screen.getByRole('menuitem', { name: label }).querySelector('span')

		expect(iconWrapper('Delete')?.getAttribute('style')).toContain('var(--danger)')
		expect(iconWrapper('Edit')?.getAttribute('style') ?? '').not.toContain('var(--danger)')
	})

	// `Dropdown.Section` groups without dividing, so the actions / custom / pin groups ran
	// together until the kit placed the separators HeroUI's own examples place by hand.
	it('divides consecutive sections, and draws no rule above the first', async () => {
		render(
			<Menu
				variant={GridMenuVariant.Row}
				sections={[...sections, { id: 'pin', items: [{ id: 'pin-top', label: 'Pin Top', onAction: () => undefined }] }]}
				aria-label='Row actions'
			/>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Row actions' }))

		const menu = screen.getByRole('menu')
		expect(menu.querySelectorAll('[data-slot="separator"]')).toHaveLength(1)
		// A separator is presentational, not a stop on the roving focus.
		expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
			'Edit',
			'Delete',
			'Pin Top',
		])
	})
})
