# Tasks

## 1. Core: объявление и разрешение полей

- [x] 1.1 Выделить из `mapColumns` общий резолвер `filtering` + `cell` → `ColumnFilteringMeta` / `filterFn` без изменения поведения колонок; проверить: `pnpm --filter @ez-kit/data-grid-core test` зелёный без правок существующих тестов
- [x] 1.2 Добавить тип поля и `FilteringConfig.fields` (`id`, `header: string`, `cell?`, `filtering?` — словарь колонки) с docblock'ами; проверить: `pnpm --filter @ez-kit/data-grid-core typecheck`
- [x] 1.3 Разрешать поля в `createTableOptions` через общий резолвер с выключенным `faceted` и класть результат в `grid`; проверить юнит-тестом, что поле с `operators: true` и `cell: { type: 'select', config: { items } }` получает операторы `select` и `items`, а под `filtering.faceted: true` остаётся без `faceted`
- [x] 1.4 Бросать ошибку при коллизии id поля с колонкой (включая системные) и с другим полем; проверить двумя юнит-тестами, что текст ошибки содержит совпавший id
- [x] 1.5 Без `filtering.manual: true` предупреждать в режиме разработки один раз и не класть поля в `grid`; проверить юнит-тестом на `console.warn` с `filtering.manual` и на пустой список полей

## 2. React: цель фильтра и переименование модели

- [x] 2.1 Ввести внутреннюю цель фильтра (колонка / поле) и одну функцию сборки списка целей (колонки по порядку, затем поля); проверить юнит-тестом порядок `name, status, warehouse, region` и `source.kind` у каждой цели
- [x] 2.2 Перевести `resolveColumnFilter` → `resolveFilter(target, …)`, `ColumnFilterModel` → `FilterModel` с `id`, `OperatorColumnFilterModel` → `OperatorFilterModel`; проверить: существующие `column-filter-model.test.tsx` проходят после механической замены `columnId` → `id`, плюс новый тест модели поля без фасетных `items`
- [x] 2.3 Запись значения поля через `table.setColumnFilters` (заменить / удалить одну запись); проверить юнит-тестом, что `filter.setValue(v)` и `setValue(undefined)` у поля меняют только его запись, а `filtering.onChange` получает массив и с колонкой, и с полем
- [x] 2.4 Перевести `renderFilterInput` с `header` на цель, а `HeaderCell` — на цель из `header.column`; проверить: `render-filter-input.test.tsx` и тесты заголовка зелёные, плюс тест, что `filtering.component` поля получает `value` / `onChange` / `config`

## 3. React: панель, хук, одиночный фильтр

- [x] 3.1 `ColumnFiltersValue` → `FiltersValue`; пачечная запись знает ключи всех целей с операторами, поле без `manual` — неизвестный ключ с предупреждением; проверить: `column-filters.test.tsx` зелёный плюс тесты «колонки и поля одной записью» и «ключ поля без manual»
- [x] 3.2 `useColumnFilters` → `useFilters`, `columns` → `filters`, `DataGridFilterPanelColumn` → `DataGridFilterTarget` с `source`; гейт пустоты учитывает поля; проверить: `filter-panel.test.tsx` зелёный плюс тест «грид, где фильтруются только поля» (хук отдаёт одну цель, панель рендерит чип)
- [x] 3.3 `ColumnFilter` → `Filter` с пропом `id`, компаунд-член `DataGrid.Filter`, именованный экспорт `DataGridFilter`, обновить `index.ts`; проверить: `column-filter.test.tsx` переименован и зелёный, плюс тест `<DataGrid.Filter id='warehouse' />` и `id='nope'`; `public-api.test.ts` / `index.test.ts` отражают новые имена; `tree-shaking.test.ts` зелёный (плоский литерал без spread)
- [x] 3.4 Обновить README `@ez-kit/data-grid-react` (новые имена, раздел про поля); проверить: в README нет `useColumnFilters` / `ColumnFilter` (`grep`)

## 4. React: чипы и черновик

- [x] 4.1 `ActiveFiltersBar` строит чипы по целям, а не по `table.getColumn`; чип поля — `kind: 'column'`, метка из `header`, снятие через цель; проверить: `active-filters-bar.test.tsx` зелёный плюс тесты «чип поля» и «снятие чипа поля»
- [x] 4.2 Проверить тестом сценарий «поле в черновике»: `onChange` молчит, `isDirty()` — `true`, после `apply()` — одна запись поля; при расхождении поправить draft-фичу

## 5. Киты и документация

- [x] 5.1 Обновить импорты переименованных типов и `ColumnFilter` в китах shadcn / heroui (если есть); проверить: `pnpm --filter @ez-kit/data-grid-shadcn typecheck` и `pnpm --filter @ez-kit/data-grid-heroui typecheck`
- [x] 5.2 Перевести примеры `custom-filter-panel.tsx`, `example-team-members.tsx`, `example-task-board.tsx` и страницы `filtering/variants.mdx`, `layout/composition.mdx`, `advanced/react.mdx`, `examples.mdx` на новые имена; проверить: `grep -rn "useColumnFilters\|ColumnFilter\b\|columnId" apps/docs` не находит старых имён в API фильтров
- [x] 5.3 Добавить пример с серверными полями (manifest + registry) и раздел документации о `filtering.fields` с таблицей опций поля; обновить `page-type-map` в `docs-option-names`; проверить: `pnpm --filter @ez-kit/docs test` зелёный, пример открывается в обоих китах
- [x] 5.4 Добавить changeset: minor `@ez-kit/data-grid-core` (новая опция) и minor `@ez-kit/data-grid-react` с breaking-таблицей переименований из design.md; без `@ez-kit/data-grid-shadcn`; проверить: `pnpm lint` (`check-changesets.mjs`) зелёный

## 6. Интеграция

- [x] 6.1 Полный гейт последовательно: `build`, `lint`, `typecheck`, `test`, `size`; проверить: все пять зелёные, бюджеты `size-limit` не превышены
- [x] 6.2 Проверить в браузере на docs-примере в обоих китах: фильтр поля из панели попадает в `onChange` вместе с колонкой, чип поля появляется и снимается

## Workflow follow-up

- Code review изменения (typescript-reviewer + react-reviewer) до PR в `develop`.
- Archive change после merge.
