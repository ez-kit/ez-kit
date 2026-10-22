# Tasks

## 1. Модель фильтра колонки

- [x] 1.1 Добавить `FilterEditor` (const-объект + union: `text`, `number`, `date`, `boolean`, `select`, `between`, `multiSelect`, `none`, `custom`) и тип `ColumnFilterModel` с дискриминатором `hasOperators` (design D4, D5) в `packages/data-grid/react/react/src/data-grid/column-filter-model.ts`; проверка — `pnpm --filter @ez-kit/data-grid-react typecheck` проходит
- [x] 1.2 Написать падающие тесты `column-filter-model.test.ts` на каждое требование спека о модели: локализация операторов и сохранение метки пользовательского оператора, `operator` / `value` / `defaultOperator`, `editor` и `editorFor` по всем веткам (включая `progress` → `number`, `badge` + `equals` → `select`, `filtering.component` → `custom`), `items` с facet-счётчиками, `presets` по оператору, `debounce` колонки и таблицы, `nextValueForOperator` (в `between`, из `between`, `requiresInput: false`, с сохранением значения), колонка без операторов; проверка — тесты падают на отсутствии реализации
- [x] 1.3 Реализовать `resolveColumnFilter(column, { messages, tableDebounce })`, перенеся `resolveFilterItems`, `resolveOptionLabel`, `formatFilterValue` и правила `onOperatorChange` из `render-filter-input.tsx` / `filter-panel.tsx` без изменения их логики; проверка — тесты из 1.2 зелёные

## 2. Встроенный UI поверх модели

- [x] 2.1 Переписать `renderFilterInput` на диспатч по `model.editor` (design D2), сохранив запасной путь для `multiSelect` без `MultiSelectFilter` и выбор компонента из реестра типов ячеек; проверка — `render-filter-input.test.tsx`, `column-filter-debounce.test.tsx` зелёные без правок ожиданий
- [x] 2.2 Перевести `valueDisplay` / `hasValue` в `useFilterPanelColumns` на модель и удалить дубли `formatFilterValue` / `resolveOptionLabel` из `filter-panel.tsx`; проверка — `filter-panel.test.tsx` и `column-filter.test.tsx` зелёные без правок ожиданий
- [x] 2.3 Добавить поле `filter: ColumnFilterModel` в `DataGridFilterPanelColumn` и тест, что render-функции `<DataGrid.FilterPanel>` и `<DataGrid.ColumnFilter>` его получают, а системные колонки в `columns` не попадают; проверка — новый тест в `filter-panel.test.tsx` зелёный
- [x] 2.4 Прогнать e2e фильтров в обоих китах (`apps/docs/e2e/packages/data-grid/filtering/*.spec.ts`) против этой ветки; проверка — зелёные в `shadcn` и `heroui`

## 3. Пачечная запись и хук

- [x] 3.1 Написать падающие тесты пачечной записи (`column-filters.test.tsx`): один вызов `filtering.onChange` на `setValue` для трёх колонок; отсутствующий ключ снимает фильтр; простой фильтр колонки без операторов сохраняется; пустые значения (`[]`, `''`, `{}`, диапазон без границ) отбрасываются, а `isEmpty` сохраняется; неизвестный ключ игнорируется с предупреждением в dev; под `draft` + `manual` `onChange` срабатывает только на `table.draft.apply()`; проверка — тесты падают
- [x] 3.2 Реализовать `isEmptyFilterValue` и `setValue(next)` уровня панели через `table.setColumnFilters(updater)` (design D3), а также `value` (только операторные колонки с фильтром); проверка — тесты из 3.1 зелёные
- [x] 3.3 Переименовать `useFilterPanelColumns` в `useColumnFilters`, вернуть из него `UseColumnFiltersResult` (`columns`, `value`, `setValue`, `hasActiveFilter`), передать `value` / `setValue` в аргументы render-функции `<DataGrid.FilterPanel>`; добавить тесты: хук работает в компоненте внутри `<DataGrid.Toolbar>` и возвращает `undefined` при выключенной фильтрации; проверка — тесты зелёные
- [x] 3.4 Экспортировать `useColumnFilters`, `FilterEditor`, `ColumnFilterModel`, `UseColumnFiltersResult` из `packages/data-grid/react/react/src/index.ts`; добавить случай `{ useColumnFilters }` в `apps/docs/test/tree-shaking.test.ts` и записать полученный набор точек входа; проверка — `pnpm --filter @ez-kit/docs test -- tree-shaking` зелёный

## 4. Документация и пример

- [x] 4.1 Добавить пример `custom-filter-panel.tsx` в `apps/docs/shared/data-grid/examples/components/`: панель над гридом на собственном компаунде с черновиком и кнопками «Применить / Сбросить», построенная через `filters.value` / `filters.setValue` и `filter.editor`, без внутренних комментариев в исходнике; зарегистрировать в `manifest.json` и `registry.ts`; проверка — `/examples/shadcn/<id>` и `/examples/heroui/<id>` рендерятся в `pnpm docs:dev`, а «Применить» вызывает один `onChange`
- [x] 4.2 Добавить в `apps/docs/content/docs/data-grid/filtering/variants.mdx` раздел о собственной панели: поля модели, `FilterEditor`, пачечный `setValue` и его правила (пустые значения, колонки без операторов, рекомендация `operators: true`), сравнение `value` по содержимому, не включать `draft` грида при собственном черновике; если раздел добавляет таблицу опций — классифицировать её в `apps/docs/test/docs-options/page-type-map.ts`; проверка — `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный
- [x] 4.3 Обновить JSDoc `DataGridFilterPanelProps.children` и `DataGridColumnFilterProps.children`, упомянув `filter`, `value`, `setValue`; проверка — `pnpm --filter @ez-kit/data-grid-react lint` зелёный

## 5. Выпуск и интеграционная проверка

- [x] 5.1 Добавить changeset (minor, только `@ez-kit/data-grid-react`, без `@ez-kit/data-grid-shadcn`); проверка — `node scripts/check-changesets.mjs` проходит
- [x] 5.2 Прогнать полный гейт последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size`; если `size` для `data-grid-react` упал, поправить бюджет с измерением в том же изменении; проверка — все пять команд зелёные
