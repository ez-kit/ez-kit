# Data-Grid Production Roadmap

> Gap analysis: что есть в `packages/data-grid` сегодня vs. что нужно для production-grade powerful data-grid (на уровне AG Grid / MUI X DataGrid Pro / Glide DataGrid).
>
> Дата анализа: 2026-05-14
> Базовая точка: после завершения Phase 1–5 filter roadmap (commit `b3cabd5`).

---

## Что уже реализовано (сильная база)

### Core (`packages/data-grid/core`)

- TanStack Table обвязка: row models (core, filtered, sorted, paginated, expanded, faceted), pinning, sizing, virtualization, selection, expansion
- Operator registry (text / number / date / in / between) с custom операторами и date presets (today, yesterday, last 7/30 days, this/last month)
- CRUD features: `creating`, `editing`, `deleting` в режимах `row`, `modal`, `cell`, `pin-row`
- Validation: Zod resolver + server-side `ValidationError`
- System columns: selection, expand, actions, row-pin
- Loading state

### React adapter (`packages/data-grid/react/react`)

- `createDataGrid()` DI factory, `useDataGrid` hook, `<DataGrid>` compound
- 37 компонентов в `src/data-grid/`
- Zero-style policy: только `data-*` атрибуты — стилизуют UI-kits
- Cell types registry с типизированными definitions

### UI kits

- **shadcn + heroui**: полный паритет, 30 blocks каждый, 9 cell types
- **native**: минимальный baseline для тестов

### Cell types (9)

`text`, `number`, `date`, `boolean`, `select`, `badge`, `image`, `link`, `progress`

### Filter UX

- popover, panel, active chips, clear-all
- faceted, multi-value, date presets, global search

### Examples

- 43 примера в `apps/docs/shared/data-grid/examples/`
- Все 5 фаз filter roadmap завершены

---

## Что отсутствует для production-grade data-grid

### Priority 1 — Критические production-пробелы

| Фича | Что есть | Что нужно |
|------|----------|-----------|
| **Server-side mode** | manual flag в TanStack, паттерна нет | Полный async режим: `isFetching`, `totalCount`, cursor pagination, `onPaginationChange` / `onSortingChange` / `onFiltersChange` server callbacks, per-row loading skeletons, race-condition handling |
| **Keyboard navigation + ARIA grid** | базовое | `role="grid"`, `aria-rowindex` / `aria-colindex`, focus management между ячейками, стрелки / Tab / Enter / Esc / Space, screen reader announcements, focus trap в modals |
| **Column reordering (DnD)** | TanStack `columnOrder` есть | UI: drag-handle в header, dnd-kit интеграция, visual feedback, persist order |
| **State persistence** | controlled state работает | Адаптеры `urlStateAdapter` (search params) и `localStorageStateAdapter` для sort / filter / columns / visibility |
| **Export CSV / Excel** | нет | `exportToCsv()` API, respect column visibility / order / cell formatters, кнопка в toolbar |
| **i18n** | строки хардкод (EN) | `messages` prop / `IntlProvider` — все строки (operators, placeholders, "No results", confirm) выносим в messages |
| **Density modes** | нет | `density: 'comfortable' \| 'compact' \| 'condensed'` через `data-density` атрибут |
| **Theme tokens API** | стили в каждом kit | Документированный набор CSS custom properties в `global.css` каждого kit для retheming без форка |

### Priority 2 — Power-user features

| Фича | Зачем | Объем |
|------|-------|-------|
| **Cell range selection + clipboard copy** | Excel-like UX, копирование в Sheets | Range state, mouse drag selection, Ctrl+C → TSV / CSV в clipboard |
| **Column virtualization (horizontal)** | широкие гриды (50+ колонок) | TanStack virtual columns, sticky pinned columns переживают виртуализацию |
| **Aggregation / Grouping rows** | dashboard-style сводки | `groupBy: ['column']`, aggregate functions (sum / avg / count / min / max), group header rows, expand / collapse групп |
| **Frozen footer (totals row)** | классика для сводок | Pinned footer row with aggregates |
| **Saved views / presets** | многократно используемые filter+sort+col комбо | API: `views: [{ id, label, state }]`, switcher в toolbar, save current |
| **Auto-fit / auto-resize columns** | UX | Double-click resize handle → fit to longest cell, `autoSize: true` глобально |
| **Master / detail row** | вложенные данные | Sub-grid внутри expanded row, переиспользует `createDataGrid` |
| **Row drag reorder** | reorderable lists | Drag handle column, dnd-kit, controlled `onRowReorder` |

