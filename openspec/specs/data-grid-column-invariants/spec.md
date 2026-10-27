# data-grid-column-invariants Specification

## Purpose

Определяет колонки, положение и видимость которых задаёт конфиг, а не пользователь (forced-колонки),
и гарантирует, что ни один вход state в data-grid не может их открепить, переставить в середину или
скрыть.

## Requirements

### Requirement: Forced-колонки определяются конфигом

Колонка MUST считаться forced-закреплённой на стороне `start` или `end`, если её итоговый конфиг
задаёт статическое закрепление: системная колонка с закреплением по умолчанию или колонка с
`pinning: 'start' | 'end'` / `{ side }`. Колонка с `pinning: { initialSide }` или `pinning: false`
MUST NOT быть forced. Системные колонки и колонки с `visibility: false` MUST считаться всегда видимыми.

#### Scenario: Системная колонка по умолчанию

- **WHEN** грид создан с `selection: true` и `deleting`
- **THEN** `__selection__` forced на `start`, `__actions__` forced на `end`, обе всегда видимы

#### Scenario: Системная колонка с initialSide

- **WHEN** грид создан с `selection: { column: { pinning: { initialSide: 'start' } } }`
- **THEN** `__selection__` закреплена при старте, но не forced, и пользователь может её открепить

### Requirement: Каждый вход state восстанавливает forced-закрепления

Грид MUST восстанавливать forced-колонки в `columnPinning` на каждом входе: в `initialState`, в
записи среза (`setColumnPinning` и жесты UI) и в controlled `state` у `useDataGrid`. Forced-start
колонки MUST стоять в начале `start`, forced-end — в конце `end`, в порядке объявления, даже если
вход поставил их иначе. Forced-колонка на чужой стороне MUST с неё убираться.

#### Scenario: Controlled state с пустыми массивами

- **WHEN** `useDataGrid` получает `state={{ columnPinning: { start: [], end: [] } }}` при
  `selection: true` и `deleting`
- **THEN** `__selection__` отрисована закреплённой в начале, `__actions__` — в конце

#### Scenario: Запись среза

- **WHEN** вызывается `table.setColumnPinning({ start: [], end: [] })`
- **THEN** `table.store.state.columnPinning.start` содержит `__selection__`

#### Scenario: Пользователь закрепил колонку справа

- **WHEN** пользователь закрепляет `age` на стороне `end` в гриде с `deleting`
- **THEN** `columnPinning.end` равен `['age', '__actions__']`, и колонка действий остаётся крайней

#### Scenario: Пользовательская колонка уже закреплена

- **WHEN** controlled `state.columnPinning` равен `{ start: ['name'], end: [] }`, а `name` не forced
- **THEN** `start` равен `['__selection__', 'name']`

### Requirement: Каждый вход state восстанавливает forced-колонки в порядке

В непустом `columnOrder` на входе грид MUST ставить forced-start колонки в начало порядка в порядке
объявления, вставляя недостающие и переставляя стоящие не на краю. Forced-end колонки MUST NOT
храниться в `columnOrder`: системные колонки объявляются последними, и именно их отсутствие держит
их в конце `getAllLeafColumns()`, в том числе после колонок, которых порядок не упоминает. Пустой
`columnOrder` MUST оставаться пустым.

#### Scenario: Порядок без системных колонок

- **WHEN** `initialState.columnOrder` равен `['age', 'name', 'email']` при `selection: true` и `deleting`
- **THEN** `table.getAllLeafColumns()` равен `__selection__`, `age`, `name`, `email`, `__actions__`

#### Scenario: Порядок, который не упоминает новую колонку

- **WHEN** `initialState.columnOrder` равен `['email', 'name']`, а у грида есть ещё `age` и `deleting`
- **THEN** `table.getAllLeafColumns()` заканчивается на `age`, `__actions__`

#### Scenario: Пустой порядок

- **WHEN** `initialState.columnOrder` равен `[]`
- **THEN** `table.store.state.columnOrder` равен `[]`

### Requirement: Каждый вход state возвращает видимость всегда видимым колонкам

Грид MUST заменять `false` на `true` в `columnVisibility` для всегда видимых колонок на каждом входе:
`initialState`, запись среза и controlled `state`.

#### Scenario: Controlled state скрывает системную колонку

- **WHEN** controlled `state.columnVisibility` равен `{ __actions__: false }`
- **THEN** колонка `__actions__` отрисована

### Requirement: Исправление controlled state не считается изменением

Когда грид восстанавливает forced-колонки в controlled `state`, он MUST NOT вызывать `onStateChange`
из-за этого исправления: грид поправил вход, а пользователь ничего не менял. Пока потребитель
передаёт ту же ссылку на срез, грид MUST публиковать один и тот же исправленный срез. Изменение,
которое затем делает пользователь, MUST уведомлять как обычно.

#### Scenario: Потребитель зеркалит onStateChange в React state

- **WHEN** потребитель хранит state в `useState`, передаёт его в `state`, пишет в него из
  `onStateChange` и начинает с `columnPinning: { start: [], end: [] }`
- **THEN** при монтировании `onStateChange` не вызывается, а рендер стабилизируется

#### Scenario: Пользователь закрепляет колонку после исправления

- **WHEN** в том же гриде пользователь закрепляет `name` на `start`
- **THEN** `onStateChange` вызывается один раз с `start`, равным `['__selection__', 'name']`

#### Scenario: Значение без нарушений

- **WHEN** controlled `state.columnPinning` уже содержит все forced-колонки на своих сторонах
- **THEN** грид публикует ту же ссылку и не вызывает `onStateChange`

### Requirement: Грид предоставляет пару enforce / strip над своими инвариантами

`table.grid.columnState` MUST предоставлять `enforce(state)` и `strip(state)`. `enforce` MUST
применять правила восстановления этой спеки к `columnPinning`, `columnOrder` и `columnVisibility`.
`strip` MUST убирать forced-id из `columnPinning` и `columnOrder` и записи всегда видимых колонок из
`columnVisibility`. Оба MUST возвращать ту же ссылку на state и на каждый срез, если менять нечего,
и MUST NOT трогать срезы, которых во входе нет.

#### Scenario: enforce после strip

- **WHEN** `s` — `table.store.state`, полученное через жесты UI и записи срезов
- **THEN** `enforce(strip(s))` даёт те же `columnPinning`, `columnOrder` и видимость колонок, что `s`

#### Scenario: strip без forced-колонок

- **WHEN** грид не имеет forced-колонок
- **THEN** `strip(s)` возвращает `s` по ссылке

#### Scenario: Отсутствующий срез

- **WHEN** `enforce` получает объект без ключа `columnPinning`
- **THEN** в результате нет ключа `columnPinning`

### Requirement: Сигнатура инвариантов меняется вместе с конфигом

`table.grid.columnState.signature` MUST совпадать у двух гридов ровно тогда, когда совпадают их
forced и всегда видимые колонки. Кеши результатов `enforce` / `strip` в гриде MUST учитывать её
наравне со своими входами, поэтому смена конфига при той же ссылке на срез применяет новые правила.

#### Scenario: Конфиг меняет forced-колонки при той же ссылке на срез

- **WHEN** controlled `state.columnPinning` — одна и та же ссылка, а `selection` переключается с
  `false` на `true`
- **THEN** `__selection__` закреплена в начале

#### Scenario: Сохраняемое значение после смены конфига

- **WHEN** пользователь закрепил `name`, а затем конфиг объявляет `name` с `pinning: 'start'`
- **THEN** `useExtractedState` возвращает `columnPinning.start` без `name`
