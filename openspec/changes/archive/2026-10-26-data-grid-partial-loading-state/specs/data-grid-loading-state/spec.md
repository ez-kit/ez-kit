# Spec Delta

## Purpose

Контракт среза загрузки data-grid: какие формы принимают `state.loading` и `initialState.loading`,
как грид дополняет недостающие поля и что из этого видят стор, селекторы и `onStateChange`.

## ADDED Requirements

### Requirement: Controlled loading accepts a partial object

Опция `state.loading` SHALL принимать объект с любым подмножеством полей `isPending`, `isFetching`,
`isError`, `error`. Недостающий флаг SHALL читаться как `false`, недостающий `error` — как `null`.
Полный объект SHALL вести себя так же, как до изменения.

#### Scenario: Only isPending renders the skeleton

- **WHEN** грид без строк получает `state.loading = { isPending: true }`
- **THEN** вместо строк рендерится fallback загрузки

#### Scenario: Only isFetching over existing rows renders the refetch overlay

- **WHEN** грид со строками получает `state.loading = { isFetching: true }`
- **THEN** строки остаются на экране и поверх них рендерится оверлей перезагрузки

#### Scenario: Error fields reach the store

- **WHEN** грид получает `state.loading = { isError: true, error: e }`
- **THEN** срез загрузки в сторе содержит `isError: true` и тот же `e` в `error`, а `isPending` и
  `isFetching` равны `false`

#### Scenario: Empty object behaves like no loading

- **WHEN** грид получает `state.loading = {}`
- **THEN** не рендерится ни fallback загрузки, ни оверлей, а срез равен
  `{ isPending: false, isFetching: false, isError: false, error: null }` — как без `loading`

#### Scenario: A full query result is accepted unchanged

- **WHEN** в `state.loading` передан результат `useQuery` из TanStack Query целиком
- **THEN** код компилируется без адаптера и грид показывает то же, что при передаче его четырёх полей
  по отдельности

### Requirement: The stored loading slice is always complete

Срез загрузки в сторе, в селекторах и в состоянии, которое получает `onStateChange`, SHALL всегда
содержать все четыре поля, и только их, независимо от формы входного объекта.

#### Scenario: Extra fields of the input are not stored

- **WHEN** в `state.loading` передан объект с полями сверх четырёх известных
- **THEN** срез в сторе содержит только `isPending`, `isFetching`, `isError` и `error`

#### Scenario: An explicit undefined error is preserved

- **WHEN** в `state.loading` передан объект с ключом `error`, равным `undefined`
- **THEN** `error` в сторе равен `undefined`, а не `null`

### Requirement: An unchanged loading value is not republished

Когда новое значение `state.loading` совпадает с предыдущим по всем четырём полям, грид SHALL NOT
перезаписывать срез загрузки и SHALL NOT вызывать `onStateChange` из-за него, даже если ссылка на
объект новая.

#### Scenario: Re-render with an equal inline object

- **WHEN** хост перерендеривается и передаёт новый литерал `state.loading` с теми же значениями полей
- **THEN** ссылка на срез загрузки в сторе не меняется, а `onStateChange` не вызывается

#### Scenario: A changed field is published

- **WHEN** хост меняет значение `isPending` в `state.loading`
- **THEN** срез в сторе отражает новое значение, а `onStateChange` не сообщает потребителю его
  собственное значение обратно

### Requirement: Initial loading seed accepts a partial object

Опция `initialState.loading` SHALL принимать объект с любым подмножеством четырёх полей и SHALL
сливать его с дефолтом: недостающие флаги — `false`, недостающий `error` — `null`.

#### Scenario: Partial seed starts in the pending state

- **WHEN** таблица создаётся с `initialState.loading = { isPending: true }`
- **THEN** начальный срез равен `{ isPending: true, isFetching: false, isError: false, error: null }`

#### Scenario: Full seed is kept as given

- **WHEN** таблица создаётся с полным объектом в `initialState.loading`
- **THEN** начальный срез равен этому объекту по всем четырём полям

### Requirement: An unrecognised loading object warns in development

В режиме разработки грид SHALL выводить предупреждение, не повторяя одно и то же сообщение, если в `state.loading`
или `initialState.loading` передан объект, у которого есть ключи вне четырёх известных и нет ни
одного из флагов `isPending`, `isFetching`, `isError`. В production предупреждение SHALL NOT
выводиться.

#### Scenario: An SWR response passed whole

- **WHEN** в `state.loading` в режиме разработки передан объект с `isLoading`, `isValidating`,
  `error` и `data`, но без трёх флагов
- **THEN** выводится одно предупреждение, называющее ожидаемые поля, а срез равен дефолту с этим
  `error`

#### Scenario: Recognised shapes stay silent

- **WHEN** в `state.loading` переданы `{}`, `{ error }`, `{ isPending }` или результат `useQuery`
- **THEN** предупреждение не выводится

#### Scenario: Repeated renders warn once

- **WHEN** хост несколько раз перерендеривается с одним и тем же неузнанным объектом
- **THEN** предупреждение выводится один раз
