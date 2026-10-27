# Tasks

## 1. Core: `enforce` восстанавливает `columnOrder`, появляется `strip`

- [x] 1.1 В `core/src/column-state/column-state.test.ts` добавить падающие тесты для `enforceColumnInvariants` на `columnOrder`: непустой порядок без forced-колонок получает `forcedStart` в начало и `forcedEnd` в конец в порядке объявления; присутствующие forced-id не двигаются; пустой порядок и state без ключа `columnOrder` возвращаются по ссылке. Проверка: `pnpm --filter @ez-kit/data-grid-core test` падает на новых тестах
- [x] 1.2 Реализовать восстановление `columnOrder` в `enforceColumnInvariants` с сохранением контракта «та же ссылка, если менять нечего» и обновить JSDoc модуля (инварианты держат три среза, а не два). Проверка: тесты 1.1 зелёные, существующие тесты `column-state` и `create-table*.test.ts` зелёные
- [x] 1.3 Тесты на `strip` (новая функция в `column-state.ts`): убирает forced-id из `columnPinning.start/end` и `columnOrder` и ключи `alwaysVisible` из `columnVisibility`; оставляет не-forced системные колонки (`initialSide`, `pinning: false`); возвращает state и каждый нетронутый срез по ссылке; не создаёт отсутствующих срезов. Проверка: тесты падают до реализации
- [x] 1.4 Реализовать `strip`. Проверка: тесты 1.3 зелёные
- [x] 1.5 Тест-свойство: для состояний, полученных через `setColumnPinning`, `moveColumn`, `dropColumn` и `setColumnVisibility` на гриде с `selection`, `expanding`, `deleting` и статически закреплённой пользовательской колонкой, `enforce(strip(s))` равен `s` по значению для `columnPinning`, `columnOrder` и видимости колонок. Проверка: тест зелёный

## 2. Core: `table.grid.columnState` и инварианты на всех записях

- [x] 2.1 Падающие тесты в `create-table.test.ts`: `table.grid.columnState.enforce` / `strip` существуют и замкнуты на инварианты этой таблицы; `table.setColumnOrder(['name'])` при `selection: true` даёт `__selection__` первой в `getAllLeafColumns()`; `initialState.columnOrder = ['age', 'name']` даёт тот же результат; `initialState.columnOrder = []` остаётся `[]`. Проверка: тесты падают
- [x] 2.2 Добавить `columnState: { enforce, strip }` в `GridOptions` (`create-table-options.ts`) с JSDoc (что forced, какие срезы, гарантия ссылок); передать `constrain` в `onColumnOrderChange`; убедиться, что seed `initialState` проходит восстановление `columnOrder`. Проверка: тесты 2.1 зелёные, `pnpm --filter @ez-kit/data-grid-core typecheck` и `lint` чистые
- [x] 2.3 Проверить, что `enforceColumnInvariants` и `strip` не попали в публичный API core: `columnState` есть в типе `GridOptions`, root-экспорт не изменился. Проверка: `apps/docs/test/tree-shaking.test.ts` и тест публичного API core (если есть) зелёные

## 3. React: `enforce` в controlled publish

- [x] 3.1 Падающие тесты в `packages/data-grid/react/react/src` (рядом с `use-data-grid*.test.tsx`): `state={{ columnPinning: { start: [], end: [] } }}` при `selection` и `deleting` рендерит `__selection__` закреплённой в начале и `__actions__` в конце; `state.columnVisibility = { __actions__: false }` рендерит колонку; `state.columnOrder = ['age', 'name']` даёт `__selection__` первой. Проверка: тесты падают на текущем коде
- [x] 3.2 Тест на петлю: потребитель зеркалит `onStateChange` в `useState` и стартует с пустыми массивами — при монтировании `onStateChange` не вызван, рендер стабилизируется, а последующее закрепление `name` даёт ровно один вызов с `__selection__` в `start`; значение без нарушений публикуется той же ссылкой и `onStateChange` не вызывает. Проверка: тест падает или зависает до реализации
- [x] 3.3 В `use-data-grid.ts` прогонять controlled-значение после `normalizeControlledState` через `table.grid.columnState.enforce` с кешем по ссылке каждого из трёх входных срезов; класть результат в `controlledStateRef.current`, чтобы его читали обе публикации и `isControlledEcho`. Проверка: тесты 3.1 и 3.2 зелёные; существующие тесты `use-data-grid*.test.tsx`, `feature-optionality.test.tsx`, `host-rerender-isolation.test.tsx` зелёные без правки ожиданий
- [x] 3.4 Обновить JSDoc в `column-state.ts` («not a controlled `state` sync» теперь верно) и комментарий у controlled publish в `use-data-grid.ts`. Проверка: `pnpm --filter @ez-kit/data-grid-react lint`

