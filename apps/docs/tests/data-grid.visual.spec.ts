import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const SANDBOX_URLS = ['/sandbox/data-grid/shadcn', '/sandbox/data-grid/heroui'] as const
const PRIMITIVE_URL = '/sandbox/data-grid/shadcn-primitive'

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

async function waitForTable(page: Page) {
  const previewFrame = page.locator('iframe[title="Sandpack Preview"]').first().contentFrame()

  // <table> has display:block which removes the implicit ARIA role — use data-slot instead
  await previewFrame.locator('[data-slot="table"]').first().waitFor({ state: 'visible', timeout: 30_000 })
  // Allow Sandpack bundling and grid layout to settle after initial render
  await page.waitForTimeout(500)
}

async function waitForPrimitiveTable(page: Page) {
  await page.locator('[data-slot="table"]').first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(200)
}

for (const sandboxUrl of SANDBOX_URLS) {
  const uiKit = sandboxUrl.split('/').at(-1) ?? 'unknown'

  test.describe(`DataGrid visual regression: ${uiKit}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(sandboxUrl)
      await waitForTable(page)
    })

    for (const tab of TABS) {
      test(`tab: ${tab}`, async ({ page }) => {
        if (tab !== 'Base') {
          await page.getByRole('button', { name: tab, exact: true }).click()
          await waitForTable(page)
        }

        const content = page.locator('div').filter({ hasText: 'DataGrid Sandbox' }).first()
        await expect(content).toHaveScreenshot(`${uiKit}-${tab.toLowerCase().replace(/ /g, '-')}.png`, {
          maxDiffPixelRatio: 0.01,
          animations: 'disabled',
        })
      })
    }
  })
}

test.describe('DataGrid visual regression: shadcn-primitive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PRIMITIVE_URL)
    await expect(page.locator('iframe[title="Sandpack Preview"]')).toHaveCount(0)
    await waitForPrimitiveTable(page)
  })

  for (const tab of TABS) {
    test(`tab: ${tab}`, async ({ page }) => {
      if (tab !== 'Base') {
        await page.getByRole('button', { name: tab, exact: true }).click()
        await waitForPrimitiveTable(page)
      }

      const content = page.locator('div').filter({ hasText: 'DataGrid Sandbox' }).first()
      await expect(content).toHaveScreenshot(`shadcn-primitive-${tab.toLowerCase().replace(/ /g, '-')}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      })
    })
  }
})
