# Proposal

## Why

С `@ez-kit/data-grid-core` 0.7.0 режим `pagination.mode: 'infinite'` показывает только одну
страницу строк, если в наборе фич зарегистрирован `paginatedRowModel` — а он есть в
`allDataGridFeatures`. `onLoadMore` срабатывает, `data` растёт, но TanStack режет строки по
`pageIndex` / `pageSize`, и подгрузка выглядит сломанной. Регрессию внёс переход на TanStack v9
(#246): до него ядро само не подключало модель среза в режиме `infinite`, после — переложило это
на потребителя через dev-предупреждение «уберите `paginatedRowModel` из набора».

Это противоречит собственной модели ядра: `features` — что есть в бандле, конфиг — чем
пользуется экземпляр. Общий `<AppDataGrid>` с одним набором фич не может рисовать ленту в одном
разделе и постраничную таблицу в другом, а потребители (UI Kit) держат обходной путь
`infiniteDataGridFeatures`.

## What Changes

- Ядро в режиме `pagination.mode: 'infinite'` отключает срез строк само: таблица получает
  `manualPagination: true`, поэтому `getRowModel()` возвращает все накопленные строки при любом
  наборе фич, включая `allDataGridFeatures`.
- Удаляется dev-предупреждение «`paginatedRowModel` is registered in `features`, so the rows are
  still sliced to one page».
- В режиме `infinite` начальный `pageIndex` всегда 0: засеянный `initialState.pagination.pageIndex`
  не сдвигает ни строки, ни ARIA-индексы (в development об этом предупреждают).
- `@ez-kit/data-grid-react`: ARIA перестаёт читать `manualPagination` как признак серверной
  пагинации в режиме `infinite`. `aria-rowcount="-1"`, пока `hasNextPage`, и атрибута нет, когда
  загружено всё; `aria-rowindex` не смещается на `pageIndex · pageSize`.
- Документация, примеры и тест `example-features.test.ts`, закреплявшие обходной путь
  («без `paginatedRowModel`»), приводятся к новому поведению.
- Changeset: **minor** для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` (решение
  пользователя — в одном PR много изменений).

Обратная совместимость: набор без `paginatedRowModel` продолжает работать как прежде, так что
обходной путь у потребителей не ломается, его можно убрать в любой момент.

## Capabilities

### New Capabilities

- `data-grid-infinite-pagination`: как грид в режиме `pagination.mode: 'infinite'` показывает
  накопленные строки независимо от набора фич, как в этом режиме ведут себя `pageIndex` /
  `pageSize` и что грид сообщает вспомогательным технологиям о числе строк.

### Modified Capabilities

<!-- Нет: в openspec/specs ещё нет ни одной спеки. -->

## Impact

- `packages/data-grid/core/src/create-table/create-table-options.ts` — опции таблицы, засев
  `pagination`, удаление предупреждения.
- `packages/data-grid/react/react/src/data-grid/aria-state.ts`, `aria-row-index.tsx` — ARIA в
  режиме `infinite`.
- Тесты: `create-table-options.test.ts`, `features/infinite/infinite.test.ts`,
  `aria-state.test.tsx`, `apps/docs/test/example-features.test.ts` (+ `example-features/sets.ts`).
- Документация: `pagination/infinite-scroll.mdx`, `feature-set.mdx`, infinite-примеры в
  `apps/docs/shared/data-grid/examples/components/`, docblock'и, README.
- `.changeset/` — minor для `data-grid-core` и `data-grid-react`.
- Потребители (UI Kit): после релиза могут удалить `infiniteDataGridFeatures`.
