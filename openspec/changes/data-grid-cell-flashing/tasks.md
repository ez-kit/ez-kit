# Tasks

## 1. Опция и резолв в core

- [x] 1.1 Тесты резолва `ColumnMeta.flashing` в `core/src/column/map-columns/map-columns.test.ts` по сценариям «Флэш включается на гриде и переопределяется на колонке» и «Длительности…» из `specs/data-grid-cell-flashing/spec.md`: грид `true` / колонка без опции; колонка `false` при включённом гриде; колонка `true` при выключенном; объект колонки поверх объекта грида по ключам; `true` на колонке сохраняет длительности грида; дефолты 500 / 1000; `equals` колонки переносится; системные колонки — `undefined`; проверить RED
- [x] 1.2 Типы `FlashingConfig` / `ColumnFlashingConfig`, `flashing` в `TableConfig` и `ColumnDef` (`core/src/types.ts`, `core/src/column/types.ts`) с докблоками; резолв в `map-columns` по образцу `faceted` (`resolve-filtering.ts`), поле `flashing` в `ColumnMeta`; тесты 1.1 зелёные, `pnpm --filter @ez-kit/data-grid-core typecheck` зелёный

## 2. Фича `cellFlashingFeature` в core

- [x] 2.1 Тесты в `core/src/features/flashing/flashing.test.ts`: `table.flashCells` пишет в атом запрос с растущим `seq` и переданными `rowIds` / `columnIds` / длительностями; вызов не меняет `table.store.state` и не вызывает `onStateChange`; dev-предупреждение (`warnOnce`) при `flashing` без зарегистрированной фичи и при включённом флэше без `getRowId`, по одному разу; проверить RED
- [x] 2.2 `core/src/features/flashing/` по образцу `loading` / `deferred-apply`: `Plugins` declaration merging без state slice, атом `FlashRequest | null` через `storeReactivityBindings().createWritableAtom` на инстансе таблицы (внутренний, не экспортируется), `table.flashCells`; предупреждения в `createTable`; тесты 2.1 зелёные
- [x] 2.3 Добавить фичу в `features/all.ts` и экспорт `cellFlashingFeature` с `@ez-kit/data-grid-core/features`; обновить `core/src/features/entry.test.ts`; добавить кейс в `apps/docs/test/tree-shaking.test.ts` (бандл без фичи её не тянет); `pnpm --filter @ez-kit/data-grid-core test` зелёный

## 3. Флэш ячейки в React

- [x] 3.1 Тесты в `react/react/src/data-grid/cell-flash.test.tsx` (fake timers) по сценариям спеки: нет флэша на первом рендере; флэш одной изменившейся ячейки при новых `data`; новые объекты строк с теми же примитивами — нет флэша; `Date` с тем же временем — нет; `equals` колонки; массив без `equals` — флэш; сортировка с `getRowId` — нет; фазы `data-flash="flash"` 500 мс → `"fade"` 1000 мс → нет атрибута и `--dg-flash-fade-duration` на `td`; перезапуск при изменении во время затухания; открытый редактор не флэшит, отмена после обновления данных — нет флэша, сохранённая правка — флэш; StrictMode без ложных срабатываний; системная и placeholder-ячейки не флэшат, агрегат группы флэшит; проверить RED
- [x] 3.2 Тесты ручного флэша там же: `flashCells({ rowIds })` флэшит только ячейки данных строки; `flashCells({ columnIds })` работает при выключенной автоматике; длительности вызова; ячейка, смонтированная после вызова, не флэшит; без фичи хук ничего не делает; проверить RED
- [x] 3.3 Хук `useCellFlash` в `react/react/src/data-grid/` по design D3–D5: `useRef` значения, сравнение в `useEffect`, подписка на атом в эффекте с проверкой адреса в callback, фазы на таймерах с cleanup; подключить в ветке данных `BodyDataCell` (`cell.tsx`), атрибут и CSS-переменная через chrome ячейки; тесты 3.1–3.2 зелёные
- [x] 3.4 `flashing` в `UseDataGridConfig` и в слоях `defaults` (`createDataGrid`, `DataGridOptionsProvider`): тест, что `defaults: { flashing: true }` + `flashing: false` в конфиге выключает флэш, а объект поверх объекта сливается по ключам; зелёный
- [x] 3.5 Тест изоляции в `react/react/src/data-grid/host-rerender-isolation.test.tsx` (или рядом) по дельте `specs/data-grid-render-isolation/spec.md`: `flashCells({ rowIds: ['r1'] })` перерисовывает только ячейки `r1`, смена фазы — только флэшащую ячейку; `pnpm --filter @ez-kit/data-grid-react test` зелёный, `pnpm --filter @ez-kit/data-grid-react lint` без `memo`

## 4. Структурный CSS и киты

