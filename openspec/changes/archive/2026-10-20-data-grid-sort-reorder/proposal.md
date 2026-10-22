# Proposal

## Why

Порядок записей мультисортировки — это их приоритет: `status ↑, date ↓` и `date ↓, status ↑` дают
разные таблицы. Билдер (`<DataGrid.SortMenuTrigger />`) подписывает строки «Sort by / then by», то
есть показывает приоритет, но не даёт его изменить: сейчас запись можно только удалить и добавить
заново, после чего она оказывается последней. Вдобавок билдер обходит конфиг `multi`: при
`multi: false` в нём можно набрать несколько записей, а `multi.max` он не учитывает.

Колоночное упорядочивание уже решает тот же вопрос («ручка или шаговые кнопки») двумя флагами
`drag` / `moveControls` на двух поверхностях. Если для сортировки завести третью пару или другой
словарь, в одном конфиге одно понятие будет называться по-разному. Поэтому способ перестановки
получает общий закрытый набор `ReorderMode`, и колонки переводятся на него в этом же изменении.

## What Changes

- Новый закрытый набор `ReorderMode` (`'drag' | 'step' | 'both'`) в `@ez-kit/data-grid-core`. Опция
  поверхности принимает `boolean | ReorderMode`: `true` означает лучшее, что грид может предложить
  (`drag` с drag-адаптером, `step` без него), `false` выключает перестановку на этой поверхности.
- Новая опция `sorting.multi.reorderable?: boolean | ReorderMode`, по умолчанию `true`, когда
  мультисортировка включена. Записи билдера переставляются шагом (вверх / вниз) и/или
  перетаскиванием за ручку.
- **BREAKING** `ordering.column.drag` и `ordering.column.moveControls` заменяются одной опцией
  `ordering.column.header?: boolean | ReorderMode` (по умолчанию `true`).
- **BREAKING** объектная форма `ordering.column.visibilityMenu: { drag, moveControls }` заменяется
  на `ordering.column.visibilityMenu?: boolean | ReorderMode` (по умолчанию `false`, как сейчас).
- Конфигурация, где не предложено ничего (`{ drag: false, moveControls: false }`), исчезает как
  класс: это теперь `false`, и предупреждение «панель не предлагает ничего» больше не нужно.
  Предупреждение о `'drag'` / `'both'` без адаптера остаётся для всех трёх поверхностей.
- Билдер сортировки подчиняется `multi`: при выключенной мультисортировке «Add sort» недоступен,
  когда запись уже есть, а при `multi.max` недоступен на пределе. Это видимое изменение поведения.
- `SortMenuItem` получает необязательную пару `ordering` (та же форма, что у
  `VisibilityColumnItem.ordering`). Новый общий компонент `<DataGrid.SortItem>` (форма-элемент и
  render-функция) регистрирует строку билдера в перетаскивании. Новых слотов в
  `FullGridComponents` нет.
- dnd-порт получает третью ось `DragAxis.Sorting`; сброс на ней переставляет запись в срезе
  `sorting`. Аддитивно для потребителей; адаптер с исчерпывающим `switch` по оси должен добавить
  ветку.
- Новые сообщения: подписи шагов и ручки билдера и четыре объявления перетаскивания записи
  сортировки.
- Киты shadcn и heroui рисуют ручку и пару шагов в своём `SortMenu`.

## Capabilities

### New Capabilities

- `data-grid-reorder-mode`: общий словарь способа перестановки (`ReorderMode`), правило его
  разрешения с учётом drag-адаптера и предупреждения в development, одинаковые для заголовка
  колонок, колоночной панели и билдера сортировки.
- `data-grid-sort-builder`: билдер мультисортировки — какие записи он позволяет добавить в
  соответствии с `multi`, как меняется приоритет записи шагом и перетаскиванием, что получает кит.

### Modified Capabilities

- `data-grid-visibility-panel`: условие, при котором строка панели получает `handleProps`,
  формулируется через `visibilityMenu: ReorderMode` вместо `visibilityMenu.drag`.

## Impact

- `@ez-kit/data-grid-core`: `ReorderMode`, `MultiSortConfig.reorderable`, `ColumnOrderingConfig`
  (`header` вместо `drag` / `moveControls`, новая форма `visibilityMenu`), удаление
  `VisibilityMenuOrderingConfig`, новые ключи сообщений `sorting.*` и `ordering.*`.
- `@ez-kit/data-grid-react`: разрешение режимов (`visibility-panel-affordances.ts` →
  общее), `use-data-grid.ts` / `resolved-options.ts`, `header-cell.tsx`, `visibility-trigger.tsx`,
  `visibility-item.tsx`, `sort-menu-trigger.tsx`, новый `sort-item.tsx`, dnd-порт (`DragAxis`),
  коммит сброса в `data-grid.tsx`, `dnd-announcements.ts`, `SortMenuItem`.
- Киты shadcn и heroui: `SortMenu`, `dnd.tsx` (список осей), keyboard-guard для поповера билдера.
- Документация: `sorting.mdx`, `columns/ordering.mdx`, `columns/visibility.mdx`,
  `drag-and-drop/api.mdx`, `drag-and-drop/columns.mdx`; `page-type-map.ts`.
- Changeset `minor` (breaking, 0.x) для `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`,
  `@ez-kit/data-grid-heroui`. Shadcn в changeset не попадает.
