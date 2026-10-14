# Design

## Context

Мотивация — в proposal.md, требования — в `specs/data-grid-infinite-pagination/spec.md`.

Конвейер строк TanStack Table v9 (`@tanstack/table-core` 9.2.4):

```
data -> core -> filtered -> grouped -> sorted -> expanded -> paginated -> getRowModel()
```

Последний шаг (`core/row-models/coreRowModelsFeature.utils.js`, `table_getPaginatedRowModel`):

```js
if (!table._rowModels.paginatedRowModel)
	table._rowModels.paginatedRowModel = table.options.features.paginatedRowModel?.(table)
if (table.options.manualPagination || !table._rowModels.paginatedRowModel) return table.getPrePaginatedRowModel()
return table._rowModels.paginatedRowModel()
```

- В 0.6.0 (v8) ядро само не подключало `getPaginationRowModel` при `mode: 'infinite'`
  (`create-table.ts:581` до `c5dcdc5e`).
- В #246 модель стала слотом `features`. Взамен условия появилось dev-предупреждение
  (`create-table-options.ts:1065-1081`), а `manualPagination: true` ставится только при
  `pagination.manual` (`create-table-options.ts:1219`).
- `@ez-kit/data-grid-react` читает `table.options.manualPagination` как признак «серверная
  пагинация»: `aria-state.ts` — `hasPartialRowSet` (стр. 69) и `hasTrustedRowTotal` (стр. 112);
  `pagination.tsx:107` — подпись «of N». `aria-row-index.tsx:43` смещает индексы на
  `pageIndex · pageSize` из состояния.

## Goals / Non-Goals

**Goals:**

- Бесконечный режим не зависит от того, зарегистрирован ли `paginatedRowModel`.
- Режим переключается конфигом на живом экземпляре.
- ARIA бесконечного грида не ухудшается из-за нового флага, а становится точнее.

**Non-Goals:**

- `aria-rowcount` при виртуализации. Комментарий в `table.tsx:358` обещает его для виртуального
  грида, но `hasPartialRowSet` виртуализацию не учитывает. Это отдельная проблема, вне этого
  изменения.
- Подпись «of N» в `<DataGrid.Pagination>` для `infinite`: компонент возвращает `null`, когда
  `table.grid.pagination.enabled` ложно, а в `infinite` оно ложно (`use-data-grid.ts`,
  `enabled: isPagedPagination`). Чтение флага в `pagination.tsx:107` до этой ветки не доходит.
- Изменения в TanStack Table.

## Decisions

### 1. `manualPagination: true` при `mode: 'infinite'`

Ядро добавляет `manualPagination: true` в опции таблицы, когда пагинация включена и
`mode === 'infinite'`. `rowCount` / `pageCount` при этом не задаются: в бесконечном режиме у
потребителя нет итога, а `getRowCount()` по умолчанию берёт длину pre-paginated модели — то есть
число накопленных строк, что и нужно.

Почему так:

- Это штатный обход в самом TanStack.
- Флаг читается при каждом вызове, поэтому смена `paged -> infinite` на живом экземпляре
  срабатывает сразу (опции пересчитываются в render body через `createTableOptions`).
- Побочные эффекты флага в TanStack нейтральны или правильны для ленты:
  `createExpandedRowModel` разворачивает подстроки сам (тот же результат, что без модели среза,
  потому что `paginateExpandedRows` по умолчанию `true`); `autoResetPageIndex` становится
  `false` — в ленте страница не листается; «выбрать всю страницу» выбирает все загруженные
  строки.

Отвергнутые альтернативы:

- **Убирать `paginatedRowModel` из переданного набора.** Модель кешируется в
  `table._rowModels.paginatedRowModel` при первом вызове, так что убрать её позже из опций
  нельзя, и на каждом рендере пересобирался бы набор. Смена режима на лету сломалась бы.
