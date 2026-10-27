# data-grid-state-persistence Specification

## Purpose

Определяет, что утилиты persist data-grid (`extractState`, `useExtractedState`, `parseState`) кладут
в сохраняемое значение и что гарантирует его восстановление через `initialState`. Сохраняется
только то, что выбрал пользователь, а не то, что следует из конфига.

## Requirements

### Requirement: Сохраняемое значение не содержит forced-колонок

`extractState` и `useExtractedState` MUST NOT включать forced-колонки (см. `data-grid-column-invariants`)
в `columnPinning.start`, `columnPinning.end` и `columnOrder`, а всегда видимые колонки — в
`columnVisibility`. Остальные колонки и их порядок MUST сохраняться без изменений.

#### Scenario: Грид без пользовательских закреплений

- **WHEN** грид создан с `selection: true`, `deleting` и `ordering.row`, и пользователь ничего не
  закреплял
- **THEN** `extractState(table).columnPinning` равен `{ start: [], end: [] }`

#### Scenario: Пользователь закрепил колонку

- **WHEN** пользователь закрепил `name` на `start` в том же гриде
- **THEN** `extractState(table).columnPinning.start` равен `['name']`

#### Scenario: Пользователь переместил колонку

- **WHEN** пользователь переместил `age` перед `name`
- **THEN** `extractState(table).columnOrder` не содержит `__selection__`, `__drag__` и `__actions__`

#### Scenario: Скрытие системной колонки было исправлено

- **WHEN** `table.setColumnVisibility({ __actions__: false })` записал `__actions__: true`
- **THEN** в `extractState(table).columnVisibility` нет ключа `__actions__`

### Requirement: Незакреплённое конфигом положение системной колонки сохраняется

Системная колонка, которая не forced (`pinning: { initialSide }` или `pinning: false`), MUST
сохраняться в `columnPinning` и `columnOrder` так же, как пользовательская.

#### Scenario: Пользователь открепил колонку с initialSide

- **WHEN** `__selection__` объявлена с `pinning: { initialSide: 'start' }`, и пользователь её открепил
- **THEN** `extractState(table).columnPinning.start` не содержит `__selection__`

#### Scenario: Пользователь оставил колонку с initialSide закреплённой

- **WHEN** `__selection__` объявлена с `pinning: { initialSide: 'start' }`, и пользователь её не трогал
- **THEN** `extractState(table).columnPinning.start` содержит `__selection__`

### Requirement: Полный круг persist восстанавливает вид грида

Значение `extractState`, прошедшее через `JSON.stringify`, `JSON.parse` и `parseState` и переданное в
`initialState` грида с тем же конфигом, MUST восстанавливать те же закреплённые колонки по сторонам,
тот же порядок `getAllLeafColumns()` и ту же видимость колонок.

#### Scenario: Восстановление после перезагрузки

- **WHEN** пользователь закрепил `name`, переместил `age` и скрыл `email`, состояние сохранено и
  грид создан заново из него
- **THEN** закреплённые колонки, порядок колонок и видимость совпадают с гридом до сохранения, а
  `__selection__` закреплена в начале

### Requirement: Ранее сохранённые значения остаются валидными

Значение, сохранённое до этого изменения и содержащее forced-колонки, MUST восстанавливаться без
ошибок и давать тот же вид. Id колонки, которой в гриде нет (например, `__drag__` после выключения
`ordering.row`), MUST игнорироваться.

#### Scenario: Старое значение с системными id

- **WHEN** в `initialState` передано `columnPinning: { start: ['__selection__', 'name'], end: ['__actions__'] }`
- **THEN** грид отрисован так же, как при `columnPinning: { start: ['name'], end: [] }`

#### Scenario: Устаревший id

- **WHEN** в `initialState.columnPinning.start` есть `__drag__`, а `ordering.row` выключен
- **THEN** грид отрисован без ошибок и без колонки `__drag__`

### Requirement: Идентичность значения useExtractedState стабильна

`useExtractedState` MUST возвращать ту же ссылку, пока ни один из сохраняемых срезов в сторе не
изменился, в том числе когда значение получено после среза forced-колонок.

#### Scenario: Ререндер без изменения state

- **WHEN** компонент с `useExtractedState(table)` ререндерится без изменения state грида
- **THEN** хук возвращает ту же ссылку, что в прошлом рендере

### Requirement: Низкоуровневые каналы state не меняются

`onChange.columnPinning`, `onChange.columnOrdering`, `onStateChange`, `useDataGridState` и
`table.store.state` MUST продолжать отдавать state вместе с forced-колонками. `parseState` MUST NOT
добавлять или убирать id колонок.

#### Scenario: onChange после закрепления

- **WHEN** пользователь закрепляет `name` в гриде с `selection: true`
- **THEN** `onChange.columnPinning` получает `start`, содержащий `__selection__` и `name`
