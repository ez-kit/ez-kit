# Design

## Context

Мотивация описана в proposal.md, требования — в `specs/data-grid-reorder-mode`,
`specs/data-grid-sort-builder` и `specs/data-grid-visibility-panel`.

Текущее устройство:

```
ordering.column.{drag, moveControls}          --> resolved.ordering.header{drag, moveControls}
ordering.column.visibilityMenu{drag, moveCtl} --> resolved.ordering.visibilityMenu{enabled, drag, moveControls}
                                                        |   (adapter is not visible here)
                                                        v
            resolvePanelAffordances / resolveHeaderAffordances(cfg, useDndEnabled())
                                                        |
                         header-cell.tsx, visibility-trigger.tsx, visibility-item.tsx

<DataGrid.SortMenuTrigger> --> SortMenuItem[] --> kit SortMenu   (no reordering)
                                          onAddSort: table.setSorting([...sorting, next])  <- ignores multi / max

dnd port: DragAxis = row | column, DragSurface = table | panel
GridDndProvider.onDrop: switch (axis) { row -> dropRow, column -> dropColumn + setColumnOrder }
kit dnd.tsx: partition key `<axis>:<surface>`, DRAG_AXES = [row, column]
```

`ResolvedGridOptions.sorting` — публичное `boolean`, которое читают киты.

## Goals / Non-Goals

**Goals:**

- Одна функция разрешения режима для трёх поверхностей, чтобы они не расходились в дефолтах.
- Билдер сортировки переиспользует существующий словарь и форму пары `ordering`, а киты рисуют
  её тем же кодом, что в колоночной панели.

**Non-Goals:**

- Строки (`ordering.row`): у них нет пары флагов, ручка живёт в системной колонке `__drag__`, шаги —
  в меню действий. Перевод на `ReorderMode` — отдельное изменение, если понадобится.
- Изменение `ResolvedGridOptions.sorting`: остаётся `boolean`.
- Ограничение перестановки отдельных записей сортировки: все записи равноправны, «заблокированных»
  нет.

## Decisions

**`ReorderMode` — const-объект плюс union, опции — `boolean | ReorderMode`.** Так требует правило
закрытых наборов. Альтернатива — два boolean (`drag` / `moveControls`) — давала четвёртую,
бессмысленную комбинацию «ничего» и словарь, в котором каждый флаг читается только вместе с другим.
Альтернатива с явным `'auto'` вместо `true` отвергнута: `true` уже читается как «включить, как
получится», и это та же форма scalar-or-value, что у остальных опций.

**Имя `step`, а не `arrows` / `buttons`.** Опция называет поведение (перемещение на одну позицию),
а глиф — решение кита. Это то же правило, по которому из `betweenOperator` убрали `variant`.

**Одна функция разрешения.** `resolvePanelAffordances` и `resolveHeaderAffordances` сводятся к
`resolveReorderMode(mode: boolean | ReorderMode | undefined, fallback: boolean, hasAdapter)`,
возвращающей прежний тип `{ drag, moveControls }` (внутреннее имя пары остаётся — его читают киты
через `VisibilityMenuProps` и `handleProps`). `fallback` — значение по умолчанию поверхности:
`true` для заголовка, `false` для панели, `multi включён` для билдера. В resolved options каждая
поверхность хранит **авторское** значение (`mode: boolean | ReorderMode | undefined`), потому что
адаптер виден только внутри `<DataGrid>` — та же причина, по которой это сделано сейчас.

**Для билдера — отдельное поле resolved options, а не расширение `sorting`.** Добавляется
`ResolvedGridOptions.sortReorder: boolean | ReorderMode` (уже с подставленным дефолтом от `multi`,
но без адаптера). Превратить `sorting: boolean` в объект нельзя тихо: `if (grid.sorting)` с
объектом всегда истинно, и кит, читающий его как флаг, перестал бы видеть выключенную сортировку.

**Третья ось `DragAxis.Sorting`, поверхность `DragSurface.Panel`.** Ось называет срез, в который
пишет сброс, и у сортировки он свой. Поверхность — `panel`: пространство индексов уже разделено
осью, отдельная поверхность ничего не добавляет. `onDrop` получает третью ветку `switch`: найти
индексы `sourceId` и `targetId` в `sorting` и переставить запись (id колонки уникален в `sorting`,
билдер исключает дубли). `canDrop` на этой оси, коммит и объявление сброса спрашивают одну функцию,
`dropSortEntry`: она отказывает при сбросе на себя, при id, которого нет в `sorting`, и когда
перестановка опустила бы ниже первой позиции ещё одну колонку с `sorting: { multi: false }`.
Индексы строк билдера плотные по построению: билдер рендерит все записи `sorting`.

**`<DataGrid.SortItem sortId>` по образцу `<DataGrid.VisibilityItem>`.** Те же две формы (элемент
и render-функция), тот же контракт `itemProps` / `handleProps` / `isDragging`, `data-slot="sort-row"`
(его уже ставит shadcn-кит). Это общий компонент react-пакета, а не слот контракта, поэтому
`FullGridComponents` не меняется. Ручка — компонент кита, который самоскрывается при
`handleProps: null`; отдельного слота тоже нет.

**Исправление билдера — в `sort-menu-trigger.tsx`.** `canAddSort` учитывает
`table.options.enableMultiSort` и `maxMultiSortColCount`, которые core уже выставляет из `multi`.
Мультисортировка считается включённой только при `enableMultiSort === true`: core выставляет флаг
лишь для явно написанного `multi`, а TanStack при `undefined` разрешает Shift-клик по заголовку.
Билдер следует документированному дефолту (`multi` выключен), заголовок остаётся как есть —
выравнивание заголовка было бы отдельным видимым изменением, и оно не взято.

**Сообщения.** `sorting.moveUp` / `sorting.moveDown` / `sorting.dragSort` — функции от
`{ label }`, чтобы имена кнопок различались по записям. Объявления —
`ordering.sortPickedUp` / `sortMovedTo` / `sortDropped` / `sortCancelled`, по образцу колоночных;
`dnd-announcements.ts` получает ветку оси.

## Risks / Trade-offs

- [Внешний drag-адаптер с исчерпывающим `switch` по `DragAxis` перестанет компилироваться] →
  в changeset явно, вместе с указанием добавить ветку `sorting`; внутри репо — оба `dnd.tsx`.
- [Кит или приложение, реализующее полный `GridMessages`, а не `PartialGridMessages`, получит
  ошибку типов из-за новых ключей] → упомянуть в changeset; обычный путь — частичный словарь — не
  ломается.
- [Билдер с `multi: false`, где пользователи собирали несколько записей, перестанет это позволять]
  → видимое изменение поведения, в changeset; авторам, которым это нужно, — `multi: true`.
- [Серверная сортировка: каждый шаг — отдельный `onChange` и запрос] → в документации билдера.
- [Перетаскивание в поповере: клавиши во время перетаскивания уходят в Select / навигацию] →
  keyboard-guard, как у колоночной панели; e2e на клавиатурное перетаскивание в обоих китах.

## Migration Plan

```
ordering.column.drag: false                         -> ordering.column.header: 'step'
ordering.column.moveControls: true                  -> ordering.column.header: 'both'
ordering.column.drag: false, moveControls: false    -> ordering.column.header: false
ordering.column.visibilityMenu: { drag: false }     -> ordering.column.visibilityMenu: 'step'
ordering.column.visibilityMenu: { moveControls: true } -> ordering.column.visibilityMenu: 'both'
```

Таблица миграции — в changeset и на странице `columns/ordering.mdx`. Откат — revert изменения,
данных и состояния оно не трогает.
