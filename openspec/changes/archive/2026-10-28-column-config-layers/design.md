# Design

## Context

Мотивация — в proposal.md (Why). Здесь только то, что определяет подход.

- Весь `config`, который получают рендереры поверхностей, сегодня собирается в одной функции —
  `configWithItems(meta, options)` в `react/react/src/data-grid/items-view.tsx`. Её зовут фильтр
  (`render-filter-input.tsx`), редактор ячейки (`cell.tsx`, через `useFieldItems`), строка создания
  (`creating-row.tsx`) и авто-форма (`auto-form.tsx`). Она отдаёт `cell.config`, у `select` / `badge`
  с подменённым `items`.
- Поверхности уже различаются через `ItemsSourceSlot` (`Cell` / `Filtering` / `Editing` /
  `Creating`), а каскад списков по ним задан в `items-source/lists.ts` (`OPTIONS_BY_SLOT`): создание
  наследует редактор, редактор и фильтр — базу.
- Колонки бандла типизируются как `CoreColumnDef<TRow, TCellTypes & NoInfer<TExtra>>` (ADR 0016).
  `TCellTypes` известен из типа бандла, а не выводится на месте вызова, поэтому `TRow` по-прежнему
  выводится из `data`. Публичные типы бандла принимают реестр последним параметром с unchecked
  умолчанием, чтобы обёртки, не знающие реестра (`apps/docs/shared/DataGrid.tsx`), компилировались.
- `filtering` и `cell` — соседние поля колонки: типу `filtering` не из чего узнать `cell.type`
  (см. комментарий к `resolveDatePresets` в `resolve-filtering.ts`).
- `ColumnMeta.editing` / `.creating` — сырые конфиги колонки, `ColumnMeta.filtering` — резолвленный
  `ColumnFilteringMeta`. Поле фильтра резолвится тем же `resolveFiltering`.

## Goals / Non-Goals

**Goals:**

- Один путь сборки `config` для всех поверхностей, без второй функции рядом с `configWithItems`.
- Типизация слоёв на месте — в колонках бандла — без потери вывода `TRow` и без новых
  выводимых параметров.
- Колонка без слоёв получает побайтно тот же `config`, что сейчас.

**Non-Goals:**

- Типизация слоя по `cell.type` колонки (`Partial<конфиг этого типа>`): требует распределять
  `ColumnDefCommon` по всем типам ячеек — см. Risks.
- Расширение типа слоёв на уровне одного грида (аналог `cellTypes` / `TExtra`).
- Слой у ячейки (`cell` — сама база) и у системных колонок.
- Интерпретация содержимого слоя гридом: никаких флагов, которые ez-kit читает из `config`.

## Decisions

### D1. Слой поверхности мержится поверх `cell.config`, каскад повторяет `items` — Durable

```
 slot        config
 ----        ------
 Cell        cell.config
 Filtering   { ...cell.config, ...filtering.config }                   then items of the slot
 Editing     { ...cell.config, ...editing.config }                     then items of the slot
 Creating    { ...cell.config, ...editing.config, ...creating.config } then items of the slot
```

`configWithItems(meta, options)` получает третий аргумент — `ItemsSourceSlot` — и строит базу по
таблице `CONFIG_LAYERS_BY_SLOT` рядом с `OPTIONS_BY_SLOT`, чтобы два каскада лежали рядом и не
разошлись. Вызывающие места поверхность уже знают: `useFieldItems` получает её параметром,
`fieldItemsProps` — получит. Результат `undefined`, только если нет ни базы, ни слоя, ни списка —
как сейчас.

Мерж поверхностный: значение ключа заменяется целиком. Глубокий мерж (как у `context`) сделал бы
массивы и вложенные объекты в `config` непредсказуемыми, и у слоя нет ключа, которому он нужен.

Создание мержит слой редактора, а не берёт его fallback-ом, как `items`: `items` — одно значение,
`config` — набор ключей. Это то же правило «создание наследует редактор» в форме, подходящей
набору.

_Отвергнуто:_ отдельный проп (`filterConfig`) рядом с `config` — у компонента `config` уже занят
`cell.config`, второе имя для конфига той же колонки противоречит правилу «одно понятие — одно
слово», а автору пришлось бы самому мержить два объекта. Fallback вместо мержа — колонке,
переопределившей один ключ, пришлось бы повторить всю базу.

### D2. `items` / `useItems` в слое запрещены — Durable

Тип слоя — `Omit<Layer, 'items' | 'useItems'>`; в рантайме слой с этими ключами в разработке
предупреждает (`warnOnce`, колонка и поверхность в тексте) и они игнорируются. Список поверхности
задаётся `*.items` / `*.useItems`: за ним стоит резолв хука, загрузка и ошибка, и он стоит выше
слоя в итоговом `config`. Иначе у одного значения было бы два написания.

### D3. Тип слоёв объявляет бандл, phantom-маркером — Durable

```ts
createDataGrid({
	components,
	cellTypes,
	columnConfig: defineColumnConfig<{ filtering: { allowsCustomValues?: boolean } }>(),
})
```

`defineColumnConfig<T>()` возвращает type-only маркер (как `__config` у `defineCellType`), в
рантайме — пустой объект, который `createDataGrid` не читает. Тип становится новым параметром
бандла `TColumnConfig`, известным из типа бандла, как `TCellTypes`, — поэтому вывод `TRow` из
`data` не страдает (то же рассуждение, что в ADR 0016).

