# Tasks

## 1. Исправить слот `edit:` в docs-реестрах

- [x] 1.1 `apps/docs/shared/data-grid/custom-cell-types.ts`: заменить `edit:` → `editing:` у всех пяти типов; проверить, что `pnpm --filter @ez-kit/docs typecheck` зелёный
- [x] 1.2 `apps/docs/shared/data-grid/examples/components/column-helper-registered.tsx`: `edit:` → `editing:`; проверить, что `grep -rn "\bedit: " apps/docs/shared` ничего не находит
- [x] 1.3 Открыть в браузере (`pnpm docs:dev`) примеры `custom-cell-types`, `custom-cell-progress`, `custom-cell-currency`, `custom-cell-user` и `column-helper-registered` на shadcn и heroui, войти в режим редактирования и убедиться, что рендерится кастомный инпут, а не дефолтный, и что значение сохраняется. Сломанный инпут чинить в `custom-cell-renderers.tsx` в рамках этой задачи

## 2. Пример расширенного badge

- [x] 2.1 Добавить `SizedBadgeView` в `apps/docs/shared/data-grid/custom-cell-renderers.tsx`: читает `config.size` (`'sm' | 'md'`) и label / variant из `item` / `config.items`, без китовых примитивов и без комментариев внутри; проверить typecheck docs
- [x] 2.2 В `custom-cell-types.ts` добавить `badge: defineCellType<BadgeCellConfig & BadgeSize, BadgeColumnConfig & BadgeSize>()({ view: SizedBadgeView })`; проверить, что `CustomCellTypes` принимает `config: { items, size: 'sm' }` и отвергает `size: 'xl'` (typecheck docs с временной ошибочной колонкой, после проверки убрать)
- [x] 2.3 В `custom-grid-shadcn.tsx` и `custom-grid-heroui.tsx` собрать реестр как `{ ...cellTypes, ...customCellTypes, badge: { ...cellTypes.badge, ...customCellTypes.badge } }`; проверить typecheck docs
- [x] 2.4 Создать `apps/docs/shared/data-grid/examples/components/custom-cell-badge-size.tsx` (`export function CustomCellBadgeSizeExample()`, колонки через `createColumns<Row, CustomCellTypes>`, две badge-колонки с `size: 'sm'` и `'md'`, `editingFeature` + `columnFilteringFeature`), зарегистрировать `custom-cell-badge-size` в `manifest.json` (group `cells`) и `sourceFile` в `registry.ts`; проверить в браузере на обоих китах: размеры различаются, editor и filter у badge-колонки китовые (select)

## 3. `columns/custom-cell-types.mdx`

- [x] 3.1 Добавить раздел «Where cell types come from»: схема core `BaseCellTypes` → kit `cellTypes` / `KitCellTypes` → `createDataGrid({ cellTypes })` → `<DataGrid cellTypes>`, и фраза о том, что типы колонок задаёт bundle, а prop меняет только рендереры. Уточнить существующий абзац про мерж по полям (рантайм, не типы). Проверить рендер страницы в `pnpm docs:dev`
- [x] 3.2 Добавить раздел «Extending a built-in type»: рецепт против кита (heroui-импорт и оговорка про shadcn), правило «расширять, а не менять форму», абзац про два параметра у select / badge (`useItems` / `getItem`), `<DataGridDocsExample exampleId='custom-cell-badge-size' />`. Проверить, что код рецепта совпадает по форме с `custom-cell-types.ts`
- [x] 3.3 Переписать раздел «Type-safety» по design (решение 6): проверку делает только bundle `createColumns` / `createColumnHelper`, inline `columns` не проверяются ни по `type`, ни по `config`, и почему. Абзац про опечатку в `cell.type` сохранить
- [x] 3.4 Добавить раздел «For kit authors»: `KitCellTypes` объявлен, а не `typeof cellTypes` (вырождение в `.d.ts`), `BaseCellTypes & { … }` / `Omit<BaseCellTypes, …>`, проверка `_KitCellTypesMatchRegistry` в обе стороны (описать, код не копировать), ссылка на `blocks/cell-types.ts` кита
- [x] 3.5 Обновить frontmatter `description`, если он больше не покрывает страницу; прогнать `pnpm --filter @ez-kit/docs test` (`docs-option-names` зелёный, `PAGE_ENTRIES` не менялся или обновлён осознанно)

## 4. Инпуты: `editing/index.mdx` и `filtering/index.mdx`

- [x] 4.1 `editing/index.mdx`: раздел «Passing your own props to an input» после последней таблицы страницы. Три пути (ключ в `cell.config`, общий для четырёх слотов; замыкание в `editing.component` с условием стабильных колонок и ссылкой на `state/rendering`; `context` + `useGridContext` для меняющихся значений) и ссылка на «Extending a built-in type». Без таблицы опций
- [x] 4.2 `filtering/index.mdx`: короткий вариант того же раздела для `filtering.component` (`InputComponentProps`, `props.config`) со ссылкой на editing; поставить после последней таблицы
- [x] 4.3 Прогнать `pnpm --filter @ez-kit/docs test` и `pnpm --filter @ez-kit/docs lint`; проверить, что обе страницы рендерятся и ссылки ведут на существующие якоря

## 5. Интеграция

- [x] 5.1 Прогнать `pnpm verify:affected`, затем полный gate последовательно (`build` → `lint` → `typecheck` → `test` → `size`); всё зелёное
- [x] 5.2 Решить, нужен ли changeset на `@ez-kit/docs`; если нужен, добавить и проверить, что `scripts/check-changesets.mjs` (часть `pnpm lint`) проходит
  - Решение: не нужен. `@ez-kit/docs` приватный, пакеты не меняются, последние docs-only коммиты (`db07ae37`, `98a19601`) changeset не несут.

## Workflow follow-up

- Отдельно обсудить: проверка inline-колонок по реестру bundle и excess-check неизвестных слотов в `defineCellType`. Обе темы вне этого change.
- Архивировать change после ревью.
