# data-grid-column-typing Specification

## Purpose

Определяет, против какого реестра типов ячеек проверяются колонки data-grid: у column builder-ов,
у `DataGrid` / `useDataGrid` из bundle, с учётом реестра конкретного grid, и где проверки
сознательно нет.

## Requirements

### Requirement: Bundle checks inline columns against its registry

`DataGrid` и `useDataGrid`, которые возвращает `createDataGrid`, SHALL проверять каждую колонку,
переданную в `columns`, против реестра типов ячеек этого bundle. Проверяются `cell.type` (в
объектной и скалярной форме) и `cell.config`. Неизвестный id, отсутствующий обязательный config и
ключ config, который тип не объявляет, SHALL быть ошибками компиляции.

#### Scenario: Unknown cell type id inline

- **WHEN** в `useDataGrid` из bundle передана inline-колонка `{ accessorKey: 'name', cell: { type: 'nosuch' } }`
- **AND** `nosuch` не зарегистрирован ни в bundle, ни в `cellTypes` этого grid
- **THEN** вызов не компилируется

#### Scenario: Misspelled config key inline

- **WHEN** в `<DataGrid>` из bundle передана inline-колонка `{ accessorKey: 'score', cell: { type: 'number', config: { nope: 1 } } }`
- **THEN** вызов не компилируется, потому что `NumberCellConfig` не объявляет `nope`

#### Scenario: Extended built-in config inline

- **WHEN** bundle зарегистрировал `badge` с config, расширенным полем `size?: 'sm' | 'md'`
- **THEN** inline-колонка с `config: { items, size: 'sm' }` компилируется
- **AND** колонка с `size: 'xl'` не компилируется

### Requirement: Kit prebuilt grids check columns against the kit registry

Prebuilt `DataGrid` и `useDataGrid`, которые экспортирует UI-кит, SHALL проверять колонки против
реестра этого кита так же, как bundle из `createDataGrid`.

#### Scenario: Kit grid rejects an unknown id

- **WHEN** в prebuilt `DataGrid` кита передана inline-колонка с `cell: { type: 'nosuch' }`
- **THEN** вызов не компилируется

#### Scenario: Kit grid accepts a built-in type

- **WHEN** в prebuilt `DataGrid` кита передана inline-колонка с `cell: { type: 'date' }`
- **THEN** вызов компилируется

### Requirement: Per-grid cellTypes widen the accepted ids

Если grid из bundle получает свой `cellTypes`, колонки этого grid SHALL проверяться против реестра
bundle, объединённого с реестром из `cellTypes`. Допустимые id SHALL определяться только реестрами,
а не самими колонками: колонка не может сделать свой `cell.type` допустимым, просто его назвав.

#### Scenario: Type registered on one grid

- **WHEN** grid из bundle получает `cellTypes={{ rating: ratingCellType }}`
- **AND** inline-колонка того же grid пишет `cell: { type: 'rating' }`
- **THEN** вызов компилируется

#### Scenario: Column cannot register its own id

- **WHEN** grid из bundle получает `cellTypes`, в котором нет `nosuch`
- **AND** inline-колонка пишет `cell: { type: 'nosuch' }`
- **THEN** вызов не компилируется

### Requirement: Row type inference is preserved

Типизация колонок по реестру SHALL NOT мешать выводу типа строки. Тип строки у `DataGrid` и
`useDataGrid` из bundle SHALL выводиться из `data` без явного type-аргумента, и `accessorKey`
inline-колонок SHALL проверяться по ключам этого типа.

#### Scenario: Row type inferred from data

- **WHEN** `useDataGrid` из bundle вызван с `data: Row[]` и inline-колонками
- **THEN** возвращаемая таблица типизирована строкой `Row` без явного type-аргумента

#### Scenario: Accessor typo

- **WHEN** inline-колонка пишет `accessorKey: 'nam'`, а у `Row` есть ключ `name`
- **THEN** вызов не компилируется

#### Scenario: View value typed by accessor

- **WHEN** inline-колонка с `accessorKey: 'score'` (числовое поле) задаёт `cell.component`
- **THEN** `value` в этом компоненте типизирован как число

### Requirement: Builder output is accepted when its registry fits

Колонки, собранные builder-ом (`createColumns` / `createColumnHelper` bundle или непривязанный
`createColumns<Row, Registry>`), SHALL приниматься bundle-овским `DataGrid` / `useDataGrid`, если
все их типы ячеек есть в реестре этого grid. Колонки с типом, которого в реестре grid нет, SHALL
отвергаться.

#### Scenario: Base-registry columns into a kit grid

- **WHEN** колонки собраны непривязанным `createColumns<Row>` (базовый реестр)
- **AND** переданы в `DataGrid` кита
- **THEN** вызов компилируется

#### Scenario: Foreign-registry columns

- **WHEN** колонки собраны `createColumns` другого bundle и содержат `cell: { type: 'rating' }`
- **AND** переданы в `DataGrid`, в реестре которого и в чьём `cellTypes` нет `rating`
- **THEN** вызов не компилируется

### Requirement: The bare package grid does not check cell types

`DataGrid` и `useDataGrid`, импортированные напрямую из `@ez-kit/data-grid-react` (не из bundle),
SHALL NOT проверять `cell.type` и `cell.config` колонок: их реестр приходит в рантайме через
провайдер и не виден типам. Тип строки и `accessorKey` SHALL проверяться как и раньше.

#### Scenario: Provider-registered type on the bare grid

- **WHEN** тип `status` зарегистрирован через провайдер реестра
- **AND** колонка bare `DataGrid` пишет `cell: { type: 'status' }`
- **THEN** вызов компилируется

### Requirement: Runtime behaviour is unchanged

Изменение SHALL касаться только типов. Колонка с id, которого нет в реестре во время рендера,
SHALL по-прежнему рендерить сырое значение, как и сейчас.

#### Scenario: Unregistered id at runtime

- **WHEN** колонка, обошедшая проверку (например, через приведение типа), пишет незарегистрированный `cell.type`
- **THEN** ячейка рендерит сырое значение без ошибки

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