- [x] 4.1 Структурные правила оверлея в `react/react/src/styles/global.css` по design D7: `relative` только для `[data-flash]:not([data-pinned])`, `::after` `absolute inset-0 pointer-events-none`; проверить, что `::after` на `td` нигде не занят (`grep` по трём stylesheet'ам)
- [x] 4.2 shadcn `styles.css`: токен `--dg-flash-background` на классе кита, заливка и затухание оверлея, `prefers-reduced-motion`; `pnpm --filter @ez-kit/data-grid-shadcn test` и `pnpm --filter @ez-kit/docs test -- registry-payload` зелёные
- [x] 4.3 heroui `styles.css`: то же; `pnpm --filter @ez-kit/data-grid-heroui test` зелёный
- [x] 4.4 Визуальная проверка в обоих китах на docs-примере из 5.1 (светлая и тёмная тема): обычная и закреплённая ячейка флэшат, закреплённая остаётся непрозрачной и закреплённой при горизонтальной прокрутке, затухание плавное; скриншоты в описании PR

## 5. Документация и e2e

- [x] 5.1 Пример `apps/docs/shared/data-grid/examples/components/cell-flashing.tsx` (`export function CellFlashingExample()`): имитация поллинга интервалом, `getRowId`, колонка с `flashing: false`, кнопка ручного `flashCells`; без внутренних комментариев в исходнике; регистрация в `manifest.json` и `registry.ts`; пример открывается для shadcn и heroui
- [x] 5.2 Страница `apps/docs/content/docs/data-grid/cell-flashing.mdx` (+ `meta.json`): когда нужно, `getRowId`, иерархия грид → колонка и слои `defaults`, длительности, правила сравнения и `equals` для объектов из `accessorFn`, ручной `flashCells`, что не флэшит (монтирование, вне экрана, системные ячейки, открытый редактор), атрибут `data-flash` и токен `--dg-flash-background` для своего кита; строка в `features.mdx` / `feature-set.mdx`; регистрация в `apps/docs/test/docs-options/page-type-map.ts`; `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный
- [x] 5.3 e2e `apps/docs/e2e/packages/data-grid/cell-flashing/cell-flashing.spec.ts`: на примере 5.1 у изменившейся ячейки появляется `data-flash`, у колонки с `flashing: false` — нет; проходит для обоих китов; `apps/docs/test/e2e-slots.test.ts` зелёный

## 6. Решения и релиз

- [x] 6.1 ADR в `openspec/decisions/` для D1 (флэш — событие, не состояние), D2 (внутренний атом как транспорт) и D7 (оверлей `::after`: позиция в структурном слое, вид в ките) из design.md; правило одним абзацем со ссылкой в `AGENTS.md` («Settled data-grid API decisions»); `pnpm lint` зелёный
- [x] 6.2 Changeset: minor для `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/docs`, без `@ez-kit/data-grid-shadcn`; `node scripts/check-changesets.mjs` зелёный

## 7. Интеграционная проверка

- [x] 7.1 Полный гейт последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size` — каждый отдельным `turbo run`; размеры `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` в пределах бюджета (если вышли — поднять бюджет по правилу ~15% и объяснить в PR)

## 8. Статусы флэша

- [x] 8.1 Тесты резолва в `map-columns.test.ts`: `flashing.status` колонки переносится в `ColumnMeta.flashing.status`; у грида `status` нет (тип); проверить RED
- [x] 8.2 Тип `FlashStatus`, `status?` в `ColumnFlashingConfig` / `ColumnFlashingMeta` и в `FlashCellsParams` с докблоками; перенос в `resolve-flashing.ts`; экспорт `FlashStatus` с `@ez-kit/data-grid-core/features` и из `index.ts`; тесты 8.1 зелёные
- [x] 8.3 Тесты в `cell-flash.test.tsx` по требованию «Статус флэша задаёт его цвет»: ручной со статусом и без; авто из функции колонки (рост → `success`, падение → `error`); без функции и при `undefined` — `default`; функция не вызывается при равных значениях; повторное изменение во время флэша меняет статус; атрибут снимается вместе с `data-flash`; проверить RED
- [x] 8.4 `useCellFlash`: статус в `trigger`, `data-flash-status` в `attrs` (design D9); тесты 8.3 зелёные, `pnpm --filter @ez-kit/data-grid-react test` и `lint` зелёные
- [x] 8.5 shadcn и heroui `styles.css`: токены `--dg-flash-{success,warning,error}-background` (светлая и тёмная тема) и правила по `data-flash-status`; `registry-payload` и тесты китов зелёные; визуальная проверка трёх статусов в обоих китах
- [x] 8.6 Docs: раздел «Статусы» на `cell-flashing.mdx` (набор, `flashCells({ status })`, `flashing.status` с примером цены, токены статусов), строки в таблицах опций и параметров; основной пример — цена с `success` / `error` по направлению; пример ручного флэша — кнопка со статусом; `docs-option-names`, `page-type-map` (`FlashStatus`) зелёные
- [x] 8.7 e2e: в `cell-flashing.spec.ts` проверить `data-flash-status` у изменившейся цены; оба кита
- [x] 8.8 ADR 0020 и правило в `AGENTS.md`: кит красит оверлей токеном по `data-flash-status`; changeset — описание дополнить статусами
- [x] 8.9 Полный гейт последовательно (как 7.1), `pnpm size` в бюджете

## Workflow follow-up

- Архивировать change после ревью; ADR из 6.1 должны существовать до архива.
