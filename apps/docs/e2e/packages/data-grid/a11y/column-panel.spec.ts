import AxeBuilder from '@axe-core/playwright'

import { expect, test } from '../../../fixtures'

import type { Locator, Page } from '@playwright/test'

/**
 * The column panel's rows, and a locked column's two surfaces, in a grid with a drag adapter bound.
 *
 * The drag library's accessibility plugin marks every registered item's activator — its handle, or
 * the item itself when it has none — with `role`, `tabindex`, `aria-roledescription`,
 * `aria-describedby`, `aria-pressed`, `aria-grabbed` and `aria-disabled`. A column the author locked
 * (`ordering: false`) is registered disabled, so that its place in the order is kept, and renders no
 * grip; before the adapters pointed such an item at an inert handle, the plugin marked the panel
 * row or the header cell itself. In the HeroUI panel that put `aria-pressed` on a `role="row"`,
 * which axe rejects; in the shadcn panel it made a plain row a `button` and a tab stop.
 *
 * `column-panel-drag` locks `id` and binds an adapter, so both surfaces are on the page: the panel
 * once it is opened, and the header, whose drag is on by default when an adapter is bound.
 */

const EXAMPLE = 'column-panel-drag'
const LOCKED = 'id'

/** What the drag library writes onto an activator. None of it may land on a locked item. */
const ACTIVATOR_ATTRIBUTES = [
	'role',
	'tabindex',
	'aria-roledescription',
	'aria-describedby',
	'aria-pressed',
	'aria-grabbed',
	'aria-disabled',
] as const

/** The activator attributes an element carries, with their values, so a failure says which. */
const activatorAttributesOf = (locator: Locator) =>
	locator.evaluate(
		(element, names) =>
			Object.fromEntries(
				names.filter((name) => element.hasAttribute(name)).map((name) => [name, element.getAttribute(name)]),
			),
		[...ACTIVATOR_ATTRIBUTES],
	)

async function openPanel(page: Page): Promise<void> {
	await page.locator('[data-slot="column-visibility-trigger"]').click()
	await expect(page.locator(`[data-slot="column-visibility-item"][data-column-id="${LOCKED}"]`)).toBeVisible()
}

test.describe('column panel accessibility', () => {
	test('the open panel has no axe violations in its rows', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		await openPanel(page)

		const result = await new AxeBuilder({ page }).include('[data-slot="column-visibility-item"]').analyze()

		expect(
			result.violations.map((violation) => ({
				id: violation.id,
				nodes: violation.nodes.map((node) => node.target.join(' ')),
			})),
		).toEqual([])
	})

	test('a locked panel row is not made a drag activator', async ({ grid, page, kit }) => {
		await grid.open(EXAMPLE)
		await openPanel(page)
		const row = page.locator(`[data-slot="column-visibility-item"][data-column-id="${LOCKED}"]`)

		const attributes = await activatorAttributesOf(row)

		// The HeroUI row is a react-aria grid row, which carries its own `role` and `tabindex`; what
		// must be absent there is everything the drag library would have added on top.
		const expected =
			kit === 'heroui' ? { role: await row.getAttribute('role'), tabindex: await row.getAttribute('tabindex') } : {}
		expect(attributes).toEqual(expected)
		if (kit === 'heroui') expect(attributes.role).toBe('row')
	})

	test('a locked header cell is not made a drag activator', async ({ grid, page }) => {
		await grid.open(EXAMPLE)
		const header = page.locator(`[data-slot="thead"] [data-slot="th"][data-column-id="${LOCKED}"]`)
		await expect(header).toBeVisible()

		const attributes = await activatorAttributesOf(header)

		expect(attributes).not.toHaveProperty('aria-pressed')
		expect(attributes).not.toHaveProperty('aria-roledescription')
		expect(attributes.role).not.toBe('button')
	})
})
