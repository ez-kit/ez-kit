# Proposal

## Why

Фильтр в data-grid сейчас всегда принадлежит колонке: id записи в `columnFilters` обязан называть
колонку с операторами, и пачечная запись панели отбрасывает любой другой ключ. Поэтому серверный
фильтр по полю, которого нет среди колонок (склад, «есть заказы», регион менеджера), выражается только
хаками: скрытая колонка-призрак протекает в видимость, порядок, сортировку и экспорт, а состояние
снаружи грида не видят ни `draft`, ни чипы, ни единый `filtering.onChange`.

При этом модель фильтра колонки от самой колонки почти не зависит: операторы, редактор, варианты,
пресеты и debounce выводятся из `cell` и `filtering`, а реальные потребители панели (`custom-filter-panel`,
`filtering/variants.mdx`, оба кита) поле `column` вообще не читают — только `filter` и его id. Пакеты
на `0.x`, и форму API фильтров дешевле довести до одной сущности сейчас, чем после 1.0.

## What Changes

- Новая опция таблицы `filtering.fields` — фильтруемые поля запроса, которые не являются колонками.
  Поле описывается словарём колонки (`id`, `header`, `cell`, `filtering`), но не имеет accessor и не
  участвует ни в одной колоночной фиче (видимость, порядок, ширина, закрепление, сортировка).
- Поля работают **только с серверной фильтрацией**: без `filtering.manual: true` грид их не предлагает
  и предупреждает в режиме разработки. Клиентский предикат для полей вне scope.
- Значение поля хранится в том же срезе `columnFilters`, что и фильтры колонок, — `filtering.onChange`,
  `draft`, сброс фильтров и восстановление состояния работают без новой оси. id поля, совпадающий с id
  колонки или другого поля, — ошибка при создании таблицы.
- Цель фильтра становится одной сущностью для колонок и полей: панель, хук, одиночный фильтр в тулбаре
  и полоса активных фильтров перебирают единый список, а источник (колонка или поле) — дискриминант
  внутри записи.
- **BREAKING** `useColumnFilters()` → `useFilters()`; в render-аргументах `<DataGrid.FilterPanel>`
  `columns` → `filters`; `DataGridFilterPanelColumn` → `DataGridFilterTarget`, где `column` переезжает
  в `source: { kind: 'column', column } | { kind: 'field' }`.
- **BREAKING** `ColumnFilterModel` → `FilterModel` с `id` вместо `columnId`; `ColumnFiltersValue` →
  `FiltersValue`; `OperatorColumnFilterModel` → `OperatorFilterModel`.
- **BREAKING** `<DataGrid.ColumnFilter columnId>` → `<DataGrid.Filter id>`: одиночный фильтр,
  который layout ставит в тулбар по имени, одинаково принимает id колонки и id поля.
- Полоса активных фильтров показывает чип поля и снимает его, вместо того чтобы молча пропускать
  запись `columnFilters`, у которой нет колонки.
- Без изменений: имя среза `columnFilters` (состояние TanStack), фильтр в ячейке заголовка
  (`HeaderCell` → `filter` / `filterPopover`), пропсы кит-слотов `FilterPanel` / `FilterPanelChip` /
  `FilterChip`.

## Capabilities

### New Capabilities

- `data-grid-filter-fields`: объявление фильтруемых полей уровня таблицы, их серверное ограничение,
  уникальность id, хранение в `columnFilters` и поведение во встроенных поверхностях (панель, чипы,
  одиночный фильтр, черновик).

### Modified Capabilities

- `data-grid-filter-model`: модель фильтра и пачечная запись строятся над целью фильтра (колонка или
  поле) вместо колонки; переименования публичного API (`useFilters`, `filters`, `FilterModel.id`,
  `FiltersValue`, `<DataGrid.Filter id>`); ключ поля в пачке больше не считается неизвестным;
  требование совместимости со старой формой render-аргументов заменяется новой формой.

## Impact

- `@ez-kit/data-grid-core`: `FilteringConfig.fields` и тип поля; извлечение разрешения
  `meta.filtering` из `mapColumns` в общий резолвер для колонок и полей; проверка уникальности id и
  предупреждение о полях без `manual` в `createTable`; разрешённые поля на `table.grid`.
- `@ez-kit/data-grid-react`: `column-filter-model.ts`, `column-filters-batch.ts`, `filter-panel.tsx`,
  `column-filter.tsx` (→ `Filter`), `active-filters-bar.tsx`, `render-filter-input.tsx`, гейт пустоты
  панели, compound-namespace и именованные экспорты, `index.ts`.
- Киты shadcn / heroui: пропсы слотов не меняются; правки только там, где кит импортирует
  переименованные типы или `ColumnFilter`.
- Документация: `filtering/variants.mdx`, пример `custom-filter-panel.tsx`, новая страница или раздел
  про серверные поля, `docs-option-names` (page-type-map), README `@ez-kit/data-grid-react`.
- Changeset: minor для `@ez-kit/data-grid-core` (новая опция) и `@ez-kit/data-grid-react`
  (переименования с пометкой breaking).
