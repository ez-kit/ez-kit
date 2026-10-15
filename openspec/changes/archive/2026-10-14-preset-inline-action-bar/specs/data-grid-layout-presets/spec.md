# Spec Delta

## Purpose

Определяет, что рисуют готовые раскладки data-grid (`DefaultLayout`, `BottomBarLayout`,
`FilterPanelLayout`, `PopoverFiltersLayout`) и в каком порядке, чтобы грид с просто включёнными
фичами выглядел корректно без своей раскладки.

## ADDED Requirements

### Requirement: Встроенная панель действий стоит над таблицей

Когда `selection.bar.variant` равен `'inline'`, каждая готовая раскладка MUST рисовать панель
действий (`[data-slot="action-bar"]`) после тулбара и до таблицы (`[data-slot="table-wrapper"]`).
В `FilterPanelLayout` панель MUST стоять после полосы активных фильтров, непосредственно перед
таблицей.

#### Scenario: inline в DefaultLayout

- **WHEN** грид рендерится с `DefaultLayout`, `selection: { bar: 'inline' }` и выделенной строкой
- **THEN** `[data-slot="action-bar"]` стоит в DOM раньше `[data-slot="table-wrapper"]`
- **AND** позже тулбара

#### Scenario: inline в BottomBarLayout и PopoverFiltersLayout

- **WHEN** грид рендерится с `BottomBarLayout` или `PopoverFiltersLayout` и
  `selection: { bar: 'inline' }`
- **THEN** панель действий стоит между тулбаром и `[data-slot="table-wrapper"]`

#### Scenario: inline в FilterPanelLayout

- **WHEN** грид рендерится с `FilterPanelLayout`, `selection: { bar: 'inline' }` и активным
  фильтром колонки
- **THEN** панель действий стоит после полосы активных фильтров и раньше
  `[data-slot="table-wrapper"]`

### Requirement: Плавающая панель действий остаётся последней

Когда `selection.bar.variant` равен `'floating'` или не задан, каждая готовая раскладка MUST
рисовать панель действий последним элементом, после таблицы и нижней панели или пагинации, как
до этого изменения.

#### Scenario: floating по умолчанию

- **WHEN** грид рендерится с любой готовой раскладкой, `selection: true` и выделенной строкой
- **THEN** `[data-slot="action-bar"]` стоит в DOM позже `[data-slot="table-wrapper"]`

#### Scenario: Явный floating

- **WHEN** грид рендерится с `selection: { bar: 'floating' }`
- **THEN** панель действий стоит после таблицы

### Requirement: Готовая раскладка рисует ровно одну панель действий

Каждая готовая раскладка MUST рисовать не больше одного экземпляра панели действий при любом
варианте.

#### Scenario: Одна панель при каждом варианте

- **WHEN** грид рендерится с любой готовой раскладкой и вариантом `'inline'` или `'floating'`
- **THEN** в DOM ровно один `[data-slot="action-bar"]`

### Requirement: Смена варианта на лету переносит панель

Когда `selection.bar` меняется между `'inline'` и `'floating'` у уже отрисованного грида, готовая
раскладка MUST перенести панель на место, соответствующее новому варианту, без ошибок рендера и
без изменения выделения строк.

#### Scenario: Переключение с floating на inline сохраняет выделение

- **WHEN** грид с готовой раскладкой и выделенной строкой перерисовывается с `selection.bar`,
  сменившимся с `'floating'` на `'inline'`
- **THEN** панель действий стоит перед `[data-slot="table-wrapper"]`
- **AND** выделенная строка остаётся выделенной, а панель одна

#### Scenario: Переключение обратно на floating

- **WHEN** тот же грид перерисовывается с `selection.bar: 'floating'`
- **THEN** панель действий стоит после таблицы, и выделение не изменилось

### Requirement: Своя раскладка задаёт место панели сама

Когда тело грида задано через `children` или через зарегистрированный потребителем
`core.Layout`, грид MUST рисовать панель действий только там, где её поставил автор раскладки,
независимо от варианта.

#### Scenario: inline-панель в children после таблицы

- **WHEN** грид рендерится с `selection: { bar: 'inline' }` и `children`, где
  `<DataGrid.ActionBar />` стоит после `<DataGrid.Table />`
- **THEN** панель действий стоит после таблицы, и она одна
