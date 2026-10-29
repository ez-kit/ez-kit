# Proposal

## Why

Грид, который получает данные по сокету или поллингу, обновляет значения молча: пользователь не
видит, что именно поменялось с прошлого тика. В AG Grid эту задачу решает Cell Flashing —
изменившаяся ячейка коротко заливается цветом, который затем гаснет. В TanStack Table (v8 / v9)
ничего подобного нет: он headless и понятия «значение ячейки изменилось» не имеет. В ez-kit этого
тоже нет.

## What Changes

- Новая фича `cellFlashingFeature` в `@ez-kit/data-grid-core`; consumer регистрирует её в
  `features`, как остальные (ADR 0003). `allDataGridFeatures` её включает.
- Опция грида `flashing?: boolean | { flashDuration?; fadeDuration? }` включает автоматический флэш
  во всех колонках. Опция колонки `flashing?: boolean | { flashDuration?; fadeDuration?; equals? }`
  переопределяет грид в обе стороны, с семантикой слоёв опций (`true` поверх объекта сохраняет
  объект, `false` выключает). Итог — `ColumnMeta.flashing`.
- Автоматический флэш: отрисованная ячейка сравнивает значение колонки с предыдущим и при отличии
  флэшит. Сравнение — `Object.is`, `Date` по `getTime()`, либо `column.flashing.equals`.
  Монтирование не флэшит. Ячейка, изменившаяся вне экрана, при появлении не флэшит.
- Ручной флэш: `table.flashCells({ rowIds?, columnIds?, flashDuration?, fadeDuration? })` флэшит
  отрисованные ячейки по адресу независимо от опции `flashing`.
- Ячейка получает атрибут `data-flash="flash" | "fade"` и CSS-переменную
  `--dg-flash-fade-duration`; структурный stylesheet `@ez-kit/data-grid-react/styles.css`
  позиционирует оверлей `::after`, киты (shadcn, heroui) задают его цвет и затухание.
- Статус флэша `'default' | 'success' | 'warning' | 'error'` задаёт его цвет. Ручной флэш принимает
  `status` в `flashCells`; автоматический берёт его из функции колонки
  `flashing.status(previous, next, row)`. Без статуса флэш — `default`, как сейчас. Ячейка несёт
  `data-flash-status`, киты красят каждый статус своим токеном.
- Флэш срабатывает на любое изменение значения, включая успешную инлайн-правку. Различение
  источника (`edit` / `refresh`) в этот change не входит; форма опции оставляет для него место без
  breaking change.
- Документация: страница флэша в разделе data-grid, live-пример с имитацией поллинга.

Ничего существующего не меняется и не удаляется; грид без `flashing` и без вызова `flashCells`
рендерится как раньше.

## Capabilities

### New Capabilities

- `data-grid-cell-flashing`: подсветка изменившихся ячеек — включение по иерархии грид → колонка,
  правила сравнения значений, автоматический и ручной флэш, фазы и их длительности, статусы флэша,
  что флэшит и что нет, атрибутный контракт для китов.

### Modified Capabilities

- `data-grid-render-isolation`: флэш перерисовывает только флэшащие ячейки — ни вызов `flashCells`,
  ни фаза флэша не будят другие ячейки, строки и подписчиков состояния таблицы.

## Impact

- **Core** (`@ez-kit/data-grid-core`): новая фича `features/flashing/` (атом запроса на инстансе
  таблицы, `table.flashCells`, dev-предупреждения); `flashing` в `TableConfig` и `ColumnDef`;
  резолв в `map-columns` в `ColumnMeta.flashing`; `features/all.ts`; экспорт с `./features`.
- **React** (`@ez-kit/data-grid-react`): хук `useCellFlash` в `BodyDataCell`
  (`data-grid/cell.tsx`); `flashing` в `UseDataGridConfig` и в слоях `defaults`;
  структурные правила оверлея в `src/styles/global.css`.
- **Kits** (`shadcn`, `heroui`): `styles.css` — цвет оверлея (`--dg-flash-background` и токены
  статусов `--dg-flash-{success,warning,error}-background` на классе кита), затухание,
  `prefers-reduced-motion`. В shadcn это payload registry (ADR 0002) — публичный
  контракт для всех `shadcn add` consumer'ов.
- **Docs** (`@ez-kit/docs`): страница, пример в `manifest.json` / `registry.ts`, `page-type-map.ts`
  для `docs-option-names.test.ts`; `tree-shaking.test.ts` для новой фичи.
- **Release**: changeset на `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react` и `@ez-kit/docs`
  (minor); `@ez-kit/data-grid-shadcn` в changeset не попадает.
- Новых runtime-зависимостей нет: атом создаётся через `storeReactivityBindings()` из
  `table-core`, React читает его через уже подключённый `@tanstack/react-store`.
