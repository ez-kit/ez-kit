# Tasks

## 1. Core: частичный seed `initialState.loading`

- [x] 1.1 В `core/src/features/loading/loading.test.ts` добавить падающие тесты: `initialState.loading = { isPending: true }` даёт `{ isPending: true, isFetching: false, isError: false, error: null }`; полный seed сохраняется по всем полям; без seed срез равен `INITIAL_LOADING_STATE`. Проверка: `pnpm --filter @ez-kit/data-grid-core test` падает на частичном seed
- [x] 1.2 В `InitialTableState` (`core/src/types.ts`) добавить `loading?: Partial<LoadingState>` рядом с `pagination` с JSDoc-обоснованием; в `loadingFeature.getInitialState` слить seed с `INITIAL_LOADING_STATE`, оставив остальной `initialState` развёрнутым последним. Проверка: тесты 1.1 зелёные, `pnpm --filter @ez-kit/data-grid-core typecheck` чистый
- [x] 1.3 Dev-предупреждение для seed с посторонними ключами и без флагов через `utils/warn-once` под `IS_DEV`, с тестом на SWR-подобный объект и на молчание для `{}`, `{ error }`, `{ isPending }`. Проверка: тесты core зелёные
- [x] 1.4 Обновить JSDoc `LoadingState` (вход частичный, недостающие поля дополняются, срез всегда полный) и пример в JSDoc `TableConfig.initialState` на `{ loading: { isPending: true } }`. Проверка: `pnpm --filter @ez-kit/data-grid-core lint`

## 2. React: частичный `state.loading`

- [x] 2.1 Unit-тесты приватного нормализатора (новый модуль рядом с `use-data-grid.ts`): дополнение дефолтами; сужение до четырёх ключей; явный `error: undefined` сохраняется; переиспользование прошлого `loading` при равных полях; `undefined` и `state` без `loading` проходят как есть; dev-предупреждение на SWR-подобный объект и молчание на `{}`, `{ error }`, `{ isPending }`, результат `useQuery`-формы. Проверка: тесты падают до реализации
- [x] 2.2 Реализовать нормализатор (локальные дефолты, pick по `key in`, сравнение по четырём полям, приватный `warnOnce` под `IS_DEV`). Проверка: тесты 2.1 зелёные
- [x] 2.3 Подключить в `useDataGrid`: хранить прошлый результат в ref, класть нормализованный объект в `controlledStateRef.current`, чтобы его читали обе публикации и `isControlledEcho`. Проверка: существующие тесты `use-data-grid*.test.tsx`, `refetch-overlay.test.tsx`, `feature-optionality.test.tsx` зелёные без правки ожиданий
- [x] 2.4 Интеграционные тесты на рендер: `{ isPending: true }` — fallback загрузки; `{ isFetching: true }` со строками — оверлей; `{ isError: true, error }` — срез в `table.store.state`; `{}` и отсутствие `loading` — ни fallback, ни оверлей; перерендер хоста с равным inline-литералом не меняет ссылку среза и не вызывает `onStateChange`; смена `isPending` публикуется без эха. Проверка: `pnpm --filter @ez-kit/data-grid-react test`
- [x] 2.5 Тест сверки: локальные дефолты нормализатора равны `table.initialState.loading` у грида без seed. Проверка: тест зелёный
- [x] 2.6 Объявить `ControlledTableState<TFeatures>` (гомоморфный mapped type), перевести на него `UseDataGridConfig.state` с обновлённым JSDoc, экспортировать из `react/react/src/index.ts`, добавить имя в `public-api.test.ts`; type-тест: `{ loading: { isPending: true } }` и `Partial<TableState<F>>` присваиваются, без `loadingFeature` ключ `loading` недоступен. Проверка: `pnpm --filter @ez-kit/data-grid-react typecheck` и тесты зелёные; оба кита (`shadcn`, `heroui`) проходят `typecheck`

## 3. Документация и примеры

- [x] 3.1 `apps/docs/content/docs/data-grid/fallbacks.mdx` (раздел Loading) и `state/controlled.mdx`: описать частичную форму, дефолты и что результат `useQuery` передаётся целиком; оставить пример с четырьмя полями из запроса там, где они реальные. Проверка: `docs-option-names.test.ts` зелёный, таблица `state.loading` по-прежнему 4 имени
- [x] 3.2 Упростить заглушки до `{ isPending }` / `{ isPending, isFetching }` в `fallbacks.tsx`, `infinite-scroll/_use-paged-users.ts` (вместе с рукописным типом в строке 17), `crud/CrudServerExample.tsx`, `production/ProductionFeedExample.tsx`, без внутренних комментариев в примерах. Проверка: `pnpm --filter @ez-kit/docs typecheck` и `lint` чистые; `rg "isError: false, error: null" apps packages` ничего не находит

## 4. Changeset и общий прогон

- [x] 4.1 `pnpm changeset`: minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`, без `@ez-kit/data-grid-shadcn`; в тексте — частичная форма обоих входов, сужение среза до четырёх полей, новый тип и dev-предупреждение. Проверка: `pnpm lint` проходит `check-changesets.mjs`
- [x] 4.2 `pnpm verify:affected`, затем полный гейт последовательно: `build`, `lint`, `typecheck`, `test`, `size`. Проверка: все пять зелёные; `size-limit` для `@ez-kit/data-grid-react` и `@ez-kit/data-grid-core` в бюджете

## Workflow follow-up

- Архивировать изменение после ревью и мержа в `develop`.