Параметр протягивается по той же цепочке, что `TCellTypes`: `ColumnFilteringConfig` /
`ColumnEditingConfig` / `ColumnCreatingConfig` → `ColumnDefCommon` → `ColumnDef` (core и react) →
`FilterFieldDef` → `createDataGrid` / `DataGridBundle` / `RegistryUseDataGridConfig` / привязанные
`createColumns` / `createColumnHelper`. `filtering.fields` остаётся `FilterFieldDef[]` с
unchecked-слоем: бандл не проверяет и `cell` поля, и проверка полей — отдельная работа. В публичных типах бандла он идёт **последним, с
умолчанием `UncheckedColumnConfig`** — по той же причине, по которой реестр по умолчанию
`UncheckedCellTypes`.

_Отвергнуто:_ module augmentation (`interface ColumnConfigExtensions {}`) — глобальна на программу,
два кита в одном приложении конфликтуют; `data-grid-context-typing` уже запрещает declaration
merging для контекста. Вывод из типа пропов зарегистрированного `MultiSelectFilter` — слотов,
получающих слой, несколько, а `defineCellType` описывает именно эту ловушку: «four independent
inference sites for one parameter … infers something arbitrary». Phantom-ключ на типе реестра (без
нового параметра) — меньше шума, но реестр типов ячеек перестаёт быть только реестром.

### D4. Необъявленная поверхность принимается без проверки — Durable

```
 TColumnConfig                     filtering.config on a column of the bundle
 -------------                     -------------------------------------------
 { filtering: F }                  Omit<F, 'items' | 'useItems'>   -- checked
 filtering not declared            Record<string, unknown>         -- unchecked
 no bundle (bare grid)             Record<string, unknown>         -- unchecked
```

Слой необъявленной поверхности читает только собственный `component` автора, а тот и так
аннотирует свой `config` сам (`InputComponentProps<TConfig>`). Запрет (`never`) отнял бы слой у
автора на любом prebuilt-ките, который слоёв не объявляет. Строгость остаётся там, где у слоя есть
читатель с объявленным типом.

### D5. Кто получает смерженный `config`

| Получатель                                                                     | Сейчас                  | После                                                              |
| ------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------ |
| `filtering.component` (`InputComponentProps.config`)                           | `cell.config` (+ items) | слой фильтра                                                       |
| `editing.component` / `creating.component` (`FieldState.config`)               | `cell.config` (+ items) | слой своей поверхности                                             |
| рендереры cell type `filtering` / `editing` / `creating` (`FieldState.config`) | `cell.config` (+ items) | слой своей поверхности                                             |
| `MultiSelectFilter` (`MultiSelectFilterProps.config`)                          | —                       | слой фильтра                                                       |
| `BetweenInput` (`BetweenInputProps.config`)                                    | —                       | слой фильтра; `min` / `max` / `slider` остаются отдельными пропами |
| `FilterModel.config`                                                           | —                       | слой фильтра, тот же объект, что получает рендерер                 |
| `core.Input`, `OperatorSelect`                                                 | —                       | не получают                                                        |

`MultiSelectFilterProps` и `BetweenInputProps` получают параметр `TConfig = Record<string, unknown>`,
как `InputComponentProps<TConfig>`: кит аннотирует свой слот типом, который объявил в
`columnConfig`. `config` в пропах слота отсутствует (а не `undefined`), когда собирать нечего, — как
в `configProp`.

`core.Input` — общий примитив (ADR 0007), он рендерит не только значение колонки; `OperatorSelect`
редактирует оператор, а не значение. Колонке, которой нужен свой редактор, для этого есть
`component` или cell type.

### D6. Резолв в core

`resolveFiltering` переносит `filtering.config` в `ColumnFilteringMeta.config` через `setIfDefined`,
без копирования и без чтения содержимого — для колонок и полей одним кодом. `editing.config` /
`creating.config` уже лежат в `meta.editing` / `meta.creating` как часть сырого конфига; `ItemsMeta`
расширяет свой `Pick` до `'items' | 'useItems' | 'config'`. Проверка D2 (`items` в слое) живёт рядом
с `warnOnBothItemSources`.

## Risks / Trade-offs

- [Рост сигнатур: ещё один параметр в ~30–50 местах] → он везде последний и с умолчанием;
  существующие аннотации `DataGridBundle<KitCellTypes, KitFeatures>` в китах компилируются без
  правки, правятся только там, где кит объявляет слои.
- [Время type-check] → замерить `tsc --extendedDiagnostics --incremental false` на `apps/docs` до и
  после, как в ADR 0016; результат в ADR 0018.
- [Колонки из builder-ов бандла теряют тип слоёв по дороге в `DataGrid`] → это первый кусок работы
  и первая группа тип-тестов: builder бандла → `DataGrid` бандла, с объявленным и необъявленным
  слоем, inline и через builder.
- [Слой типизирован на весь бандл, не на cell type: `filtering.config.allowsCustomValues` допустим
  на `number`-колонке] → grid слой не читает, предупреждать не о чем; ограничение названо в
  документации. Типизация per cell type потребовала бы распределять `ColumnDefCommon` по типам
  ячеек (keys × types членов union) — отложено как Non-Goal.
- [Кит объявил `filtering`, а автор хочет в `filtering.config` свой ключ для своего `component`] →
  тип кита закрыт; решается позже расширением на уровне грида (аналог `TExtra`) без ломки.
- [`FieldState` общий у фильтра и редактора] → `config` в нём и так поверхностный по смыслу;
  меняется только содержимое, не форма.

## Migration Plan

Не ломающее изменение: колонка без слоёв получает тот же `config`, новый параметр типов везде
последний и с умолчанием. Changeset — minor для `@ez-kit/data-grid-core` и
`@ez-kit/data-grid-react`; `@ez-kit/data-grid-shadcn` в changeset не попадает. Перед архивом
change: ADR 0018 из D1–D4, правило и ссылка в `AGENTS.md`, замена строки «There is no filter-only
config» в `apps/docs/content/docs/data-grid/filtering/index.mdx`.
