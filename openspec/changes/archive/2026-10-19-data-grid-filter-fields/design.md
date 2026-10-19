# Design

## Context

Мотивация — в proposal.md. Здесь только то, что определяет подход.

- `createTableOptions` (`core/src/create-table/create-table-options.ts`) прогоняет колонки через
  `mapColumns`. Там `filtering` и `cell` колонки разрешаются в `meta.filtering`: операторы из
  реестра, `filterFn`-диспетчер, `items`, пресеты дат, `faceted`, `debounce`, `component`. Результат
  `createTableOptions` содержит `grid`, который `createTable` кладёт на `table.grid`. Это
  нетанстековый конфиг, который читает React-слой.
- В React-слое модель фильтра строит `resolveColumnFilter(column, …)` (`column-filter-model.ts`).
  От колонки он берёт `meta.filtering`, `meta.cell.type`, `header`, `getFilterValue` /
  `setFilterValue` и `getFacetedUniqueValues`. От этого же зависят `renderFilterInput` (через
  `header.column`), `FilterPanel`, `ColumnFilter`, пачечная запись (`column-filters-batch.ts`) и
  `ActiveFiltersBar` (`table.getColumn(cf.id)` → `continue`).
- Пропсы кит-слотов (`FilterPanelProps`, `FilterPanelChipProps`, `FilterChipProps`) колонку не
  упоминают, поэтому китам почти ничего менять не придётся.
- При `manual: true` TanStack не строит отфильтрованную модель строк, и запись `columnFilters` с id,
  которого нет среди колонок, для него просто состояние.

## Goals / Non-Goals

**Goals:**

- Одна внутренняя абстракция «цель фильтра», через которую модель, контрол, чип и пачечная запись
  работают одинаково для колонки и поля.
- Одно правило разрешения `filtering` + `cell` → мета фильтра для колонок и полей, чтобы
  поведение не разошлось.
- Ноль изменений в пропсах кит-слотов.

**Non-Goals:**

- Клиентский предикат поля (`filterFn` по строке). Поля — только при `manual`.
- Фасетные значения для полей (они есть только у колонки с данными).
- Переименование среза `columnFilters`, `FilteringConfig.onChange` и `ColumnFiltersState`. Это
  имена TanStack и состояния, а не модели фильтра.
- Фильтр поля в ячейке заголовка: у поля нет заголовка.
- Новые кит-слоты.

## Decisions

### 1. Поля хранятся в срезе `columnFilters`

Отдельный срез `fieldFilters` потребовал бы новой `DraftAxis`, второго `onChange` и второго
снимка `applied` — ради разделения, которое серверу не нужно: бэку всё равно, был ли у фильтра
столбец. Цена общего среза — коллизия id. Она закрыта проверкой при создании таблицы (решение 4).

### 2. Общий резолвер меты фильтра в core

Из `mapColumns` выделяется функция, которая по `filtering`, `cell`, реестру операторов и
табличным значениям по умолчанию (`operators`, `faceted`) возвращает `ColumnFilteringMeta` и
`filterFn`. Колонка зовёт её как раньше, поле — с `faceted` принудительно выключенным. Разрешённые
поля (`id`, `label`, `cell`, мета фильтра) кладутся в `grid` рядом с остальным конфигом React-слоя,
поэтому `table.grid` — единственное место, откуда адаптер их читает.

`filterFn` поля не используется: при `manual` TanStack его не вызывает. Резолвер его всё равно
возвращает, а поле его отбрасывает. Это проще, чем второй путь без диспетчера.

Альтернатива — разрешать поля в React-слое — отвергнута: разрешение операторов и пресетов живёт в
core, и второе место разошлось бы с ним при первом же новом операторе.

### 3. Цель фильтра — внутренняя абстракция React-слоя

```
FilterTarget (внутр.) = {
  id, label, cellType, filteringMeta, cellConfig,
  getValue(), setValue(v), facetedValues?(),
  source: { kind: 'column', column } | { kind: 'field' }
}
```

Для колонки `getValue` / `setValue` — это `column.getFilterValue` / `setFilterValue`. Для поля —
чтение записи из `table.getState().columnFilters` и `table.setColumnFilters(updater)`, который
заменяет или удаляет одну запись. `resolveColumnFilter` становится `resolveFilter(target, …)`,
`renderFilterInput` принимает цель вместо `header`, а заголовок колонки строит цель из
`header.column`. Список целей собирает одна функция: фильтруемые колонки в порядке колонок, затем
поля, если `manual`. Её используют `useFilters`, `FilterPanel`, `Filter`, `ActiveFiltersBar` и
пачечная запись — набор «известных ключей» в пачке совпадает с набором целей.

