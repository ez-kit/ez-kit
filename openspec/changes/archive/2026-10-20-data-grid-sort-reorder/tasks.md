# Tasks

## 1. Core: словарь и опции

- [x] 1.1 Добавить `ReorderMode` (const-объект плюс union, docblock на каждом члене) в `core/src/types.ts` и экспортировать из корня; проверить: `pnpm --filter @ez-kit/data-grid-core typecheck` зелёный
- [x] 1.2 Заменить в `ColumnOrderingConfig` поля `drag` / `moveControls` на `header?: boolean | ReorderMode`, а `visibilityMenu` — на `boolean | ReorderMode`; удалить `VisibilityMenuOrderingConfig`; переписать docblock'и (таблица разрешения, дефолты); проверить type-тестом сценарии «Строковое значение» и «Старые флаги» из `data-grid-reorder-mode`
- [x] 1.3 Добавить `reorderable?: boolean | ReorderMode` в `MultiSortConfig` с docblock'ом; проверить: typecheck core зелёный
- [x] 1.4 Добавить сообщения `sorting.moveUp` / `moveDown` / `dragSort` (функции от `{ label }`) и `ordering.sortPickedUp` / `sortMovedTo` / `sortDropped` / `sortCancelled` с дефолтами в `messages/defaults.ts`; проверить: `pnpm --filter @ez-kit/data-grid-core test` зелёный, частичный словарь без новых ключей проходит typecheck

## 2. React: разрешение режима на трёх поверхностях

- [x] 2.1 Свести `resolvePanelAffordances` / `resolveHeaderAffordances` в одну `resolveReorderMode(mode, fallback, hasAdapter)` и покрыть таблицу разрешения из спеки (`true` / `'drag'` / `'step'` / `'both'` / `false` × с адаптером / без) юнит-тестом; проверить: тест зелёный
- [x] 2.2 Перевести `use-data-grid.ts` и `resolved-options.ts` на авторские значения (`ordering.header.mode`, `ordering.visibilityMenu.mode`, новый `sortReorder` с дефолтом от `multi`), оставив `sorting: boolean`; проверить: `defaults.test.tsx` обновлён и зелёный
- [x] 2.3 Перевести `header-cell.tsx`, `visibility-trigger.tsx`, `visibility-item.tsx` на `resolveReorderMode`; заменить `usePanelAffordanceWarnings` общим хуком предупреждения «`'drag'` / `'both'` без адаптера» с именем опции и удалить предупреждение «ничего не предложено»; проверить: `column-drag.test.tsx`, `visibility-panel-affordances.test.tsx` и тесты панели переписаны на новый конфиг и зелёные, плюс тест сценариев «Значения по умолчанию по поверхностям» и «Предупреждение о ручке без адаптера»
- [x] 2.4 Обновить документацию колонок (`columns/ordering.mdx`, `columns/visibility.mdx`, `drag-and-drop/columns.mdx`, `drag-and-drop/api.mdx`) под `header` / `visibilityMenu: boolean | ReorderMode` с таблицей миграции, docs-примеры, которые пишут старые флаги, и счётчики в `page-type-map.ts`; проверить: `grep -rn "moveControls" apps/docs packages/data-grid --include='*.ts*' --include='*.mdx'` находит только CHANGELOG'и и внутреннее имя пары, `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный

## 3. React: билдер сортировки

- [x] 3.1 Исправить `sort-menu-trigger.tsx`: `canAddSort` учитывает `enableMultiSort` и `maxMultiSortColCount`, `onAddSort` в недоступном состоянии ничего не делает, колонки с `getCanMultiSort() === false` не предлагаются для второй и следующих записей; проверить тестами сценариев требования «Добавление записи подчиняется multi»
- [x] 3.2 Добавить `SortMenuItem.ordering` (та же форма, что `VisibilityColumnItem.ordering`) и заполнять его, когда режим билдера предлагает шаги; шаг меняет запись с соседней, сохраняя направления; проверить тестами «Поднять запись», «Края списка», «Шаги не предложены»
- [x] 3.3 Добавить `DragAxis.Sorting` в dnd-порт (docblock: ось называет срез `sorting`), ветку в `onDrop` / `canDrop` в `data-grid.tsx` и ветку в `dnd-announcements.ts`; проверить юнит-тестом с noop/фейковым адаптером: сброс `a` на `c` даёт `[b, c, a]` и один `onChange`
- [x] 3.4 Добавить `<DataGrid.SortItem sortId>` (форма-элемент и render-функция, `itemProps` с `data-slot="sort-row"`, `handleProps`, `isDragging`), экспортировать в компаунде и по имени (`DataGridSortItem`); проверить тестами сценариев требования «Строка билдера в перетаскивании» и `tree-shaking.test.ts` (обновить зафиксированные множества, если сдвинулись)
- [x] 3.5 Обновить тип рендер-аргументов `<DataGrid.SortMenuTrigger>` и docblock'и, test-utils kit (`SortMenu` рисует пару шагов); проверить: `pnpm --filter @ez-kit/data-grid-react test typecheck lint` зелёные

## 4. Киты

- [x] 4.1 shadcn: `SortMenu` рендерит строки через `<DataGrid.SortItem>`, ручку (самоскрывается при `handleProps: null`) и пару шагов с подписями из сообщений; `dnd.tsx` добавляет `sorting` в `DRAG_AXES`; keyboard-guard на списке записей в поповере; проверить: `pnpm --filter @ez-kit/data-grid-shadcn test typecheck lint` зелёные
- [x] 4.2 heroui: то же в `SortMenu` и `dnd.tsx`; проверить: `pnpm --filter @ez-kit/data-grid-heroui test typecheck lint` зелёные
- [x] 4.3 Пересобрать registry (`pnpm --filter @ez-kit/docs registry:build`) и проверить: `registry-payload.test.ts` зелёный, `data-grid.json` по-прежнему без `@dnd-kit`

## 5. Документация, примеры и e2e сортировки

- [x] 5.1 В `sorting.mdx`: строка `reorderable` в таблице `MultiSortConfig`, абзац про перестановку в разделе «Multi-sort builder» (шаги / ручка, зависимость от адаптера, серверная сортировка — запрос на шаг, `Add sort` подчиняется `multi`), счётчик в `page-type-map.ts`; пример `sort-toolbar` с `multi: true` (без внутренних комментариев в исходнике); проверить: `docs-option-names` зелёный, пример рендерится в обоих китах
- [x] 5.2 e2e в `apps/docs/e2e/packages/data-grid/` для билдера: шаг вверх меняет приоритет, перетаскивание мышью и с клавиатуры (`Space`, `ArrowDown`, `Space`) сдвигает запись на одну позицию, `Add sort` недоступен при `multi: false`; проверить: спеки проходят в shadcn и heroui, `e2e-slots.test.ts` зелёный
- [x] 5.3 axe на открытом билдере с ручками и шагами; проверить: нарушений нет в обоих китах

## 6. Релиз и интеграционная проверка

- [x] 6.1 Changeset `minor` для `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/data-grid-heroui`: breaking-миграция `ordering.column.*` (таблица), `ReorderMode`, `sorting.multi.reorderable`, изменение `Add sort` при `multi: false` / `max`, новая ось `DragAxis.Sorting` для внешних адаптеров, новые ключи сообщений для полных словарей; проверить: `node scripts/check-changesets.mjs` зелёный
- [x] 6.2 Прогнать `pnpm verify:affected`, затем последовательно `build`, `lint`, `typecheck`, `test`, `size`; проверить, что все зелёные

## Workflow follow-up

- Архивировать change после ревью и merge.
