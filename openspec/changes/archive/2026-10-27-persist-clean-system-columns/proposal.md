# Proposal

## Why

Колонки, которые конфиг закрепляет намертво (`__drag__`, `__selection__`, `__expand__`,
`__actions__`, а также пользовательские с `pinning: 'start'` / `{ side }`), лежат в публичном state
как обычные решения пользователя. `extractState` по умолчанию пишет их в URL и storage:
`columnPinning` содержит их с первого рендера, `columnOrder` — после первого перемещения колонки.
Сохранённое значение оказывается привязано к набору включённых фич, хотя пользователь ничего не
выбирал, и нарушает правило страницы controlled state «срез записывает только то, что изменил
пользователь».

Вторая проблема — дыра в инвариантах. Controlled `state` в React публикуется в стор через
`table_publishExternalState` в обход `onColumnPinningChange`, поэтому
`state={{ columnPinning: { start: [], end: [] } }}` открепляет системные колонки, хотя
`column-state.ts` обещает, что этого не допускает ни один вход. Срезать forced-колонки на выходе
persist безопасно только тогда, когда каждый вход возвращает их обратно.

## What Changes

- В `@ez-kit/data-grid-core` появляется поле `table.grid.columnState` с двумя методами над
  инвариантами колонок:
  - `enforce(state)` — дописывает недостающие forced-колонки в `columnPinning` и `columnOrder`,
    возвращает `true` для колонок, которые нельзя скрыть. Если менять нечего, возвращает ту же ссылку.
  - `strip(state)` — обратная операция: убирает forced-id из `columnPinning` и `columnOrder` и
    записи `true` для таких колонок из `columnVisibility`.
    Сами инварианты наружу не выставляются. `enforceColumnInvariants` в публичный API не попадает.
- `enforce` начинает восстанавливать и `columnOrder`: непустой порядок без forced-колонок получает
  forced-start в начало и forced-end в конец. Применяется к `initialState`, к записи
  `setColumnOrder` и к controlled publish.
- Forced-колонки всегда стоят на внешнем краю своей стороны. Сейчас `column.pin('end')` из TanStack
  ставит пользовательскую колонку **правее** `__actions__`; после изменения она встаёт левее, и
  колонка действий остаётся крайней. Это видимое исправление.
- `useDataGrid` прогоняет controlled `state` через `enforce` перед публикацией в стор. Результат
  кешируется по ссылке входного среза. Исправление не считается изменением: `onStateChange` из-за
  него не вызывается, и цикла уведомлений не возникает.
- `extractState` и `useExtractedState` возвращают state после `strip`. Системная колонка, которую
  пользователь может открепить (`initialSide`, `pinning: false`), остаётся в сохранённом значении:
  её положение — выбор пользователя. Полный круг `extractState → JSON → parseState → initialState`
  восстанавливает те же закрепления и тот же порядок.
- `ExtractableTable` получает опциональный `grid`. Голый `createTable` по-прежнему подходит; без
  `grid` срез не выполняется.
- Без изменений: `onChange.columnPinning`, `onChange.columnOrdering`, `onStateChange`,
  `useDataGridState`, `table.store.state` и `parseState`. Это низкоуровневый канал, forced-колонки
  в нём остаются.
- Документация: утилиты `extractState` / `useExtractedState` / `parseState` становятся
  рекомендуемым способом persist. На `state/persistence` в список ключей по умолчанию добавляется
  `columnOrder` (сейчас он расходится с `DEFAULT_STATE_KEYS`), и появляется абзац о том, что
  закреплённые конфигом колонки не сохраняются и возвращаются сами. Предупреждение о пустых массивах
  на `state/controlled` переписывается.

Изменение не ломающее: ранее сохранённые значения с системными id продолжают восстанавливаться,
устаревшие id TanStack пропускает. minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`.

## Capabilities

### New Capabilities

- `data-grid-column-invariants`: какие колонки forced (закреплены или видимы по конфигу), на каких
  входах state грид их восстанавливает (`initialState`, запись среза, controlled `state`), как
  ведёт себя `columnOrder` без них и что гарантирует `table.grid.columnState`.
- `data-grid-state-persistence`: что `extractState` / `useExtractedState` кладут в сохраняемое
  значение, какие колонки срезаются, а какие сохраняются, и что даёт полный круг через `parseState` и
  `initialState`.

### Modified Capabilities

(нет)

## Impact

- `packages/data-grid/core/src/column-state/column-state.ts` — `strip`, восстановление
  `columnOrder` в `enforce`.
- `packages/data-grid/core/src/create-table/create-table-options.ts` — `grid.columnState`,
  `constrain` для `onColumnOrderChange`, `columnOrder` в seed.
- `packages/data-grid/react/react/src/use-data-grid.ts` — `enforce` перед `publishControlledState`.
- `packages/data-grid/react/react/src/state/extract-state.ts`, `use-extracted-state.ts` — `strip`.
- `apps/docs/content/docs/data-grid/state/persistence.mdx`, `state/controlled.mdx`.
- Changeset: `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`, minor.
- Новый ADR в `openspec/decisions/` и ссылка в `AGENTS.md` (см. design).