### Priority 3 — Полировка и расширение

| Фича | Что |
|------|-----|
| **Дополнительные cell types** | `currency`, `percent`, `rating`, `tag-multiselect`, `file`/`avatar`, `json-viewer`, `sparkline` / mini-chart, `markdown`, `code`, `email`/`phone` (formatted), `color-swatch` |
| **Conditional formatting** | API: `cellClassName: (row) => string` или `rowStyle: (row) => CSS vars` — подсвечивать по значению |
| **Cell tooltips / overflow** | Auto-tooltip когда контент обрезан, custom tooltip per cell |
| **Responsive / mobile mode** | На узких экранах превращать в card-list (через `data-density` или отдельный layout) |
| **Optimistic updates flow** | Документированный паттерн: оптимистично применить → revert при ошибке, toast UX |
| **Print stylesheet** | `@media print` в `global.css`, страничные разрывы |
| **Performance budgets** | Vitest бенчмарки: render 10k / 100k rows, scroll FPS, lint-rule на size-limit budgets |
| **Axe a11y integration** | `@axe-core/playwright` или `vitest-axe` для регрессии доступности |
| **DevTools panel** | Опциональный отладочный overlay (state, sorting, filters) — как `@tanstack/devtools` |

---

## Рекомендованный план реализации (по фазам)

### Фаза 6 — Server-side & State Foundation (1.5–2 недели)

1. **Server-side mode** — pattern + 2 examples (offset pagination, cursor pagination), `isFetching` UX, race handling
2. **State persistence adapters** — `urlState()` + `localStorageState()` хуки, опционально в react package
3. **i18n** — `messages` prop, default English, пример с RU

### Фаза 7 — A11y + Keyboard (1 неделя)

1. ARIA grid pattern в react package (data-attrs + roles)
2. Focus management hook (`useGridFocus`)
3. Стрелки / Tab / Enter / Esc / Space навигация
4. Axe тесты в CI

### Фаза 8 — Power features (2 недели)

1. **Column reordering (DnD)** через `@dnd-kit/core`
2. **Export to CSV** в core (формат с учетом column types / visibility)
3. **Density modes** + theme tokens API
4. **Auto-fit columns**

### Фаза 9 — Advanced (2–3 недели)

1. Cell range selection + clipboard copy
2. Column virtualization
3. Aggregation / Grouping
4. Saved views

### Фаза 10 — Polish & New cell types (1.5 недели)

1. `currency` / `percent` / `rating` / `tag-multiselect` / `sparkline` / `json`
2. Conditional formatting API
3. Cell tooltips
4. Master / detail
5. Frozen footer

---

## Сложность и риски

- **Общая сложность**: HIGH — ~7–9 недель работы для всех фаз.
- **Главные риски**:
  - **Server-side mode** — много граничных кейсов (cancel, retry, partial updates) — нужен крепкий integration test.
  - **Cell range selection** — конфликтует с row selection, нужен thoughtful state model.
  - **A11y grid pattern** — TanStack не покрывает focus management, нужно строить с нуля.
  - **i18n** — risk регрессии: каждая строка должна получить ключ.
  - **Bundle size** — `size-limit` 3KB per package будет давить при добавлении DnD / export — может потребоваться lazy-load или sub-paths (`@ez-kit/data-grid-shadcn/export`).

---

## Open questions

- Подход к `messages` / i18n: свой минимальный API или `react-intl` / `lingui` интеграция?
- Server-side: один универсальный hook (`useServerData`) или отдельные паттерны для offset / cursor?
- DnD: `@dnd-kit/core` (модульный, ~5KB) vs `react-dnd` (тяжелый) — наклоняюсь к dnd-kit.
- Export: только CSV в core, или JS-side Excel (`xlsx-populate` / `exceljs`) как опциональный sub-path?
- Cell range selection: вводить как отдельный feature flag (`enableCellRangeSelection`) или встроить в `rowSelection`?