## 4. React: `strip` в утилитах persist

- [x] 4.1 Падающие тесты для `extractState` (`state/*.test.ts`): грид с `selection`, `deleting`, `ordering.row` без действий пользователя даёт `columnPinning: { start: [], end: [] }`; закреплённая `name` даёт `start: ['name']`; после перемещения колонки `columnOrder` без forced-id; исправленная `__actions__: true` не попадает в `columnVisibility`; `__selection__` с `initialSide`, которую пользователь открепил, восстанавливается незакреплённой; объект с одним `store` (без `grid`) отдаётся как раньше. Проверка: тесты падают
- [x] 4.2 Расширить `ExtractableTable` опциональным `grid` и применять `grid.columnState.strip` в `pickState` (общее ядро `extractState` и `useExtractedState`). Проверка: тесты 4.1 зелёные, `pnpm --filter @ez-kit/data-grid-react typecheck` чистый
- [x] 4.3 Тест полного круга: `extractState → JSON.stringify → JSON.parse → parseState → initialState` грида с тем же конфигом восстанавливает закреплённые колонки по сторонам, порядок `getAllLeafColumns()` и видимость; значение старого формата с `__selection__` / `__actions__` даёт тот же вид; `__drag__` при выключенном `ordering.row` не ломает рендер. Проверка: тест зелёный
- [x] 4.4 Тест `useExtractedState`: ререндер без изменения state возвращает ту же ссылку; изменение закрепления возвращает новую без forced-id. Проверка: тест зелёный
- [x] 4.5 Тест на неизменность низкоуровневого канала: `onChange.columnPinning` и `onStateChange` после закрепления `name` содержат `__selection__`. Проверка: тест зелёный

## 5. Документация

- [x] 5.1 `apps/docs/content/docs/data-grid/state/persistence.mdx`: назвать утилиты рекомендуемым способом persist; добавить `columnOrder` в список ключей по умолчанию (сверить с `DEFAULT_STATE_KEYS`); абзац о том, что колонки, закреплённые или видимые по конфигу, не сохраняются и возвращаются при восстановлении, а `onChange` / `onStateChange` отдают их как есть. Проверка: `pnpm --filter @ez-kit/docs test` (`docs-option-names.test.ts`) зелёный, страница открывается в `pnpm docs:dev`
- [x] 5.2 `state/controlled.mdx`: переписать пункт «The system columns are in `columnPinning`»: они есть в state и в `onStateChange`, а controlled-значение без них грид дополняет сам. Проверить живой пример `every-feature-controlled`. Проверка: страница рендерится, пример показывает системные колонки в `columnPinning`
- [x] 5.3 Сверить `state/index.mdx:169` и `pinning/columns.mdx:52` с новым поведением и поправить, если текст противоречит (например, отсутствует `__drag__`). Проверка: `rg "__selection__" apps/docs/content` не находит утверждений, противоречащих спекам

## 6. Changeset и общий прогон

- [x] 6.1 `pnpm changeset`: minor для `@ez-kit/data-grid-core` (`grid.columnState`, восстановление `columnOrder`, forced-колонки всегда на краю — колонка, закреплённая справа, теперь левее `__actions__`) и `@ez-kit/data-grid-react` (инварианты в controlled `state`, срез forced-колонок в `extractState` / `useExtractedState`, старые значения валидны), без `@ez-kit/data-grid-shadcn`. Проверка: `pnpm lint` проходит `check-changesets.mjs`
- [x] 6.2 `pnpm verify:affected`, затем полный гейт последовательно: `build`, `lint`, `typecheck`, `test`, `size`. Проверка: все пять зелёные, `size-limit` обоих пакетов в бюджете

## Workflow follow-up

- Перед архивированием перенести решения 1, 2 и 4a из design.md в ADR `openspec/decisions/0015-persist-excludes-config-derived-column-state.md` и добавить одноабзацное правило со ссылкой в раздел «Settled data-grid API decisions» в AGENTS.md.
- Архивировать change после ревью и мержа.
