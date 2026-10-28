# Spec Delta

## ADDED Requirements

### Requirement: Bundle checks declared config layers

`DataGrid` и `useDataGrid` из bundle, а также prebuilt grid кита, SHALL проверять
`filtering.config`, `editing.config` и `creating.config` каждой inline-колонки против типа слоя этой
поверхности из `columnConfig` bundle. Ключ, которого объявленный слой не содержит, и значение не
того типа SHALL быть ошибками компиляции.

#### Scenario: Declared filtering layer inline

- **WHEN** bundle объявил `columnConfig: defineColumnConfig<{ filtering: { creatable?: boolean } }>()`
- **AND** inline-колонка пишет `filtering: { operators: true, config: { creatable: true } }`
- **THEN** вызов компилируется

#### Scenario: Misspelled layer key inline

- **WHEN** тот же bundle получает inline-колонку с `filtering: { config: { creatabel: true } }`
- **THEN** вызов не компилируется

#### Scenario: Misspelled filtering option is still rejected

- **WHEN** inline-колонка bundle пишет `filtering: { operators: true, confg: {} }`
- **THEN** вызов не компилируется

### Requirement: Undeclared config layers are unchecked

Если `columnConfig` bundle не объявляет слой поверхности или bundle не задаёт `columnConfig` вовсе,
слой этой поверхности SHALL приниматься как объект с любыми ключами, без проверки. Это SHALL
относиться и к prebuilt grid кита, не объявившего слоёв.

#### Scenario: Kit without layers

- **WHEN** prebuilt `DataGrid` кита, не объявившего `columnConfig`, получает inline-колонку с `filtering: { component: TagFilter, config: { creatable: true } }`
- **THEN** вызов компилируется

#### Scenario: Only one surface declared

- **WHEN** bundle объявил только слой `filtering`
- **AND** inline-колонка пишет `editing: { config: { mask: 'phone' } }`
- **THEN** вызов компилируется

### Requirement: Builder output carries the bundle's config layers

Колонки, собранные `createColumns` / `createColumnHelper` bundle, SHALL проверять слои против
`columnConfig` этого bundle так же, как inline-колонки, и SHALL приниматься его `DataGrid` /
`useDataGrid`.

#### Scenario: Builder checks the layer

- **WHEN** колонка собрана `createColumns` bundle, объявившего `filtering: { creatable?: boolean }`, и пишет `filtering: { config: { creatable: 'yes' } }`
- **THEN** сборка колонок не компилируется

#### Scenario: Builder columns reach the grid

- **WHEN** колонки с `filtering.config: { creatable: true }` собраны `createColumns` того же bundle
- **AND** переданы в его `DataGrid`
- **THEN** вызов компилируется

### Requirement: The bare package grid does not check config layers

`DataGrid` и `useDataGrid`, импортированные напрямую из `@ez-kit/data-grid-react`, и
непривязанный `createColumns` SHALL принимать слои как объекты с любыми ключами, без проверки.

#### Scenario: Layer on the bare grid

- **WHEN** колонка bare `DataGrid` пишет `filtering: { config: { anything: 1 } }`
- **THEN** вызов компилируется

### Requirement: Config layers do not affect row inference

Объявление `columnConfig` SHALL NOT мешать выводу типа строки: тип строки у `DataGrid` и
`useDataGrid` из bundle со слоями SHALL выводиться из `data` без явного type-аргумента.

#### Scenario: Row inferred with layers declared

- **WHEN** bundle объявил `columnConfig`, а `useDataGrid` вызван с `data` типа `Row[]` без type-аргумента
- **AND** inline-колонка пишет `accessorKey: 'nosuch'`
- **THEN** вызов не компилируется, потому что у `Row` нет `nosuch`
