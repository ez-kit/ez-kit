# Proposal

## Why

Встроенные операторы фильтра зашиты в core (`TEXT_OPERATORS`, `DEFAULT_OPERATORS_BY_TYPE`, реестр
`buildOperatorRegistry`), а поведение грида привязано к их id: `between` открывает диапазон,
`in` / `notIn` — мультивыбор, `requiresInput` проверяется в четырёх файлах. Из-за этого нельзя
сменить набор операторов для всех колонок одного типа ячейки, нельзя сделать свой оператор с
диапазоном или списком (`notBetween`, `excludesAny`), подписи операторов живут в отдельном словаре
с жёсткой картой групп, а `defineCellType({ operators, defaultOperator })` объявлены и нигде не
читаются. Заодно `import { FilterOperator }` — константа из 14 строк — стоит около 11 KB, а
`createTable` тянет все встроенные операторы даже в гриде без фильтров.

## What Changes

- Операторы становятся конфигом бандла, по образцу `features` / `allDataGridFeatures`:
  `createDataGrid({ operators: { byType, defaultByType } })`. `byType` — объект «тип ячейки →
  массив определений»; он проходит через все слои опций, и верхний слой заменяет набор только тех
  типов, которые называет. `operators` ничего не включает: включение по-прежнему
  `filtering.operators`.
- Готовый набор `defaultOperators` и константы `FilterOperator`, `DEFAULT_OPERATOR_ICONS` переезжают
  на новый subpath `@ez-kit/data-grid-core/operators`. Готовые `DataGrid` обоих китов подставляют
  `defaultOperators` в своём `data-grid.tsx`; составной `createDataGrid` получает операторы только
  явно.
- **BREAKING:** `FilterOperatorDef` — размеченное объединение по обязательному полю
  `input: 'none' | 'single' | 'range' | 'list'` (const `OperatorInput`). `requiresInput` удалён.
  `filterFn` получает значение формы своего `input` и не вызывается с пустым значением.
- **BREAKING:** грид выводит поведение только из `input`, никогда из id: вид редактора, правила
  смены оператора, чип активного фильтра, пустые значения пачечной записи, выбор дата-пресетов.
  Свой оператор с `input: 'range'` получает диапазон, с `'list'` — мультивыбор.
- **BREAKING:** подпись оператора — только `label: string` в определении.
  `messages.operators.{text,number,date,boolean,multi,empty}` и `localizeOperators` удалены;
  переведённый набор проект собирает сам. Подписи дата-пресетов переезжают из
  `messages.operators.presets` в `messages.filtering.presets`.
- **BREAKING:** удалены табличный `filtering.operators.items` (реестр) и
  `defineCellType({ operators, defaultOperator })`. Строковый id в колоночном
  `filtering.operators.items` ищется только в наборе типа ячейки этой колонки.
- Удалена неопубликованная опция `icons: { operators }` (из pending change
  `data-grid-operator-icons`): иконка задаётся только в определении. `DEFAULT_OPERATOR_ICONS`
  остаётся картой `id → знак`.
- Табличный `filtering.operators: true` при пустом наборе операторов даёт одно предупреждение в
  development. Восстановленный фильтр с id, которого нет в наборе колонки, даёт одно
  предупреждение на колонку и, как и раньше, не фильтрует.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `data-grid-filter-operators`: источник операторов меняется с реестра таблицы на набор бандла по
  типу ячейки; определение с `input`; подпись и иконка только из определения; готовый набор и его
  subpath; поведение без набора; неизвестный id.
- `data-grid-operator-control`: оператор без значения и источник иконки определяются по `input` и
  определению, а не по `requiresInput` и `icons.operators`.
- `data-grid-filter-model`: метки операторов из определения, а не из словаря; редактор, смена
  оператора, пустые значения и пресеты выводятся из `input`.

## Impact

- `@ez-kit/data-grid-core`: `features/operators/operators.ts` (определения, типы, удаление реестра и
  локализации), новый entry `./operators` в `package.json` и `tsup`, `TableConfig.operators`,
  `create-table-options.ts`, `column/map-columns/resolve-filtering.ts`, `messages/{types,defaults}.ts`,
  `index.ts`, `size-limit`.
- `@ez-kit/data-grid-react`: `create-data-grid.tsx`, `data-grid-options-context.tsx`,
  `use-data-grid.ts`, `cell-types-context.tsx`, `data-grid/{filter-model,date-presets,filters-batch,
active-filters-bar,render-filter-input,operator-icons}.ts(x)`, `types.ts` (`GridIcons`).
- Киты: `data-grid.tsx` обоих китов подставляют `defaultOperators`; `OperatorSelect` не меняется.
- Docs: `filtering/operators.mdx`, `localization.mdx`, `filtering/date-range.mdx`, примеры
  `filter-operators-*`, `localization.tsx`; `test/docs-options/page-type-map.ts`,
  `test/tree-shaking.test.ts`.
- `AGENTS.md`: пункт «One filter-operator vocabulary» и новое правило «поведение по `input`».
- Changesets: правка pending `data-grid-operator-icons.md` на месте и новый changeset для core,
  react, heroui (без `@ez-kit/data-grid-shadcn`).
