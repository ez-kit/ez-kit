import { expect, test } from '@playwright/test'

const SANDBOX_URL = '/sandbox/data-grid'

const TABS = [
  'Base',
  'Cell Types',
  'Delete Confirmation',
  'Selection Bar',
  'Row Pinning',
  'Column Pinning',
  'Column Visibility',
  'Filter Operators',
  'CRUD',
  'Filter Popover',
  'Virtualized',
  'Resizing',
] as const

async function waitForTable(page: import('@playwright/test').Page) {
  // <table> has display:block which removes the implicit ARIA role — use data-slot instead
  await page.waitForSelector('[data-slot="table"]', { state: 'visible', timeout: 15_000 })
  // Allow grid layout to settle after initial render
  await page.waitForTimeout(200)
}

test.describe('DataGrid visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SANDBOX_URL)
    await waitForTable(page)
  })

  for (const tab of TABS) {
    test(`tab: ${tab}`, async ({ page }) => {
      if (tab !== 'Base') {
        await page.getByRole('button', { name: tab, exact: true }).click()
        await waitForTable(page)
      }

      const content = page.locator('div').filter({ hasText: 'DataGrid Sandbox' }).first()
      await expect(content).toHaveScreenshot(`${tab.toLowerCase().replace(/ /g, '-')}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      })
    })
  }
})
