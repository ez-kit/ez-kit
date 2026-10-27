# Proposal

## Why

Срез загрузки `LoadingState` требует все четыре поля (`isPending`, `isFetching`, `isError`, `error`)
и на входе `state.loading`, и на входе `initialState.loading`. В самом частом случае — список
грузится один раз через `useState`, ошибки загрузки нет — потребитель пишет заглушки
`{ isPending, isFetching: false, isError: false, error: null }`. В документации и примерах
(`fallbacks.tsx`, `_use-paged-users.ts`, `CrudServerExample.tsx`, `ProductionFeedExample.tsx`,
JSDoc `TableConfig.initialState`) это читается так, будто `error: null` что-то значит.

## What Changes

- `state.loading` принимает частичный объект: недостающие флаги считаются `false`, `error` — `null`.
  Нормализация выполняется один раз, на входе в стор; в сторе, в селекторах и в `onStateChange` срез
  остаётся полным `LoadingState`.
- `initialState.loading` тоже принимает частичный объект и сливается с дефолтом вместо замены
  целиком. Для полного объекта результат прежний, частичный раньше не компилировался.
- Новый публичный тип `ControlledTableState<TFeatures>` в `@ez-kit/data-grid-react` — тип опции
  `state`. Ключ `loading` в нём есть только при зарегистрированном `loadingFeature`, и он
  частичный; остальные срезы — как в `Partial<TableState<TFeatures>>`.
- В режиме разработки грид предупреждает, если в `loading` передан объект с посторонними ключами и без
  единого из флагов `isPending` / `isFetching` / `isError` (например, результат `useSWR` целиком):
  частичный тип сделал бы такую ошибку тихим no-op, который раньше ловил компилятор.
- Равный по полям объект `loading` больше не перезаписывает слайс на каждом коммите, а результат
  `useQuery` — на каждом изменении `data`.
- Документация, JSDoc и примеры упрощаются до `{ isPending }` / `{ isPending, isFetching }` там, где
  остальные поля были заглушками.
- Опция `loading: boolean` не добавляется: у опции остаётся одна форма. Поведение отрисовки и
  приоритеты флагов не меняются. `InfiniteState` не затрагивается — его пишет только сам грид.

Изменение не ломающее: minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`.

## Capabilities

### New Capabilities

- `data-grid-loading-state`: контракт среза загрузки — какие формы принимают `state.loading` и
  `initialState.loading`, как недостающие поля дополняются, что видят стор и `onStateChange`, когда
  грид предупреждает о неузнанном объекте и когда controlled-значение перезаписывает слайс.

### Modified Capabilities

<!-- Нет: требования `data-grid-render-isolation` не меняются, новое требование об идентичности
     среза загрузки живёт в новой capability. -->

## Impact

- `packages/data-grid/core/src/types.ts` — JSDoc `LoadingState`, `InitialTableState` (переопределение
  `loading`), пример в JSDoc `TableConfig.initialState`.
- `packages/data-grid/core/src/features/loading/loading.ts` — слияние seed в `getInitialState`,
  dev-предупреждение.
- `packages/data-grid/react/react/src/use-data-grid.ts` — тип опции `state`, нормализация
  controlled-значения перед публикацией и фильтром эха.
- `packages/data-grid/react/react/src/index.ts`, `public-api.test.ts` — экспорт
  `ControlledTableState`.
- `apps/docs/content/docs/data-grid/fallbacks.mdx`, `state/controlled.mdx` и четыре примера в
  `apps/docs/shared/data-grid/examples/components/`.
- `.changeset/` — minor для двух пакетов. Кит shadcn не затрагивается.
