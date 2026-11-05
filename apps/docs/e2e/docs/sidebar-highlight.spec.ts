import { expect, test } from '@playwright/test'

test('one hover highlight follows sidebar items without hiding the current page', async ({ page }) => {
	await page.goto('/docs/data-grid/getting-started')
	const sidebar = page.locator('#nd-sidebar')
	const active = sidebar.getByRole('link', { name: 'Getting Started', exact: true })
	const first = sidebar.getByRole('link', { name: 'Data Grid', exact: true })
	const next = sidebar.getByRole('link', { name: 'Feature Set', exact: true })
	const highlight = page.locator('[data-sidebar-highlight]')

	await first.hover()
	await expect(highlight).toHaveCount(1)
	await next.hover()
	await expect
		.poll(async () => {
			const [item, surface] = await Promise.all([next.boundingBox(), highlight.boundingBox()])
			return item && surface ? Math.abs(item.y - surface.y) : Infinity
		})
		.toBeLessThan(1)
	await expect(active).toHaveAttribute('data-active', 'true')
	await expect(highlight).toHaveAttribute('aria-hidden', 'true')
	await page.mouse.move(1000, 400)
	await expect(highlight).toHaveCSS('opacity', '0')

	await sidebar.getByRole('button', { name: /Installation/i }).click()
	await expect(sidebar.getByRole('link', { name: /shadcn/i }).first()).toBeVisible()
})

test('reduced motion and touch do not animate or leave a hover highlight', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto('/docs/data-grid/getting-started')
	const link = page.locator('#nd-sidebar').getByRole('link', { name: 'Feature Set', exact: true })
	await link.dispatchEvent('pointerover', { pointerType: 'touch', bubbles: true })
	await expect(page.locator('[data-sidebar-highlight]')).toHaveCount(0)
	await link.focus()
	await expect(link).toBeFocused()
	await expect(link).toHaveCSS('outline-style', 'solid')
	await link.hover()
	await expect(page.locator('[data-sidebar-highlight]')).toHaveCount(1)
})