Публичный тип `DataGridFilterTarget` — это то, что получает render-функция: `id`, `label`,
`valueDisplay`, `hasValue`, `input`, `onClear`, `filter`, `source`. Внутренние `getValue` /
`setValue` наружу не выходят: запись идёт через `filter.setValue`.

### 4. Ошибки конфигурации

- Коллизия id поля с колонкой (включая системные `__select__`, `__drag__` и т. п.) или с другим
  полем — `throw` в `createTableOptions` во всех режимах. Это детерминированная ошибка
  конфигурации, а молчаливая двойная запись одной записи хуже падения. Проверка — одно множество
  id, её цена ничтожна. Так же уже ведёт себя колонка без id.
- `fields` без `manual: true` — предупреждение в режиме разработки, поля не предлагаются. Не
  `throw`: `manual` может приходить из слоя defaults, и временно выключенная серверная фильтрация не
  должна ронять страницу.

### 5. Переименования, а не добавления

`columns` → `filters`, `useColumnFilters` → `useFilters`, `ColumnFilter` → `Filter`,
`columnId` → `id`. Дополнительный массив `fields` рядом с `columns` был рассмотрен и отвергнут: он
оставляет API, который придётся ломать позже, а панель на `columns.map` не видит поля. Старые имена
не сохраняются как deprecated-алиасы: пакет на `0.x`, а алиас на компаунд-члене (`DataGrid.ColumnFilter`)
тянул бы в `Object.assign` лишний ключ (см. заметку про `/* @__PURE__ */` в AGENTS.md).

`<DataGrid.Filter>` вместо `ColumnFilter`: этот компонент — не фильтр в заголовке, а одиночный чип,
который layout ставит в тулбар по имени. Поле туда ставится так же, как колонка. Именованный экспорт
— `DataGridFilter`, рядом с остальными `DataGrid*`.

### 6. Чип поля

`FilterChipKind` не расширяется: чип поля получает `kind: 'column'`. `kind` отличает запись среза
`columnFilters` от глобального поиска, и киты стилизуют именно эту разницу. Новое значение было бы
изменением закрытого множества, которое обязаны обработать оба кита и внешние киты, а различать
поле и колонку визуально никто не просил. Метку берём из `header` поля, сводку — тем же
`renderValueDisplay` с операторами поля, снятие — через `setValue(undefined)` цели.

## Risks / Trade-offs

- [Поле с `cell.type`, тип фильтра которого зависит от колонки (собственный `filtering.component`
  читает только `value` / `onChange` / `config`)] → `InputComponentProps` колонку и так не содержит,
  так что поле получает ровно тот же контракт. Покрыть тестом с `filtering.component` у поля.
- [`docs-option-names` резолвит имена через `getPropertiesOfType`, и новая таблица опций поля должна
  попасть в `page-type-map`] → задача на обновление карты страниц и счётчиков в tasks.md.
- [Внешние панели на `useColumnFilters` / `columns` ломаются при обновлении] → breaking-пометка в
  changeset с таблицей переименований. Логику переписывать не нужно: реальные потребители читают
  `filter` и id.
- [Draft: снимок `applied.columnFilters` с записью поля] → ожидается, что работает без изменений.
  Подтверждается тестом из спеки «Поле под отложенным применением».
- [Состояние восстановлено из URL с полем, а `manual` выключен] → запись лежит в срезе, но целью не
  является: её не видно ни в панели, ни в чипах. Это совпадает с поведением записи удалённой
  колонки сегодня и предупреждается при создании таблицы.

## Migration Plan

Для потребителя — механические переименования, их таблица в changeset:

| Было                                                                                                | Стало                                                                        |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `useColumnFilters()`                                                                                | `useFilters()`                                                               |
| `({ columns })` в `<DataGrid.FilterPanel>`                                                          | `({ filters })`                                                              |
| `entry.column`                                                                                      | `entry.source.kind === 'column' ? entry.source.column : …`                   |
| `filter.columnId`                                                                                   | `filter.id`                                                                  |
| `<DataGrid.ColumnFilter columnId='x'>`                                                              | `<DataGrid.Filter id='x'>`                                                   |
| `DataGridFilterPanelColumn`, `ColumnFilterModel`, `OperatorColumnFilterModel`, `ColumnFiltersValue` | `DataGridFilterTarget`, `FilterModel`, `OperatorFilterModel`, `FiltersValue` |

Откат — revert изменения. Данные и состояние не мигрируют: срез и его записи не меняют формы.
