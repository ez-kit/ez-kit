# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Модель фильтра для каждой фильтруемой колонки`
- TO: `### Requirement: Модель фильтра для каждой цели фильтра`

- FROM: `### Requirement: Хук доступен вне FilterPanel`
- TO: `### Requirement: Хук useFilters доступен вне FilterPanel`

## MODIFIED Requirements

### Requirement: Модель фильтра для каждой цели фильтра

Грид MUST отдавать для каждой цели фильтра — фильтруемой колонки или поля из `filtering.fields` —
модель фильтра в поле `filter` у элементов `filters`, которые получают render-функции
`<DataGrid.FilterPanel>` и `<DataGrid.Filter>`. Модель MUST состоять из данных и функций, без
React-элементов, и MUST отдавать `id` цели. Системные колонки, колонки с `filtering: false` и
колонки, которые нельзя фильтровать, модели не получают.

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

### Requirement: Пачечное значение фильтров панели

Грид MUST отдавать `value` — объект `id → StructuredFilterValue` по целям фильтра с операторами и
заданным фильтром — через аргументы render-функции `<DataGrid.FilterPanel>` и через хук
`useFilters()`. Цели без операторов в этот объект MUST не попадать.

#### Scenario: Значение панели собирается из состояния

- **WHEN** в гриде заданы фильтры `status: { operator: 'in', value: ['open'] }` и
  `total: { operator: 'between', value: { from: 1 } }`
- **THEN** `value` равен `{ status: {…}, total: {…} }` с этими же значениями

#### Scenario: Поле в значении панели

- **WHEN** у поля с операторами `warehouse` задан фильтр `{ operator: 'equals', value: 'msk' }`
- **THEN** `value` содержит ключ `warehouse` с этим значением

#### Scenario: Колонка без операторов не попадает в значение панели

- **WHEN** у колонки без операторов задан простой фильтр `'an'`
- **THEN** в `value` ключа этой колонки нет, а сама колонка есть в `filters`

### Requirement: Пачечная запись одним изменением состояния

`setValue(next)` уровня панели MUST записывать фильтры всех целей с операторами одним изменением
состояния, так что `filtering.onChange` срабатывает ровно один раз. Цели из `next` получают
значение из `next`; цели с операторами, которых нет в `next`, теряют фильтр; фильтры остальных
целей MUST остаться как были.

#### Scenario: Применение черновика внешней панели

- **WHEN** у грида задан `filtering.onChange`, и панель вызывает `setValue` с новыми значениями
  для трёх колонок
- **THEN** `filtering.onChange` вызывается один раз с итоговым массивом фильтров

#### Scenario: Колонки и поля одной записью

- **WHEN** панель вызывает `setValue({ status: {…}, warehouse: {…} })`, где `warehouse` — поле
- **THEN** `filtering.onChange` вызывается один раз, и массив содержит обе записи

#### Scenario: Отсутствующий ключ снимает фильтр

- **WHEN** у колонки `status` задан фильтр, и вызывается `setValue({ total: {…} })`
- **THEN** фильтра `status` больше нет, а `total` задан

#### Scenario: Простой фильтр колонки без операторов сохраняется

- **WHEN** у колонки без операторов задан простой фильтр, и вызывается `setValue({})`
- **THEN** её фильтр остаётся прежним

### Requirement: Ключи пачки, которые панель не знает

`setValue(next)` уровня панели MUST игнорировать ключи, которые не называют цель фильтра с
операторами, и в режиме разработки MUST предупреждать о каждом таком ключе. Поле, которое грид не
предлагает (нет `filtering.manual: true`), MUST считаться неизвестным ключом.

#### Scenario: Ключ неизвестной колонки

- **WHEN** в режиме разработки вызывается `setValue({ nope: { operator: 'equals', value: 1 } })`
- **THEN** состояние фильтров не меняется, и в консоль выводится предупреждение с именем `nope`

#### Scenario: Ключ поля без manual

- **WHEN** у грида объявлено поле `warehouse` без `filtering.manual`, и вызывается `setValue({ warehouse: {…} })`
- **THEN** состояние фильтров не меняется, и в консоль выводится предупреждение с именем `warehouse`

