# Tasks

## 1. Ядро: бесконечный режим не режет строки

- [x] 1.1 Написать падающие тесты в `packages/data-grid/core/src/create-table/create-table.test.ts` (TDD, RED): `allDataGridFeatures` + `pagination: { mode: 'infinite' }` + `pageSize` 10 + 25 строк → `table.getRowModel().rows.length === 25`; то же с `trigger: 'manual'`; то же с сортировкой, фильтром и `grouping.by`. Проверить: `pnpm --filter @ez-kit/data-grid-core test` падает именно на этих случаях
- [x] 1.2 Написать падающий тест переключения: один экземпляр с полным набором и 25 строками, опции пересчитаны из `{ pageSize: 10 }` в `{ mode: 'infinite' }` → 25 строк без пересоздания таблицы. Проверить: тест красный
- [x] 1.3 В `create-table-options.ts` (блок `// Pagination manual`) ставить `manualPagination: true` при включённой пагинации и `mode === PaginationMode.Infinite`, без `rowCount` / `pageCount`; комментарий объясняет почему (регрессия #246, кеш `_rowModels.paginatedRowModel`). Проверить: тесты 1.1–1.2 зелёные
- [x] 1.4 Добавить регрессионные тесты, что обычная клиентская пагинация (10 строк из 25) и `pagination.manual` (`rowCount`, число страниц) не изменились; существующие тесты пагинации не трогать. Проверить: `pnpm --filter @ez-kit/data-grid-core test` зелёный
- [x] 1.5 Удалить dev-предупреждение про `paginatedRowModel` (`create-table-options.ts`, блок над «Row ordering») и добавить тест: `allDataGridFeatures` + `infinite` в development не пишет в `console.warn` ничего о `paginatedRowModel`. Поправить комментарий в `create-table-options.test.ts:651`, который обосновывал отсутствие модели этим предупреждением. Проверить: тест зелёный, `grep -n "still sliced to one" packages/data-grid/core/src` пуст

## 2. Ядро: pageIndex в бесконечном режиме

- [x] 2.1 Написать падающий тест: `infinite` + `initialState.pagination: { pageIndex: 2, pageSize: 20 }` → состояние `{ pageIndex: 0, pageSize: 20 }`, все строки в модели, одно `console.warn` с `initialState.pagination.pageIndex`. Проверить: тест красный
- [x] 2.2 В `mergedPagination` (`create-table-options.ts`) в режиме `infinite` принудительно ставить `pageIndex: 0` поверх засева, сохраняя `pageSize`; dev-предупреждение по образцу соседних про `pageSize` / `grouping.by`. Проверить: тест 2.1 зелёный, тест без засеянного `pageIndex` предупреждения не даёт
- [x] 2.3 Обновить docblock `pagination` / `PaginationMode.Infinite` в `packages/data-grid/core/src/types.ts`: режим показывает все накопленные строки при любом наборе фич, `pageIndex` в нём всегда 0. Проверить: `pnpm --filter @ez-kit/data-grid-core typecheck` и `lint` зелёные

## 3. React: ARIA бесконечного грида

- [x] 3.1 Написать падающие тесты в `packages/data-grid/react/react/src/data-grid/aria-state.test.tsx` (или рядом, где рендерится грид): `infinite` + полный набор: `hasNextPage: true` → `aria-rowcount="-1"`; `hasNextPage: false, hasPreviousPage: true` → `-1`; оба `false` → атрибута нет; первая строка → `aria-rowindex` = строки заголовка + 1. Проверить: `pnpm --filter @ez-kit/data-grid-react test` красный именно на них
- [x] 3.2 В `aria-state.ts` перевести `hasPartialRowSet` и `hasTrustedRowTotal` на режим (`table.grid.pagination.infinite` и его `hasNextPage` / `hasPreviousPage`) для бесконечного грида; ветка `manualPagination` для серверной пагинации остаётся. Обновить docblock'и, включая `UNKNOWN_ROW_COUNT`. Проверить: тесты 3.1 по `aria-rowcount` зелёные
- [x] 3.3 `resolvePageStartIndex` / `AriaRowIndexProvider` (`aria-row-index.tsx`): в бесконечном режиме смещение 0 независимо от `pageIndex` в состоянии; тест — `infinite` с `pageIndex`, выставленным через `table.setPageIndex(2)`, первая строка сохраняет индекс. Проверить: тест зелёный
- [x] 3.4 Прогнать существующие infinite-тесты React (`use-infinite-scroll.test.tsx`, `flow-windowing.test.tsx`, тесты виртуализации) и при необходимости добавить случай `infinite` + `virtualization.row` + полный набор → виртуализатор получает все строки. Ожидания существующих тестов не менять. Проверить: `pnpm --filter @ez-kit/data-grid-react test` зелёный

## 4. Документация, примеры и тест docs

- [x] 4.1 Удалить тест `leaves paginatedRowModel out of every infinite-scroll set` в `apps/docs/test/example-features.test.ts` и поле `isInfinite` в `example-features/sets.ts`, если его больше никто не читает. Проверить: `pnpm --filter @ez-kit/docs test -- example-features` зелёный
- [x] 4.2 `apps/docs/content/docs/data-grid/pagination/infinite-scroll.mdx` (стр. 10–11) и `feature-set.mdx:107`: убрать требование «без `paginatedRowModel`», написать, что режим выбирается конфигом при любом наборе, и показать один набор на постраничный и бесконечный разделы. Проверить: `docs-option-names.test.ts` зелёный
- [x] 4.3 Пять infinite-примеров (`apps/docs/shared/data-grid/examples/components/infinite-scroll/{auto,manual,reset-on-query,virtualized}.tsx`, `production/features.ts`): убрать комментарии про опущенную модель; где пример собирает набор только ради её отсутствия — вернуть модель или перейти на общий набор. Без внутренних комментариев в примерах (они видны в панели исходника). Проверить: `pnpm --filter @ez-kit/docs typecheck` и `test` зелёные
- [x] 4.4 Вторая проверка по смыслу, а не по имени: найти в `packages/data-grid/**` (docblock'и, README) и `apps/docs/content/**` утверждения вида «infinite … slice / one page / without paginatedRowModel» и исправить. Проверить: `grep -rniE "infinite.{0,80}(slice|one page|without .paginatedRowModel)"` по этим путям не находит устаревших утверждений

## 5. Changeset и общий гейт

- [x] 5.1 Добавить `.changeset/infinite-pagination-unsliced.md`: **minor** для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` (не `@ez-kit/data-grid-shadcn`). Текст на английском: регрессия с 0.7.0 (#246) исправлена, `paginatedRowModel` больше не нужно убирать из набора для `mode: 'infinite'`, `pageIndex` в этом режиме всегда 0, `table.options.manualPagination` теперь `true` в `infinite`, ARIA `aria-rowcount`. Проверить: `node scripts/check-changesets.mjs` зелёный
- [x] 5.2 Полный гейт последовательно: `pnpm build`, затем `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size` (каждый отдельно). Проверить: всё зелёное; таймауты на загруженной машине перепроверить запуском пакета отдельно
- [x] 5.3 e2e бесконечной прокрутки: `apps/docs/e2e/packages/data-grid/pagination/infinite-scroll.spec.ts` для shadcn и heroui. Проверить: спека зелёная, подгрузка дописывает строки в браузере

## Workflow follow-up

- Не коммитить без явной просьбы пользователя.
- После мержа: в UI Kit удалить `infiniteDataGridFeatures` (`apps/docs/examples/DataGrid/_shared/infinite-features.ts`, `apps/storybook/src/data-grid/_infinite-features.ts`) и сниппет в `apps/docs/content/docs/data-grid/pagination/infinite-scroll.mdx`.
- Архивировать изменение после ревью.
