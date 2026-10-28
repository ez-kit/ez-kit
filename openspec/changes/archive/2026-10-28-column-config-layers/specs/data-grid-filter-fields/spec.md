# Spec Delta

## ADDED Requirements

### Requirement: Поле принимает слой конфига фильтра

Поле из `filtering.fields` MUST принимать `filtering.config` по тем же правилам, что и колонка:
слой мержится поверх `cell.config` поля по ключам, доходит до рендерера фильтра поля, его слотов
`MultiSelectFilter` / `BetweenInput` и до `config` модели поля. Как и `cell` поля, слой поля MUST
приниматься без проверки против `columnConfig` bundle: поля типизирует таблица, а не bundle.

#### Scenario: Слой поля доходит до мультивыбора

- **WHEN** грид объявлен с `filtering: { manual: true, fields: [{ id: 'warehouse', header: 'Склад', cell: { type: 'select', config: { items } }, filtering: { operators: true, config: { creatable: true } } }] }`
- **THEN** `MultiSelectFilter` поля `warehouse` под оператором `in` получает `config.creatable`, равный `true`, а `filter.config` его модели содержит `creatable: true`

#### Scenario: Слой поля не проверяется бандлом

- **WHEN** bundle объявил `filtering: { creatable?: boolean }`, а поле пишет `filtering: { config: { mode: 'tags' } }`
- **THEN** вызов компилируется, а `MultiSelectFilter` поля получает `config.mode`, равный `'tags'`