### Requirement: Хук useFilters доступен вне FilterPanel

`useFilters()` MUST работать в любом компоненте под `<DataGrid>` и возвращать те же `filters`,
`value`, `setValue` и `hasActiveFilter`, что получает render-функция `<DataGrid.FilterPanel>`. Если
у грида нет ни одной цели фильтра (нет модели отфильтрованных строк, ни одной фильтруемой колонки
и ни одного предлагаемого поля), хук MUST возвращать `undefined`.

#### Scenario: Панель в тулбаре

- **WHEN** компонент внутри `<DataGrid.Toolbar>` вызывает `useFilters()`
- **THEN** он получает модели всех целей фильтра и может записать их через `setValue`

#### Scenario: Грид, где фильтруются только поля

- **WHEN** у грида ни одна колонка не фильтруется, но объявлено поле при `filtering.manual: true`
- **THEN** `useFilters()` возвращает объект с одной целью — этим полем, а `<DataGrid.FilterPanel />` рендерит её чип

#### Scenario: Грид без фильтрации

- **WHEN** у грида фильтрация выключена, и компонент под `<DataGrid>` вызывает `useFilters()`
- **THEN** хук возвращает `undefined`

### Requirement: Совместимость со встроенной панелью

`<DataGrid.FilterPanel />` и `<DataGrid.Filter />` без `children` MUST рендерить те же чипы кита
через те же пропсы `FilterPanel` и `FilterPanelChip`, что и до изменения, а встроенные контролы
фильтра MUST вести себя как раньше. Поле элемента `filters` MUST отдавать `label`, `valueDisplay`,
`hasValue`, `input`, `onClear` и `filter` с прежними значениями для колонки.

#### Scenario: Встроенная панель

- **WHEN** layout рендерит `<DataGrid.FilterPanel />` без `children`
- **THEN** кит получает те же пропсы `FilterPanel` и `FilterPanelChip`, что и до изменения

#### Scenario: Сводка значения не меняется

- **WHEN** у колонки задан фильтр `{ operator: 'in', value: ['a', 'b', 'c'] }` с метками вариантов
- **THEN** `valueDisplay` совпадает с тем, что выводилось до изменения

## ADDED Requirements

### Requirement: Источник цели фильтра

Каждый элемент `filters` MUST отдавать `source`: `{ kind: 'column', column }` для колонки и
`{ kind: 'field' }` для поля. Порядок `filters` MUST быть таким: фильтруемые колонки в порядке
колонок грида, затем поля в порядке объявления.

#### Scenario: Источник колонки

- **WHEN** render-функция панели читает элемент `filters` для колонки `status`
- **THEN** `source.kind` равен `'column'`, а `source.column.id` равен `'status'`

#### Scenario: Порядок целей

- **WHEN** у грида фильтруемые колонки `name`, `status` и поля `warehouse`, `region`
- **THEN** id элементов `filters` идут в порядке `name`, `status`, `warehouse`, `region`

### Requirement: Одиночный фильтр по id цели

`<DataGrid.Filter id>` MUST рендерить фильтр цели с этим id — колонки или поля — и MUST рендерить
ничего, если цели с таким id нет.

#### Scenario: Фильтр колонки по id

- **WHEN** layout рендерит `<DataGrid.Filter id='status' />` для фильтруемой колонки `status`
- **THEN** рендерится чип кита с меткой колонки и её контролом

#### Scenario: Неизвестный id

- **WHEN** layout рендерит `<DataGrid.Filter id='nope' />`
- **THEN** ничего не рендерится

### Requirement: У поля нет фасетных значений

Модель фильтра поля MUST NOT содержать фасетных значений и счётчиков: `items` поля MUST браться из
`filtering.items`, иначе из `cell.config.items` для `select` / `badge`, иначе быть пустым, даже если
у таблицы включён `filtering.faceted`.

#### Scenario: faceted таблицы не влияет на поле

- **WHEN** у таблицы `filtering.faceted: true`, а поле `region` типа `text` не задаёт `filtering.items`
- **THEN** `items` модели поля пуст
