# Spec Delta

## ADDED Requirements

### Requirement: Метки операторов модели берутся из определений

Поле `operators` модели MUST содержать операторы цели с `label` из их определений, без поиска в
словаре грида, — тот же `label`, что показывают переключатель и меню встроенного фильтра.

#### Scenario: Метка из переведённого набора

- **WHEN** проект передал набор, где у `greaterThan` типа `date` подпись `После`, а колонка имеет тип ячейки `date` и операторы
- **THEN** у оператора `greaterThan` в модели этой колонки метка `После`

#### Scenario: Пользовательский оператор сохраняет свою метку

- **WHEN** колонка предлагает пользовательский оператор `fuzzy` с меткой `Fuzzy`
- **THEN** у `fuzzy` в модели метка `Fuzzy`

### Requirement: Операторы модели несут иконку из определения

Каждый оператор в `operators` модели MUST отдавать `icon` из своего определения — ту же иконку,
которую показывает переключатель оператора встроенного фильтра этой цели. Если в определении
иконки нет, `icon` MUST отсутствовать.

#### Scenario: Встроенный оператор без настройки иконки не имеет

- **WHEN** у колонки `amount` типа `number` операторы из готового набора
- **THEN** у `greaterOrEqual` в модели `amount` нет поля `icon`

#### Scenario: Знак из определения в модели

- **WHEN** проект передал числовой набор, где у `greaterOrEqual` `icon: DEFAULT_OPERATOR_ICONS.greaterOrEqual`, а у колонки `amount` типа `number` есть операторы
- **THEN** у `greaterOrEqual` в модели `amount` поле `icon` равно `≥`

#### Scenario: Пользовательский оператор без иконки

- **WHEN** колонка предлагает оператор `fuzzy` без `icon`
- **THEN** у `fuzzy` в модели нет поля `icon`

## MODIFIED Requirements

### Requirement: Модель фильтра для каждой цели фильтра

Грид MUST отдавать для каждой цели фильтра — фильтруемой колонки или поля из `filtering.fields` —
модель фильтра в поле `filter` у элементов `filters`, которые получают render-функции
`<DataGrid.FilterPanel>` и `<DataGrid.Filter>`. Поля модели MUST быть данными и функциями, без
React-элементов (кроме заданных автором иконок в `operators` и `items`), и модель MUST отдавать
`id` цели. Системные колонки, колонки с `filtering: false` и нефильтруемые колонки модели не
получают.

#### Scenario: Колонка с операторами получает модель

- **WHEN** грид рендерит `<DataGrid.FilterPanel>` с render-функцией, а колонка `status`
  объявлена с `filtering: { operators: true }`
- **THEN** элемент `filters` для `status` содержит `filter` с `id: 'status'`, непустым
  `operators` и `setValue`

#### Scenario: Поле получает модель

- **WHEN** грид объявлен с `filtering: { manual: true, fields: [{ id: 'warehouse', header: 'Склад', filtering: { operators: true } }] }`
- **THEN** элемент `filters` для `warehouse` содержит `filter` с `id: 'warehouse'` и непустым `operators`

#### Scenario: Системная колонка не попадает в модель

- **WHEN** в гриде включён выбор строк и render-функция панели перебирает `filters`
- **THEN** колонки выбора среди них нет

#### Scenario: Модель не содержит React-элементов

- **WHEN** потребитель читает `filter` любой цели
- **THEN** ни одно поле модели не является React-элементом

#### Scenario: Иконка оператора может быть элементом

- **WHEN** у оператора `equals` в наборе колонки `status` задан `icon: <Equal/>`
- **THEN** у `equals` в `operators` модели `status` поле `icon` — элемент `<Equal/>`

### Requirement: Вид редактора выводится из оператора и типа ячейки

Модель MUST отдавать `editor` для текущего оператора и `editorFor(operator)` для любого
оператора колонки, выводя его из `input` определения оператора, а не из его id. Значения: `none`
для `input: 'none'`; `between` для `input: 'range'`; `multiSelect` для `input: 'list'`; для
`input: 'single'` — `custom`, если у колонки есть `filtering.component` или фильтр собственного
типа ячейки проекта, иначе по типу ячейки: `number` (`number`, `progress`), `date`, `boolean`,
`select` (`select`, `badge`), `text` (остальные).

#### Scenario: Оператор без значения

- **WHEN** текущий оператор колонки — `isEmpty`
- **THEN** `editor` равен `'none'`

#### Scenario: Мультивыбор

- **WHEN** у колонки с типом ячейки `select` текущий оператор — `in`
- **THEN** `editor` равен `'multiSelect'`

#### Scenario: Свой оператор-список

- **WHEN** у колонки с типом ячейки `select` текущий оператор — свой `excludesAny` с `input: 'list'`
- **THEN** `editor` равен `'multiSelect'`

#### Scenario: Свой оператор-диапазон

- **WHEN** у числовой колонки текущий оператор — свой `notBetween` с `input: 'range'`
- **THEN** `editor` равен `'between'`

#### Scenario: Одиночный выбор

