# Spec Delta

## MODIFIED Requirements

### Requirement: Модель фильтра для каждой цели фильтра

Грид MUST отдавать для каждой цели фильтра — фильтруемой колонки или поля из `filtering.fields` —
модель фильтра в поле `filter` у элементов `filters`, которые получают render-функции
`<DataGrid.FilterPanel>` и `<DataGrid.Filter>`. Поля модели MUST быть данными и функциями, без
React-элементов (кроме иконок в `operators` и `items` и содержимого `config` — их пишет автор),
и модель MUST отдавать `id` цели. Системные
колонки, колонки с `filtering: false` и нефильтруемые колонки модели не получают.

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

- **WHEN** потребитель читает `filter` любой цели, чьи `cell.config` и `filtering.config` не содержат элементов
- **THEN** ни одно поле модели не является React-элементом

#### Scenario: Иконка оператора может быть элементом

- **WHEN** у оператора `equals` в наборе колонки `status` задан `icon: <Equal/>`
- **THEN** у `equals` в `operators` модели `status` поле `icon` — элемент `<Equal/>`

## ADDED Requirements

### Requirement: Модель несёт смерженный конфиг фильтра

Поле `config` модели MUST быть тем же объектом-конфигом, что получает рендерер фильтра этой цели:
`cell.config`, поверх него `filtering.config`, с `items` из списка фильтра для `select` / `badge`.
Если у цели нет ни базы, ни слоя, ни списка, `config` MUST быть `undefined`.

#### Scenario: Слой фильтра в модели

- **WHEN** колонка `tags` объявлена с `cell: { type: 'select', config: { items } }` и `filtering: { operators: true, config: { creatable: true } }`
- **THEN** `useFilters().filters` для `tags` содержит `filter.config` с `creatable: true` и `items` списка фильтра

#### Scenario: Колонка без конфига

- **WHEN** колонка `note` типа `text` объявлена без `cell.config` и без `filtering.config`
- **THEN** `filter.config` её модели равен `undefined`
