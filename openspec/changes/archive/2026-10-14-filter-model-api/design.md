# Design

## Context

Мотивация — в proposal.md (раздел Why), требования — в `specs/data-grid-filter-model/spec.md`.

Как это устроено сейчас:

- **Ядро** при построении колонок (`core/src/column/map-columns/map-columns.ts`) записывает в
  `columnDef.meta.filtering` разрешённый `ColumnFilteringMeta`: `operators` (без локализации),
  `defaultOperator`, `items`, `faceted`, `betweenOperator`, `presets`, `debounce`, `component`.
- **React-слой** на каждом рендере пересчитывает остальное в трёх местах:
  - `render-filter-input.tsx`: локализация (`localizeOperators`), текущий оператор, правила
    смены оператора (`onOperatorChange`), ветвление по редактору, варианты значений
    (`resolveFilterItems`), пресеты (`presetsForOperator` / `activePresetId`), debounce;
  - `filter-panel.tsx`: та же локализация и метки вариантов (`resolveOptionLabel`) для сводки
    `formatFilterValue`, плюс список фильтруемых колонок в неэкспортированном
    `useFilterPanelColumns()`;
  - `active-filters-bar.tsx`: своя сводка значения. Эта задача её не трогает.
- **Запись** идёт только через `column.setFilterValue`. `table.setColumnFilters(updater)` в
  TanStack v9 — одна запись слайса, к которой применяется `autoRemove` каждого `filterFn`. Под
  `draft` слайс `columnFilters` — внешний атом черновика, а `filtering.onChange` срабатывает на
  `draft.apply()` (`create-table-options.ts`, `bindStateHandlers`).
- `createOperatorFilterFn.autoRemove` не удаляет запись, пока выбран оператор, даже если
  значение пустое. Поэтому пустую запись из `{ operator: 'in', value: [] }` пачечный сеттер
  должен отбрасывать сам.
- При `pagination.manual` TanStack не сбрасывает `pageIndex` при смене фильтров. Пачечный
  сеттер наследует это поведение, оно не меняется.

## Goals / Non-Goals

**Goals:**

- Один источник модели фильтра колонки, на котором стоят и встроенный UI, и публичный API.
- Пачечная запись, видимая потребителю как одно изменение состояния.

**Non-Goals:**

- Новые кит-слоты или изменение пропсов существующих (`FilterPanel`, `FilterPanelChip`).
- Опция конфига, которая подменяет панель (вариант D из разбора): это нарушает правило
  «конфиг описывает поведение, JSX — композицию».
- Перевод `active-filters-bar.tsx` на модель. Там другая сводка («N selected», ISO-даты), и
  её унификация — отдельная задача.
- Сброс `pageIndex` при смене фильтров в manual-пагинации.
- Хук для одной колонки (`useColumnFilter(columnId)`): одиночный фильтр уже покрывает
  `<DataGrid.ColumnFilter>` с новым полем `filter`.
- Серверные facet-счётчики.

## Decisions

### D1. Чистый резолвер `resolveColumnFilter` в пакете `data-grid-react`

Новый модуль `data-grid/column-filter-model.ts`:
`resolveColumnFilter(column, { messages, tableDebounce, cellTypes }): ColumnFilterModel`. Реестр типов ячеек нужен, чтобы отличить проектный тип ячейки, который рисует свой фильтр (`editor: custom`), от того, что падает на текстовое поле. В него переезжают
`resolveFilterItems` и `resolveOptionLabel`, логика `onOperatorChange` (как
`nextValueForOperator`), выбор `presetsForOperator`, локализация операторов и пресетов, а также
`formatFilterValue` (как источник `valueDisplay` / `hasValue`).

- Почему не ядро: модель читает `messages` и `date-presets.ts`, которые живут в react-пакете,
  и обслуживает React-панель. Перенос в ядро потянул бы туда помощники пресетов без второго
  потребителя.
- Почему функция, а не хук: её вызывают и `renderFilterInput` (не хук, вызывается в цикле), и
  хук панели. Чистая функция тестируется без рендера.

### D2. `renderFilterInput` диспатчит по `model.editor`

Ветвление переписывается на `model.editor`. Порядок выбора в резолвере повторяет нынешний
порядок веток: `none` → `between` → `multiSelect` → `custom` → тип ячейки. Встроенные типы
сопоставляются так же, как `OPERATOR_GROUP_BY_CELL_TYPE` в ядре: `progress` → `number`,
`image` / `link` → `text`, `badge` → `select`. Отличие `editor` от конкретного компонента
остаётся в `renderFilterInput`:

- `multiSelect` без `MultiSelectFilter` в ките идёт дальше по старой цепочке, как сейчас;
- `select` / `text` / `number` / `date` / `boolean` рисуются компонентом кита из реестра типов
  ячеек (`filtering ?? editing`), иначе текстовым полем.

