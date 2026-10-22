# Spec Delta

## Purpose

Определяет общий словарь способа перестановки в data-grid (`ReorderMode`) и одно правило его
разрешения с учётом drag-адаптера, которое одинаково действует на заголовок колонок, колоночную
панель и билдер сортировки.

## ADDED Requirements

### Requirement: Опция поверхности принимает boolean или ReorderMode

Опции `ordering.column.header`, `ordering.column.visibilityMenu` и `sorting.multi.reorderable` MUST
принимать `true`, `false` или одно из значений `ReorderMode`: `'drag'`, `'step'`, `'both'`. `'drag'`
MUST означать перетаскивание за ручку, `'step'` — перемещение на одну позицию кнопками, `'both'` —
оба способа. Опции `drag` и `moveControls` MUST NOT существовать ни на одной из этих поверхностей.

#### Scenario: Строковое значение

- **WHEN** автор пишет `ordering: { column: { header: 'step' } }`
- **THEN** конфиг проходит typecheck

#### Scenario: Старые флаги

- **WHEN** автор пишет `ordering: { column: { drag: false } }`
- **THEN** typecheck сообщает о неизвестном свойстве `drag`

### Requirement: Разрешение режима с учётом адаптера

Каждая поверхность MUST разрешать свою опцию в пару «ручка / шаги» по одной таблице. `true` MUST
давать ручку при наличии drag-адаптера и шаги без него. `'step'` MUST давать только шаги. `'drag'`
MUST давать ручку с адаптером и шаги без него. `'both'` MUST давать оба способа с адаптером и только
шаги без него. `false` MUST не давать ничего.

#### Scenario: true без адаптера

- **WHEN** билдер сортировки открыт в гриде без drag-адаптера при `multi: true`
- **THEN** у записей есть шаги и нет ручки

#### Scenario: true с адаптером

- **WHEN** тот же билдер открыт в гриде с drag-адаптером
- **THEN** у записей есть ручка и нет шагов

#### Scenario: both с адаптером

- **WHEN** в гриде с адаптером задано `ordering.column.visibilityMenu: 'both'`
- **THEN** строки колоночной панели несут и ручку, и шаги

#### Scenario: step с адаптером

- **WHEN** в гриде с адаптером задано `ordering.column.header: 'step'`
- **THEN** заголовки колонок не перетаскиваются
- **AND** меню колонки предлагает шаги

#### Scenario: false

- **WHEN** задано `sorting.multi.reorderable: false`
- **THEN** у записей билдера нет ни ручки, ни шагов

### Requirement: Значения по умолчанию по поверхностям

Без явной опции `ordering.column.header` MUST разрешаться как `true`, а
`ordering.column.visibilityMenu` — как `false`. `sorting.multi.reorderable` MUST разрешаться как
`true`, когда мультисортировка включена, и как `false`, когда выключена.

#### Scenario: Заголовок по умолчанию

- **WHEN** задано `ordering: { column: {} }` в гриде с адаптером
- **THEN** заголовки колонок перетаскиваются

#### Scenario: Панель по умолчанию

- **WHEN** `ordering.column.visibilityMenu` не задан
- **THEN** переключатель Columns остаётся списком видимости без перестановки

#### Scenario: Билдер по умолчанию

- **WHEN** задано `sorting: { multi: true }` без `reorderable`
- **THEN** записи билдера переставляются

### Requirement: Предупреждение о ручке без адаптера

Когда поверхность настроена как `'drag'` или `'both'`, а drag-адаптера нет, грид MUST один раз
вывести предупреждение в development с именем опции и MUST NOT выводить его в production.
Предупреждение MUST прекращаться, когда конфиг исправлен.

#### Scenario: drag без адаптера

- **WHEN** в development грид без адаптера получает `sorting: { multi: { reorderable: 'drag' } }`
- **THEN** в консоли одно предупреждение, называющее `sorting.multi.reorderable`
- **AND** записи билдера получают шаги

#### Scenario: Повторный рендер

- **WHEN** тот же грид перерисовывается из-за изменения другого среза состояния
- **THEN** предупреждение не повторяется
