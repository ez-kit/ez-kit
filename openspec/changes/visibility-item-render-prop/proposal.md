# Proposal

## Why

`<DataGrid.VisibilityItem>` сам рендерит `<div>` строки колоночной панели и вешает на него ref
sortable'а. Кит, у которого панель — коллекция react-aria (`GridList`, `ListBox`), так не может:
элемент строки рендерит сама коллекция, и обёртка-`div` никогда не окажется вокруг строки.
Сегодня единственный путь — звать `useSortableItem` напрямую и копировать внутреннюю логику
пакета: `resolvePanelAffordances(...).drag`, индекс в `getVisibilityPanelColumns`, проверку
`meta.ordering === false`. Об этом просит автор внешнего кита на react-aria, и тот же путь
сокращает дерево колоночной панели в нашем HeroUI-ките.

Спайк (Chromium, HeroUI, `GridList` из `react-aria-components@1.22`) подтвердил, что форма
рабочая, и нашёл две проблемы, которые без изменений в общем пакете каждый кит будет
переоткрывать сам:

- во время клавиатурного drag клавиши доходят до навигации `GridList`: один `ArrowDown` сдвигал
  строку на две позиции, а с `keyboardNavigationBehavior="tab"` `Space`, бросающий drag,
  дополнительно скрывал колонку;
- у заблокированной колонки (`ordering: false`) нет грипа, и Accessibility-плагин dnd-kit
  ставит `aria-pressed` на саму строку; на `role="row"` это нарушение axe `aria-allowed-attr`
  (critical).

## What Changes

- `DataGridVisibilityItem` принимает `children` как функцию
  `({ itemProps, handleProps, isDragging }) => ReactNode`. В этом режиме компонент не рендерит
  ни одного DOM-элемента: `itemProps` (callback-`ref`, `data-slot`, `data-column-id`,
  `data-column-dragging`) кит разворачивает на свой элемент строки, `handleProps` (`{ ref }`
  или `null`, когда строку тащить нельзя) — на свой грип. `className` в этом режиме запрещён
  типом. Режим с `ReactNode`-детьми не меняется.
- Решение об участии строки в drag, её индекс и `disabled` остаются в пакете в обоих режимах.
- Новый экспорт для китов: обработчик клавиатуры, который на время drag колонки в панели не
  пускает клавиши к коллекции кита (в корне пакета и в `@ez-kit/data-grid-react/kit`).
- Заблокированная колонка панели больше не получает `aria-pressed` и прочие атрибуты
  активатора на элемент строки.
- Кит HeroUI: колоночная панель переходит с диалога чекбоксов на `GridList` /
  `GridListItem`; видимость — selection коллекции, колонка без `canHide` — `disabledKeys` с
  `disabledBehavior="selection"`. Слоты `column-visibility-item`, `column-drag-handle`,
  `column-visibility-move-start/-end` сохраняются. Обычный переключатель Columns остаётся
  `Dropdown.Menu`.
- Кит shadcn не меняется.
- Документация: render-prop режим и guard на `drag-and-drop/api.mdx` и
  `drag-and-drop/columns.mdx`.

Ломающих изменений публичного API нет. Разметка колоночной панели HeroUI меняется (строки
становятся `role="row"` внутри `role="grid"`), что видно скринридеру и чужому CSS, который
целится в старую разметку, а не в `data-slot`.

## Capabilities

### New Capabilities

- `data-grid-visibility-panel`: строка колоночной панели как точка интеграции кита — оба
  режима `VisibilityItem`, правила участия в drag, клавиатурная изоляция коллекции на время
  drag и доступность заблокированной строки.

### Modified Capabilities

Нет.

## Impact

- `packages/data-grid/react/react/src/data-grid/visibility-item.tsx` и его тесты; новый модуль
  guard'а; экспорты в `src/index.ts` и `src/kit.ts`; возможно, `dnd/types.ts` (контракт
  `SortableItemHandle` / `DragSpec`), если исправление активатора пойдёт через адаптер.
- `packages/data-grid/react/{shadcn,heroui}/src/dnd.tsx` — только если исправление активатора
  потребует правки адаптера; файл shadcn входит в registry payload `data-grid-dnd`.
- `packages/data-grid/react/heroui/src/blocks/visibility/VisibilityMenu.tsx` и
  `src/index.test.tsx`.
- `apps/docs`: две страницы drag-and-drop, e2e по колоночной панели (клавиатура и axe).
- Changesets: `@ez-kit/data-grid-react` (minor), `@ez-kit/data-grid-heroui` (minor).
  `@ez-kit/data-grid-shadcn` в changeset не попадает.
- Новых зависимостей нет: `react-aria-components` уже peer кита HeroUI.
