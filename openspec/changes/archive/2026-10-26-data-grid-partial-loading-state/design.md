# Design

## Context

См. proposal.md — Why. Что определяет подход:

- Опции `state` в core нет: `TableConfig` знает только `initialState` и `atoms`. Controlled-путь
  целиком в react. `useDataGrid` кладёт проп в `controlledStateRef` и публикует его в base-атомы
  через upstream `table_publishExternalState`: первый раз во время рендера (блок
  `instanceWiringRef`), дальше в каждом layout effect.
- Upstream сравнивает слайс по ссылке (`current === external`). `isControlledEcho` тоже сравнивает
  `controlled[key] !== next[key]` по ссылке. Controlled-режим сейчас работает потому, что в стор
  кладётся тот же объект, что передал потребитель.
- `initialState.loading` проходит через `createTableOptions` и попадает в
  `loadingFeature.getInitialState`, которая сейчас заменяет дефолт целиком (`{ loading: DEFAULTS, ...initialState }`).
- `@ez-kit/data-grid-react` делает `export * from '@ez-kit/data-grid-core'`, поэтому любой экспорт из
  корня core становится публичным API обоих пакетов. Внутреннего подпути у core нет. Прецедент
  дублирования мелкого хелпера уже есть: приватный `warnOnce` в `use-data-grid.ts` рядом с
  `utils/warn-once` в core.
- Читатели среза (`body.tsx`, `table.tsx`, `pagination.tsx`) уже пишут `s.loading?.x ?? false`,
  потому что без `loadingFeature` среза нет вовсе. Эти проверки остаются.

## Goals / Non-Goals

**Goals:**

- Одно место нормализации на каждый вход: `state.loading` в react, `initialState.loading` в core.
- Нормализованный срез сохраняет ссылку, пока четыре поля равны.
- Типы входа частичные, тип среза и `onStateChange` — полные.

**Non-Goals:**

- Нормализация `atoms.loading`: это атом самого среза, его тип остаётся полным `LoadingState`.
- Публичный нормализатор или новый подпуть core.
- Изменение читателей среза, отрисовки или приоритета флагов.
- Любые изменения `InfiniteState`.

## Decisions

### 1. Нормализация `state.loading` — приватно в react, перед `controlledStateRef`

Приватная функция в react-пакете (отдельный модуль рядом с `use-data-grid.ts`, например
`normalize-controlled-state.ts`), чистая и тестируемая сама по себе:

```
normalizeControlledState(prev: Normalized | undefined, next: State | undefined): Normalized | undefined
  next === undefined                      -> undefined
  !('loading' in next) / loading undefined -> next как есть
  loading = pick(next.loading, 4 ключа) поверх DEFAULTS
  prev?.loading поверхностно равен loading -> переиспользовать prev.loading
  иначе                                   -> { ...next, loading }
```

`useDataGrid` хранит прошлый результат в ref и кладёт **нормализованный** объект в
`controlledStateRef.current`. Его читают и обе публикации, и `isControlledEcho`, поэтому фильтр эха
узнаёт значение, которое реально лежит в сторе.

«Pick» копирует только ключи, которые есть во входном объекте (`key in loading`), а остальные берёт из
дефолта. Поэтому явный `error: undefined` остаётся `undefined`, и полный объект попадает в стор с теми
же значениями, что и сегодня.

Альтернативы:

- **Публичный `normalizeLoadingState` из core** — новое имя в API двух пакетов без внешнего
  потребителя. Отклонено.
- **Подпуть `core/internals`** — новая точка входа ради одной функции. Отклонено.
- **Нормализовать на каждом рендере без ref** — свежий объект каждый раз: запись в стор на каждом
  коммите, `isControlledEcho` перестаёт узнавать значение, `onStateChange` срабатывает, и у
  потребителя, который зеркалит состояние в `useState`, получается цикл. Отклонено.
- **Оставить срез частичным и коалесцировать в читателях** — `Partial` протекает в `TableState` и
  селекторы. Отклонено постановкой.

Цена: четыре литерала дефолта дублируются с `INITIAL_LOADING_STATE`. Тест в react сверяет локальные
дефолты с `table.initialState.loading` у грида без seed, чтобы копии не разошлись.