- **WHEN** у колонки с типом ячейки `badge` текущий оператор — `equals`
- **THEN** `editor` равен `'select'`, а `items` содержит варианты колонки

#### Scenario: Редактор для другого оператора

- **WHEN** у числовой колонки текущий оператор — `equals`, и потребитель вызывает `editorFor('between')`
- **THEN** результат равен `'between'`, а `editor` по-прежнему `'number'`

#### Scenario: Собственный компонент фильтра

- **WHEN** колонка задаёт `filtering.component`
- **THEN** `editor` для оператора с `input: 'single'` равен `'custom'`

### Requirement: Пресеты дат для текущего оператора

Поле `presets` модели MUST содержать только те пресеты колонки, которые принимает текущий
оператор: диапазонные для `input: 'range'`, одиночные для `input: 'single'`. Метки встроенных
пресетов MUST браться из `messages.filtering.presets`. Для `input: 'list'` и `input: 'none'` и для
колонок без пресетов список MUST быть пустым.

#### Scenario: Диапазонные пресеты для between

- **WHEN** у колонки дат есть и диапазонные, и одиночные пресеты, а текущий оператор — `between`
- **THEN** `presets` содержит только диапазонные

#### Scenario: Диапазонные пресеты для своего оператора-диапазона

- **WHEN** у колонки дат есть пресеты, а текущий оператор — свой `notBetween` с `input: 'range'`
- **THEN** `presets` содержит только диапазонные

#### Scenario: Метка пресета из словаря

- **WHEN** у грида задан словарь, где `messages.filtering.presets.last7` равен `Последние 7 дней`, а колонка дат объявлена с `filtering: { presets: true }`
- **THEN** у пресета `last7` в модели метка `Последние 7 дней`

#### Scenario: Колонка без пресетов

- **WHEN** колонка не задаёт `filtering.presets`
- **THEN** `presets` пуст

### Requirement: Правила смены оператора

`nextValueForOperator(operator)` MUST возвращать значение, которое встроенный фильтр записал бы
при выборе этого оператора, по `input` определений: для `none` — без значения; при переходе в
`range` — пустой диапазон; при переходе между разными `input` — без значения; при том же
`input` — с сохранённым значением. С аргументом `from` правила MUST применяться к нему. Функция
MUST ничего не записывать в грид.

#### Scenario: Переход в between

- **WHEN** текущее значение `{ operator: 'equals', value: 5 }`, и вызывается `nextValueForOperator('between')`
- **THEN** результат равен `{ operator: 'between', value: {} }`, а фильтр колонки в гриде не меняется

#### Scenario: Смена оператора от значения черновика

- **WHEN** применённое значение `{ operator: 'equals', value: 5 }`, а панель вызывает
  `nextValueForOperator('equals', { operator: 'between', value: { from: 1, to: 9 } })`
- **THEN** результат равен `{ operator: 'equals', value: undefined }`

#### Scenario: Смена оператора с сохранением значения

- **WHEN** текущее значение `{ operator: 'contains', value: 'an' }`, и вызывается `nextValueForOperator('startsWith')`
- **THEN** результат равен `{ operator: 'startsWith', value: 'an' }`

#### Scenario: Между двумя диапазонами значение сохраняется

- **WHEN** текущее значение `{ operator: 'between', value: { from: 1, to: 9 } }`, и вызывается `nextValueForOperator('notBetween')` для своего оператора с `input: 'range'`
- **THEN** результат равен `{ operator: 'notBetween', value: { from: 1, to: 9 } }`

#### Scenario: Из списка в одно значение

- **WHEN** текущее значение `{ operator: 'in', value: ['a'] }`, и вызывается `nextValueForOperator('equals')`
- **THEN** результат равен `{ operator: 'equals', value: undefined }`

### Requirement: Пустые значения не становятся фильтрами

При пачечной записи грид MUST не сохранять фильтр колонки, у которого значение пустое (нет
значения, пустая строка, пустой массив, диапазон без обеих границ), если оператор этого
значения принимает значение (`input` не `none`). Фильтр с оператором `input: 'none'` MUST
сохраняться.

#### Scenario: Закреплённый пустой фильтр

- **WHEN** вызывается `setValue({ status: { operator: 'in', value: [] } })`
- **THEN** у колонки `status` фильтра нет, и в `filtering.onChange` её записи тоже нет

#### Scenario: Оператор без значения сохраняется

- **WHEN** вызывается `setValue({ email: { operator: 'isEmpty', value: undefined } })`
- **THEN** у колонки `email` фильтр `{ operator: 'isEmpty' }` задан

## REMOVED Requirements

### Requirement: Операторы локализованы словарём грида

**Reason**: Подписи операторов удалены из словаря грида (`messages.operators`); метка берётся из
определения.
**Migration**: Передайте в `operators.byType` набор с переведёнными `label`. См. требование
«Метки операторов модели берутся из определений».

### Requirement: Операторы модели несут итоговую иконку

**Reason**: Иконка оператора больше не выбирается из нескольких источников; требование заменено на
«Операторы модели несут иконку из определения».
**Migration**: Задайте `icon` в определении оператора.
