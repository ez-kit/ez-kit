import { expect, test, toggle } from '../../../fixtures'

/**
 * `messages` replaces the grid's strings — all of them, in both kits.
 *
 * The example uses the complete Russian dictionary from the provider and overrides a few
 * entries on the grid. The assertions below therefore read what a *user* reads — visible text
 * and accessible names — rather than checking that some string reached some prop.
 *
 * Accessible names are the point of most of this file. A grid whose buttons were translated
 * while its `aria-label`s stayed English is half-localized in the way that matters least to
 * sighted users and most to everyone else, and each of the three names asserted here
 * (`grid.label`, `selection.selectRow`/`selectAll`, `filtering.operator`) was silently missing
 * from the shadcn kit until this spec was first run.
 *
 * The *merge* itself — a written entry replacing a default, an omitted one keeping it — is unit
 * tested in `@ez-kit/data-grid-core` (`messages/resolve.test.ts`). What is checked here is the
 * other half: that the resolved dictionary actually reaches the DOM each kit renders.
 */

const EXAMPLE = 'localization'

/** `pagination.pageSize: 5` over `makeUsers(24)`. */
const PAGE_SIZE = 5

const GRID_LABEL = 'Пользователи'

test.describe('a localized grid', () => {
	test.beforeEach(async ({ grid }) => {
		await grid.open(EXAMPLE)
	})

	test('names the table from grid.label', async ({ page }) => {
		// `role=table` under shadcn, `role=grid` under heroui's React Aria collection — the
		// element is the same one, and the name on it comes from the same entry.
		const named = page.getByRole('table', { name: GRID_LABEL }).or(page.getByRole('grid', { name: GRID_LABEL }))

		await expect(named).toHaveCount(1)
	})

	test('names the selection checkboxes from the dictionary', async ({ page }) => {
		await expect(page.getByRole('checkbox', { name: 'Выбрать все строки' })).toHaveCount(1)
		// heroui appends the row's own text to the name; shadcn writes the bare label. Both
		// start with the translated string, which is what the entry promises.
		await expect(page.getByRole('checkbox', { name: /^Выбрать строку/ })).toHaveCount(PAGE_SIZE)
	})

	test('counts the selection with the Russian dictionary', async ({ page }) => {
		const rowCheckbox = (index: number) => page.getByRole('checkbox', { name: /^Выбрать строку/ }).nth(index)
		const counter = page.getByLabel(/^Выбрано/)

		await toggle(rowCheckbox(0))
		await expect(counter).toHaveAttribute('aria-label', 'Выбрано: 1')

		await toggle(rowCheckbox(1))
		await expect(counter).toHaveAttribute('aria-label', 'Выбрано: 2')

		for (const index of [2, 3, 4]) await toggle(rowCheckbox(index))
		await expect(counter).toHaveAttribute('aria-label', 'Выбрано: 5')
	})

	test('translates the column menu, its name and its entries', async ({ grid, page }) => {
		await grid.header('name').getByRole('button', { name: 'Параметры колонки' }).click()

		// The menu is named by the same entry as the button that opens it.
		await expect(page.getByRole('menu', { name: 'Параметры колонки' })).toHaveCount(1)
		await expect(page.getByRole('menuitem', { name: 'Скрыть' })).toHaveCount(1)
	})

	test('translates the filter operators and names the control', async ({ grid, page }) => {
		// The button shows the current operator's label, and its accessible name — from
		// `filtering.operatorTrigger` — carries it too, since a clipped label or an icon reads badly.
		const contains = page.getByRole('button', { name: 'Оператор фильтра: Содержит' })
		const equals = grid.header('age').getByRole('button', { name: 'Оператор фильтра: Равно' })

		await expect(contains).toHaveCount(1)
		await expect(equals).toHaveCount(1)
		// `contains` on the text column, `equals` on the number one — both from the Russian dictionary.
		await expect(contains).toContainText('Содержит')
		await expect(equals).toContainText('Равно')

		// The menu is named by `filtering.operator`, and its entries are the translated labels.
		await contains.click()
		await expect(page.getByRole('menu', { name: 'Оператор фильтра' })).toHaveCount(1)
		await expect(page.getByRole('menuitemradio', { name: 'Содержит' })).toHaveAttribute('aria-checked', 'true')
	})

	test('translates the toolbar controls', async ({ page }) => {
		await expect(page.getByRole('searchbox', { name: 'Поиск…' })).toHaveCount(1)
		await expect(page.getByRole('button', { name: 'Колонки', exact: true })).toHaveCount(1)
	})

	test('translates the pager, including the parameterized summary', async ({ page }) => {
		await expect(page.getByRole('navigation', { name: 'Пагинация' })).toContainText('1–5 из 24')
		await expect(page.getByRole('button', { name: 'Вперёд' })).toHaveCount(1)
		await expect(page.getByRole('button', { name: 'Назад' })).toHaveCount(1)
	})

	test('translates the empty-result fallback', async ({ grid, page }) => {
		await page.getByRole('searchbox', { name: 'Поиск…' }).fill('нетакогопользователя')

		await expect(page.getByText('Ничего не найдено')).toBeVisible()
		await expect(grid.rows()).toHaveCount(0)
	})
})
