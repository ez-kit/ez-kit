# Spec Delta

## Purpose

Определяет, против какого реестра типов ячеек проверяются колонки data-grid: у column builder-ов,
у `DataGrid` / `useDataGrid` из bundle, с учётом реестра конкретного grid, и где проверки
сознательно нет.

## ADDED Requirements

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
