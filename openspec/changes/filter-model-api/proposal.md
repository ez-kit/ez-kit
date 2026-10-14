# Proposal

## Why

Потребитель, у которого в ките есть свой компонент фильтров (компаунд вида
`<Filters value onChange mode='confirm'>` со значением `Record<string, { operator, value }>`),
не может собрать на нём `<DataGrid.FilterPanel />`. Наружу ez-kit отдаёт только готовый
`input: ReactNode`, а то, из чего этот контрол собран, приходится восстанавливать из
`column.columnDef.meta` руками: локализованные операторы, оператор по умолчанию, варианты
значений с facet-счётчиками, тип редактора, пресеты дат, debounce. Каждый такой потребитель
заново пишет то, что `renderFilterInput` уже вычисляет внутри. Вдобавок запись возможна только
по одной колонке, так что «Применить» в режиме `confirm` вызывает `filtering.onChange` N раз.

## What Changes

- Новая публичная **модель фильтра колонки** — чистые данные плюс сеттеры, без JSX и без
  упоминания какого-либо кита: локализованные операторы, оператор по умолчанию, текущий
  оператор и значение, вид редактора для оператора, варианты значений (явные → из
  `cell.config.items` → facet) со счётчиками, пресеты дат для текущего оператора, настройки
  `between`, итоговый debounce, сводка значения, правила смены оператора.
- `DataGridFilterPanelColumn` получает поле `filter` с этой моделью. Его видят
  render-функции `<DataGrid.FilterPanel>` и `<DataGrid.ColumnFilter>`.
- Аргументы render-функции `<DataGrid.FilterPanel>` дополняются пачечным представлением:
  `value` (объект `columnId → StructuredFilterValue` по операторным колонкам с заданным
  значением) и `setValue(next)`, который пишет все фильтры панели за одну запись состояния.
- Новый экспортируемый хук `useColumnFilters()` отдаёт то же самое (`columns`, `value`,
  `setValue`, `hasActiveFilter`) в любом месте под `<DataGrid>`, вне `<DataGrid.FilterPanel>`.
- Новый закрытый набор `FilterEditor` (const-объект + union): `text`, `number`, `date`,
  `boolean`, `select`, `between`, `multiSelect`, `none`, `custom`.
- Встроенный UI (`renderFilterInput`, сводка значения в чипах панели) переводится на ту же
  модель, чтобы встроенные контролы и внешняя панель не могли разойтись. Видимое поведение
  встроенного UI не меняется.
- Изменений, ломающих совместимость, нет: `FilterPanelChip`, `FilterPanelProps`,
  `FilterPanelLayout`, `ColumnFilter`, форма `({ columns, hasActiveFilter })` остаются как есть.

## Capabilities

### New Capabilities

- `data-grid-filter-model`: публичная модель фильтра колонки и пачечная запись фильтров,
  на которых потребитель строит собственную панель фильтров над гридом.

### Modified Capabilities

<!-- В openspec/specs/ пока нет ни одной capability. -->

## Impact

- `packages/data-grid/react/react/src/data-grid/`: `filter-panel.tsx`, `column-filter.tsx`,
  `render-filter-input.tsx`, `date-presets.ts`; новый модуль резолвера модели.
- `packages/data-grid/react/react/src/index.ts`, `types.ts`: новые экспорты (`useColumnFilters`,
  `ColumnFilterModel`, `FilterEditor`, `UseColumnFiltersResult`).
- Кит-слоты не меняются, `FullGridComponents` не затрагивается; shadcn и heroui правок не требуют.
- Документация: `apps/docs/content/docs/data-grid/filtering/variants.mdx` (раздел о собственной
  панели), пример в `apps/docs/shared/data-grid/examples/` с регистрацией в manifest/registry.
- Changeset: minor для `@ez-kit/data-grid-react`.
- `size-limit` для `dist/index.js` пакета `data-grid-react`: небольшой рост; перепроверить бюджет.