- **Читать `getPrePaginatedRowModel()` в React.** `getRowModel()` читают в десятке мест
  (виртуализация, клавиатура, ARIA, выбор строк). Правка размазалась бы по слою и не помогла бы
  потребителям, читающим таблицу напрямую.

### 2. Предупреждение про `paginatedRowModel` удаляется целиком

Оно описывало ограничение, которого больше нет. Переписывать нечего: регистрация модели рядом с
`infinite` теперь допустимая конфигурация.

### 3. `pageIndex` в бесконечном режиме — 0

`mergedPagination` в `createTableOptions` в режиме `infinite` принудительно получает
`pageIndex: 0` поверх засеянного; `pageSize` из засева сохраняется. Засеянный ненулевой
`pageIndex` в development даёт одно предупреждение (правило проекта: не глотать ошибку
конфигурации молча; по образцу соседних предупреждений о засеве `pageSize` и `grouping.by`).

Защита второго уровня — в React: `resolvePageStartIndex` для `infinite` возвращает 0, так что
даже `setPageIndex`, вызванный позже из кода потребителя, не сдвинет `aria-rowindex`.

Альтернатива — только React-защита без нормализации состояния. Отвергнута: состояние
`pagination` уходит в `onStateChange` и персист, и `pageIndex: 2` в ленте там вводит в
заблуждение.

### 4. ARIA читает режим, а не сырой флаг

`hasPartialRowSet` и `hasTrustedRowTotal` в `aria-state.ts` для бесконечного грида смотрят на
`table.grid.pagination.infinite` (`NormalizedInfiniteConfig`, его уже читает `table.tsx:264`) и
на его `hasNextPage` / `hasPreviousPage` — лента бывает двунаправленной:

| Состояние                                       | `hasPartialRowSet` | `aria-rowcount`            |
| ----------------------------------------------- | ------------------ | -------------------------- |
| `infinite`, `hasNextPage` или `hasPreviousPage` | `true`             | `-1` (`UNKNOWN_ROW_COUNT`) |
| `infinite`, оба `false`                         | `false`            | нет атрибута               |
| `manual`                                        | без изменений      | без изменений              |
| клиентская                                      | без изменений      | без изменений              |

Это совпадает с уже записанным намерением у `UNKNOWN_ROW_COUNT` («what an infinite grid
honestly has») и точнее, чем 0.6.0, где у ленты не было `aria-rowcount` вовсе.

### 5. Тест, закреплявший обходной путь, переворачивается

`apps/docs/test/example-features.test.ts:138` требует, чтобы infinite-наборы не содержали
`paginatedRowModel`. Это не регрессия ожиданий, а отменённый контракт: тест удаляется вместе с
полем `isInfinite` в `example-features/sets.ts`, если оно больше нигде не читается. Защиту
поведения берут на себя новые тесты ядра.

### 6. Changeset — minor

Решение пользователя: `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` получают minor, потому
что PR несёт много изменений. Текст changeset называет регрессию (0.7.0, #246) и то, что
`infiniteDataGridFeatures`-подобные обходы больше не нужны.

## Risks / Trade-offs

- [Чужой код читает `table.options.manualPagination` как «сервер»] → в репозитории это три места,
  все в `data-grid-react`; два переводятся на режим (решение 4), `pagination.tsx` выходит раньше
  по `grid.pagination.enabled`. Потребитель, читающий флаг сам, увидит `true` в ленте — фиксируется в changeset.
- [Пустой засеянный `pageIndex` молча меняется] → dev-предупреждение (решение 3).
- [Документация продолжит утверждать старое ограничение там, где не названо имя модели] →
  задача на вторую проверку по смыслу («slice», «one page», «without»), а не только по имени.

## Migration Plan

Потребителю ничего делать не нужно: набор без `paginatedRowModel` работает как прежде. После
релиза обходной путь (`infiniteDataGridFeatures` в UI Kit и аналоги) можно удалить и передавать
общий набор. Откат — revert изменения; данных и формата состояния он не затрагивает.