Так `editor` описывает семантику («какое значение нужно»), а не конкретный компонент кита.
Внешней панели нужна именно семантика.

Рассматривал вариант: оставить `renderFilterInput` как есть и только добавить модель рядом.
Отклонён: два пути вычисления одних и тех же данных разойдутся. Первыми кандидатами были
метки операторов и порядок `items`.

### D3. Пачечная запись — `table.setColumnFilters(updater)` с фильтрацией

`setValue(next)` уровня панели строит новый массив из текущего состояния. Записи колонок без
операторов и колонок вне панели сохраняются. Записи операторных колонок панели заменяются
непустыми значениями из `next`. Ключи, которые не называют операторную колонку панели,
отбрасываются (в режиме разработки — с предупреждением). Пустота определяется функцией
`isEmptyFilterValue(sv, operators)`: `undefined`, `''`, `[]`, `{}` или диапазон без обеих
границ — пустое, если оператор не `requiresInput: false`.

Почему updater, а не готовый массив: так запись идёт поверх последнего значения атома,
включая атом черновика под `draft`, и не перетирает изменение, сделанное в том же тике.

Под `draft` специальной ветки не нужно: `setColumnFilters` уже пишет во внешний атом, а
`onChange` уже перенесён на `apply()`. Это закрепляет тест.

### D4. Колонки без операторов — в `columns`, но не в пачке

Простой фильтр хранит сырое значение, а `Filters` ждёт `{ operator, value }`. Конвертация
через псевдо-оператор создала бы второй словарь значений. Поэтому такие колонки есть в
`columns` с `operators: []` (и `editor` по типу ячейки), их фильтр пишет `filter.setValue`
(сырое значение передаётся как есть), а пачечные `value` / `setValue` их не касаются. В
документации рекомендуем `filtering: { operators: true }` для грида с внешней панелью.

Следствие для типов: `ColumnFilterModel.value` имеет тип `StructuredFilterValue | undefined`
только у операторных колонок. Модель различает их дискриминатором `hasOperators: boolean`, и
у колонки без операторов `value: unknown`.

### D5. Публичная поверхность

- `useFilterPanelColumns()` переименовывается в `useColumnFilters()` и экспортируется. Возвращает
  `UseColumnFiltersResult | undefined` = `DataGridFilterPanelRenderArgs`, расширенный полями
  `value` и `setValue`. Один тип для хука и для render-функции, поэтому они не разойдутся.
- `DataGridFilterPanelColumn` получает `filter: ColumnFilterModel`. Поле `input` остаётся
  запасным вариантом для `editor: 'custom'`.
- `FilterEditor` — const-объект + union с одним именем, по правилу закрытых наборов
  (`.claude/rules/typescript/coding-style.md`).
- Имя `useColumnFilters` выбрано вместо `useFilterModel`: хук отдаёт всю панель, а не модель
  одной колонки. Совпадение со слайсом TanStack `columnFilters` осознанное — хук его пишет.

### D6. Подписки и стабильность ссылок

Хук подписан на те же слайсы, что `useFilterPanelColumns` (`columnFilters`,
`columnVisibility`, `columnPinning`). `value` пересобирается на каждый рендер. `Filters` в
режиме `confirm` хранит черновик сам, поэтому новая ссылка `value` при неизменном состоянии
черновик не сбрасывает, если кит сравнивает значения по содержимому. Это нужно указать в
документации. Мемоизацию по ссылке массива `columnFilters` добавим, только если тест покажет
лишние ререндеры.

## Risks / Trade-offs

- [Рефакторинг `renderFilterInput` меняет встроенный UI] → существующие тесты
  (`render-filter-input.test.tsx`, `filter-panel.test.tsx`, `column-filter*.test.tsx`) и e2e по
  фильтрам гонятся до и после; изменение в их ожиданиях — дефект, а не обновление снапшота.
- [`value` с новой ссылкой на каждый рендер ломает наивный `useEffect` в ките] → документируем
  сравнение по содержимому; мемоизация — по факту измерения (D6).
- [Рост `dist/index.js` пакета `data-grid-react`] → основной объём переезжает, а не
  добавляется; `pnpm size` в гейте, бюджет правится только с цифрой в том же изменении.
- [`setValue` с неизвестными ключами тихо ничего не делает в production] → предупреждение в
  режиме разработки и сценарий в спеке.
- [Потребитель включит `draft` грида и `mode='confirm'` одновременно — два черновика] →
  в документации указать: при внешнем черновике `draft` грида не включать.

## Migration Plan

Изменение добавляет API и ничего не удаляет. Changeset — minor для `@ez-kit/data-grid-react`.
Откат — revert одного PR.
