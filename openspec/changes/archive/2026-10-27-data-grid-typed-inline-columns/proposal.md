# Proposal

## Why

Колонки, переданные в `columns` inline (`<DataGrid columns={[…]}>`, `useDataGrid({ columns: […] })`),
сейчас не проверяются ни по `cell.type`, ни по `cell.config`. `TableConfig.columns` типизирован как
`ColumnDef<TRow, any>[]`. Опечатка в id типа или в ключе config компилируется и в рантайме тихо
превращается в сырое значение без рендерера. Проверка есть только у column builder-ов
(`createColumns` / `createColumnHelper`).

Докблок `TableConfig.columns` объясняет компромисс так: второй type-параметр на `TableConfig`
сломал бы вывод `TRow`. Это верно для параметра, который нужно **выводить** на месте вызова. Но у
bundle (`createDataGrid` и kit-овый `DataGrid`) реестр **уже известен**: `DataGridBundle` хранит
`TCellTypes` и отдаёт его `createColumns`, а `DataGrid` / `useDataGrid` его не используют.
TS-проба на собранных пакетах подтвердила:

- если bundle-овский `useDataGrid` типизирует `columns` своим реестром, `TRow` по-прежнему
  выводится из `data`;
- `type: 'nosuch'` и лишний ключ config отвергаются;
- `value` в `cell.component` типизирован по `accessorKey`;
- колонки из непривязанного `createColumns<Row>` принимаются.

## What Changes

- Bundle-овские `DataGrid` и `useDataGrid` (результат `createDataGrid` и prebuilt `DataGrid` обоих
  китов) типизируют `columns` реестром bundle, расширенным реестром из `cellTypes` конкретного grid:
  `ColumnDef<TRow, TCellTypes & NoInfer<TExtra>>[]`. `NoInfer` обязателен: без него TS выводит
  `TExtra` из самих колонок и молча принимает неизвестный id (это показала проба).
- Bare `useDataGrid` / `DataGrid` из `@ez-kit/data-grid-react` остаются без проверки. Их реестр
  приходит через `CellTypesProvider` в рантайме, и типам его не видно.
- **BREAKING** (только типы): перестаёт компилироваться код, который передаёт bundle-у inline-колонки
  с неизвестным id или ключом config, а также колонки, собранные под реестр, которого у bundle нет
  (и который не передан через `cellTypes` этого grid). Рантайм не меняется.
- Новый ADR: bundle типизирует колонки своим реестром. Решение пересматривает компромисс из
  докблока `TableConfig.columns`, сам докблок обновляется.
- Доки: раздел «Type-safety» на `custom-cell-types.mdx` описывает новую проверку. Исправлен
  сниппет «…or per grid, with the `cellTypes` prop»: `createColumns<Order>([{ cell: { type: 'status' } }])`
  не компилируется, потому что непривязанный `createColumns` без реестра отвергает `'status'`.

## Capabilities

### New Capabilities

- `data-grid-column-typing`: откуда тип колонок берёт допустимые `cell.type` и `cell.config` —
  builder-ы, bundle-овские `DataGrid` / `useDataGrid`, реестр конкретного grid и bare-хук пакета.

### Modified Capabilities

Нет.

## Impact

- `packages/data-grid/react/react/src/create-data-grid.tsx`: `DataGridBundle`, `BoundDataGrid`,
  `BoundDataGridProps`, `BoundUseDataGridConfig`, `ContextBoundDataGrid` / `ContextBoundUseDataGrid`,
  а также путь bundle без `features` и без `context` (сейчас там просто `typeof DataGrid`).
- `packages/data-grid/core/src/types.ts`: докблок `TableConfig.columns`.
- Китовые `data-grid.tsx` уже аннотированы `DataGridBundle<KitCellTypes, KitFeatures>`, поэтому
  проверку получают автоматически. Нужно убедиться, что собственные тесты, stories и примеры китов
  проходят.
- `apps/docs`: все примеры, передающие колонки в bundle-овский или kit-овый `DataGrid`, проходят
  typecheck как есть или исправляются; `custom-cell-types.mdx`.
- Новый ADR `openspec/decisions/0016-…` и правило со ссылкой в `AGENTS.md`.
- Changeset: `@ez-kit/data-grid-react` minor с пометкой о breaking-изменении типов. Китовые пакеты
  тоже, если меняется их публичный тип (`@ez-kit/data-grid-heroui`; shadcn в changeset не попадает).
- Риски, которые проверяются первыми: вывод generic-компонента из union-props JSX `<DataGrid>`,
  время `tsc` на docs-app, читаемость ошибок.
