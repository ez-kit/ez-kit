# Spec Delta

## MODIFIED Requirements

### Requirement: Итоговый debounce колонки

The model's `debounce` MUST equal the target's `filtering.debounce`, falling back to the table's filtering debounce. It MUST describe the configured delay, including for a single-number editor, rather than the effective delay of a particular input. With `draft: true`, built-in inputs MUST bypass this delay without changing the model's configured value.

#### Scenario: Колонка переопределяет debounce таблицы

- **WHEN** table debounce is 300 and a column sets `filtering.debounce: 1000`
- **THEN** that column's model reports `debounce: 1000`

#### Scenario: Колонка наследует debounce таблицы

- **WHEN** table debounce is 300 and a column has no override
- **THEN** its model reports `debounce: 300`

#### Scenario: Draft preserves configured metadata

- **WHEN** a draft grid has a text or single-number target configured with debounce 800
- **THEN** the model still reports 800 while built-in input changes enter the draft immediately

### Requirement: Запись фильтра одной колонки

The model's `setValue(next)` MUST synchronously write `next` as the target's filter value, and `setValue(undefined)` MUST synchronously remove that filter. The model MUST NOT introduce a debounce, irrespective of the editor, configured delay, or draft mode. In draft mode, the write MUST target the table draft without emitting the deferred query.

#### Scenario: Снятие фильтра

- **WHEN** a column has a filter and code calls `filter.setValue(undefined)`
- **THEN** that column has no filter in grid state immediately after the call returns

#### Scenario: Programmatic numeric write is immediate

- **WHEN** a single-number target has debounce 800 and code calls its model's `setValue(next)`
- **THEN** the supplied value is immediately readable from grid state without advancing a timer

### Requirement: Пачечная запись одним изменением состояния

The panel's `setValue(next)` MUST synchronously write all operator-bearing targets in one state change, causing `filtering.onChange` exactly once outside draft mode. Targets present in `next` MUST receive their supplied values; omitted operator-bearing targets MUST lose their filters; all other targets' filters MUST remain unchanged. In draft mode, the batch MUST update the draft immediately and defer query callbacks until Apply, without an input debounce.

#### Scenario: Применение черновика внешней панели

- **WHEN** a non-draft grid has `filtering.onChange` and the panel calls `setValue` with new values for three columns
- **THEN** `filtering.onChange` fires once with the resulting filter array before the call returns

#### Scenario: Колонки и поля одной записью

- **WHEN** the panel calls `setValue({ status: { ... }, warehouse: { ... } })`, where `warehouse` is a filter field
- **THEN** the batch contains both entries and produces one callback outside draft mode

#### Scenario: Отсутствующий ключ снимает фильтр

- **WHEN** column `status` has a filter and the panel calls `setValue({ total: { ... } })`
- **THEN** `status` loses its filter and `total` receives the supplied filter immediately

#### Scenario: Простой фильтр колонки без операторов сохраняется

- **WHEN** a column without operators has a plain filter and the panel calls `setValue({})`
- **THEN** its plain filter remains unchanged

#### Scenario: Draft batch bypasses debounce

- **WHEN** a draft grid with debounce 800 receives a panel `setValue` containing text and number filters
- **THEN** both values are immediately readable from the draft, no query callback fires until Apply, and Apply includes both values
