# Proposal

## Why

С `@ez-kit/data-grid-core` 0.7.0 (переход на TanStack Table v9, #246) грид без `pagination`
показывает только первую страницу строк, если в наборе фич зарегистрирован `paginatedRowModel` —
а он есть в `allDataGridFeatures`, к которому привязан готовый `DataGrid` обоих китов.
`<DataGrid data={fiftyRows} columns={columns} />` рисует 10 строк, без элементов пагинации, с
`aria-rowcount="51"`; остальные 40 строк недостижимы. То же при `pagination: false` и
`pagination: { enabled: false }`. Засеянный `initialState.pagination.pageIndex` без включённой
пагинации прячет и первые строки.

Это частный случай общего нарушения собственной модели ядра — «`features` — что есть в бандле,
конфиг — чем пользуется экземпляр». Модели строк в v9 — слоты набора, и TanStack применяет
зарегистрированную модель независимо от того, включена ли фича в конфиге. Сейчас так ведут себя
три среза: пагинация режет всегда (её состояние засевает само ядро), а засеянные `grouping` и
`columnFilters` группируют и фильтруют строки при выключенных `grouping` и `filtering`. До #246
ядро подключало эти модели только при включённой фиче. Изменение `infinite-pagination-unsliced`
закрыло тот же дефект для одного режима пагинации; это изменение закрывает класс целиком.

## What Changes

- Выключенная фича не трансформирует строки, даже если её модель строк зарегистрирована в
  наборе. Её состояние остаётся в store, не отбрасывается и вступает в силу, когда фичу
  включают — в том числе на живом экземпляре, без перемонтирования.
- Пагинация режет строки только в клиентском постраничном режиме. Без `pagination`, при
  `pagination: false` и `pagination: { enabled: false }` `getRowModel()` возвращает весь набор.
  Ядро ставит `manualPagination` безусловно, булевым значением; обе существующие ветки
  (`mode: 'infinite'`, `manual: true`) становятся частными случаями одного правила.
- Засеянная группировка при выключенной `grouping` не группирует строки.
- Засеянные колоночные фильтры при выключенной `filtering` не фильтруют строки; глобальный поиск
  при этом работает по-прежнему, если `globalFiltering` включён.
- Засев состояния, меняющего строки (`initialState.pagination`, `.grouping`, `.columnFilters`,
  `.sorting`, `.globalFilter`, `.expanded`, `.rowPinning`), при выключенной фиче даёт одно
  dev-предупреждение — по образцу существующего `warnUnreachableSeed`. Для сортировки, поиска,
  раскрытия и закрепления строк поведение строк уже верное; меняется только предупреждение.
- `@ez-kit/data-grid-react`: ARIA определяет полноту набора по режиму пагинации, а не по сырому
  `manualPagination`. Грид без пагинации не пишет `aria-rowcount` / `aria-rowindex`, а
  `row-count-status` объявляет полный итог.
- Наблюдаемые изменения публичных значений (не типов): `table.options.manualPagination` равен
  `true` у каждого грида без клиентской пагинации; у колонок грида с выключенной `filtering`
  в `options.columns` лежит пропускающий `filterFn`. Changeset — minor для `data-grid-core` и
  `data-grid-react`.

## Capabilities

### New Capabilities

- `data-grid-disabled-features`: как выключенная в конфиге фича ведёт себя при
  зарегистрированной модели строк — набор строк, судьба её состояния, переключение на лету,
  dev-предупреждения о засеве и ARIA-итог для грида без пагинации.

### Modified Capabilities

<!-- Нет: в openspec/specs/ пока нет ни одной спеки. Требования изменения
     infinite-pagination-unsliced (ещё не заархивировано) не меняются — его режимы остаются
     сценариями «без изменений» в новой спеке. -->

## Impact

- `packages/data-grid/core/src/create-table/create-table-options.ts` — гейты `manualPagination`
  и `manualGrouping`, dev-предупреждения о засеве выключенных фич.
- `packages/data-grid/core/src/column/map-columns/` — пропускающий `filterFn` при выключенной
  `filtering`.
- `packages/data-grid/react/react/src/data-grid/aria-state.ts` — `hasPartialRowSet`,
  `hasTrustedRowTotal`.
- Тесты: `create-table.test.ts`, `create-table-options.test.ts`, `aria-state.test.tsx` (тест
  «writes neither when the DOM already holds every row» маскировал дефект тремя строками),
  `feature-optionality.test.tsx`, render-тесты готового `DataGrid` в shadcn и heroui.
- Затронуты опубликованные версии: core 0.7.0–0.10.0, react 0.8.0–0.11.0, heroui 0.8.0–0.11.0,
  shadcn-реестр с #246. Демо в `apps/docs` дефект не показывают: каждый пример передаёт узкий
  набор без лишних моделей.
- Документация: `feature-set.mdx` (раздел про один набор на оба режима пагинации обобщается),
  страницы пагинации, фильтрации и группировки — проверка по смыслу, а не только по именам.
- Зависимости не меняются.
