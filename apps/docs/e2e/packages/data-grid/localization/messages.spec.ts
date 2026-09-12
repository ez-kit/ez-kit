import { expect, test, toggle } from '../../../fixtures'

/**
 * `messages` replaces the grid's strings — all of them, in both kits.
 *
 * The example's dictionary is Russian and **partial**, which is the interesting case: a
 * dictionary is a plain object, so an entry that is written wins and an entry that is left out
 * falls back to English. The assertions below therefore read what a *user* reads — visible text
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

const GRID_LABEL = 'Таблица пользователей'

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

	test('counts the selection with the language’s own plural rule', async ({ page }) => {
		const rowCheckbox = (index: number) => page.getByRole('checkbox', { name: /^Выбрать строку/ }).nth(index)
		const counter = page.getByLabel(/^Выбрано/)

		// `Intl.PluralRules('ru-RU')` — one / few / many are three different words, which is
		// exactly why `selection.count` is a function and not a template with an `s` on the end.
		await toggle(rowCheckbox(0))
		await expect(counter).toHaveAttribute('aria-label', 'Выбрано 1 строка')

		await toggle(rowCheckbox(1))
		await expect(counter).toHaveAttribute('aria-label', 'Выбрано 2 строки')

		for (const index of [2, 3, 4]) await toggle(rowCheckbox(index))
		await expect(counter).toHaveAttribute('aria-label', 'Выбрано 5 строк')
	})

	test('translates the column menu, its name and its entries', async ({ grid, page }) => {
		await grid.header('name').getByRole('button', { name: 'Меню столбца' }).click()

		// The menu is named by the same entry as the button that opens it.
		await expect(page.getByRole('menu', { name: 'Меню столбца' })).toHaveCount(1)
		// Hide is the only entry this example offers: the grid runs without `sorting`, and the
		// ordering and pinning sections are likewise off, so their translated entries have
		// nothing to render into. Asserting them here would assert the example, not the grid.
		await expect(page.getByRole('menuitem', { name: 'Скрыть' })).toHaveCount(1)
	})

	test('translates the filter operators and names the control', async ({ page }) => {
		// The trigger shows the current operator; its accessible name says what the control is.
		const operator = page
			.getByRole('combobox', { name: 'Оператор фильтра' })
			.or(page.getByRole('button', { name: /Оператор фильтра/ }))

		await expect(operator).toHaveCount(2)
		// `contains` on the text column, `equals` on the number one — both from `operators`.
		await expect(operator.first()).toContainText('Содержит')
		await expect(operator.last()).toContainText('Равно')
	})

	test('translates the toolbar controls', async ({ page }) => {
		await expect(page.getByRole('searchbox', { name: 'Поиск…' })).toHaveCount(1)
		await expect(page.getByRole('button', { name: 'Столбцы' })).toHaveCount(1)
	})

	test('translates the pager, including the parameterized summary', async ({ page }) => {
		await expect(page.getByRole('navigation', { name: 'Навигация по страницам' })).toContainText('1–5 из 24')
		await expect(page.getByRole('button', { name: 'Вперёд' })).toHaveCount(1)
		await expect(page.getByRole('button', { name: 'Назад' })).toHaveCount(1)
	})

	test('translates the empty-result fallback', async ({ grid, page }) => {
		await page.getByRole('searchbox', { name: 'Поиск…' }).fill('нетакогопользователя')

		await expect(page.getByText('Ничего не найдено')).toBeVisible()
		await expect(grid.rows()).toHaveCount(0)
	})
})