### 2. `initialState.loading` — слияние в `loadingFeature.getInitialState`

`loading: { ...INITIAL_LOADING_STATE, ...initialState.loading }` вместо замены целиком; остальной
`initialState` по-прежнему разворачивается последним. Seed разовый, идентичность значения не важна.
В `InitialTableState` добавляется `loading?: Partial<LoadingState>` рядом с уже существующим
переопределением `pagination?: Partial<PaginationState>`, с тем же обоснованием в JSDoc.

### 3. Тип `ControlledTableState<TFeatures>` — `Omit` плюс условный член, экспорт из react

```ts
export type ControlledTableState<TFeatures extends TableFeatures> = Omit<Partial<TableState<TFeatures>>, 'loading'> &
	('loading' extends keyof TableState<TFeatures> ? { loading?: Partial<LoadingState> } : unknown)
```

Ключ `loading` есть только при `loadingFeature` в наборе, поэтому для узкого набора тип не
ослабляется. `UseDataGridConfig.state` переходит на него. `Partial<TableState<F>>` присваивается в
новый тип (полный `LoadingState` — частный случай частичного), так что `useState<Partial<TableState<F>>>`
из JSDoc `onStateChange` продолжает работать. `onStateChange` остаётся с `TableState<TFeatures>`: поток
выходной.

Альтернативы:

- **Гомоморфный mapped type с условием на каждый ключ** (`K extends 'loading' ? … : …`). Был первой
  реализацией и отклонён на ревью: пока `TFeatures` — параметр, условие остаётся отложенным, и
  обёртка, обобщённая по набору фич, не может передать `Partial<TableState<F>>` (TS2322). Это
  регрессия против прежнего `Partial<TableState<TFeatures>>`.
- **`Omit` плюс безусловный `loading?: Partial<LoadingState>`** — принимает обобщённую обёртку, но
  разрешает `loading` в наборе без `loadingFeature`. Отклонено.
- **Анонимный тип inline в `UseDataGridConfig`** — новую форму тогда нельзя вынести в переменную с
  аннотацией. Отклонено.

### 4. Защита от тихого no-op — dev-предупреждение

`Partial<LoadingState>` — слабый тип, и TS пропускает любой объект с хотя бы одним общим свойством.
`SWRResponse` делит с ним `error`, поэтому `loading={swr}`, который сегодня даёт TS2739, после правки
компилировался бы и никогда не показывал скелет.

Предупреждение срабатывает, когда в объекте есть ключ вне четырёх известных и нет ни одного из
`isPending` / `isFetching` / `isError`. `{}`, `{ error }`, `{ isPending }` и результат `useQuery` его
не вызывают. Гейт — `IS_DEV`. Повторение гасит `warnOnce` по тексту сообщения, как остальные
dev-предупреждения: в react свой приватный, в core — `utils/warn-once`.

Альтернатива — union «хотя бы один флаг обязателен». Отклонено: запрещает `{}`, усложняет `.d.ts` и
плохо читается через `getPropertiesOfType` в `docs-option-names.test.ts`.

## Risks / Trade-offs

- [Потребитель читал из среза посторонние поля переданного объекта, например `data` из результата
  `useQuery`] → тип `LoadingState` таких полей никогда не обещал. Сужение упоминается в JSDoc и в
  changeset.
- [Срез перестаёт перезаписываться, когда поля равны, а ссылка новая] → селекторы с `===` на
  `s.loading` перерендеривались бы раньше на каждую публикацию; теперь не будут. Это совпадает с
  `data-grid-render-isolation`, а не нарушает его.
- [Эвристика предупреждения пропустит объект без посторонних ключей и без флагов] → такой объект — это
  `{}` или `{ error }`, обе формы законны.
- [Копии дефолтов в core и react разойдутся] → тест сверки дефолтов.
- [Тесты dev-предупреждения зависят от порядка: `warnOnce` гасит по тексту на время жизни модуля] →
  каждый тест использует свою форму объекта или изолирует модуль, как уже делают тесты других
  dev-предупреждений.
