# Proposal

## Why

Кит, построенный поверх `@ez-kit/data-grid-react`, не может передать настройку одной колонки своему
компоненту фильтра. Конкретный случай: tag-редактор для операторов с `input: 'list'` (`in`, `notIn`)
работает в двух режимах — только из списка или с вводом своих значений, и режим выбирается per
column. Сейчас положить такой флаг некуда:

- `ColumnFilteringConfig` — закрытый `type`, у `ColumnDef` нет свободного `meta`, а inline-колонки
  бандла проверяются строго (ADR 0016), так что лишний ключ — ошибка компиляции;
- `MultiSelectFilterProps` не получает ни колонку, ни её конфиг;
- `FilterModel`, из которого панель фильтров строит редакторы, такого поля тоже не несёт.

Единственный канал сегодня — `cell.config`, но его читают и ячейка, и редактор, и фильтр. Фильтровый
флаг там виден всем, а до `MultiSelectFilter` он всё равно не доходит. Переиспользуемый
`filtering.component` тоже не может узнать настройку своей колонки: замыкание на каждую колонку даёт
новую идентичность компонента и ремоунт.

Добавлять в ez-kit сам флаг (`allowsCustomValues`) — неверный уровень: grid его не интерпретирует, а
следующий кит придёт со следующим флагом. Нужен общий механизм.

## What Changes

- У каждой поверхности колонки появляется свой слой конфига: `filtering.config`, `editing.config`,
  `creating.config`. Слой мержится поверх `cell.config` по ключам (поверхностно), и рендерер получает
  один смерженный `config`:
  - фильтр: `cell.config` < `filtering.config`;
  - редактор: `cell.config` < `editing.config`;
  - создание: `cell.config` < `editing.config` < `creating.config` — тот же каскад, что у `items`;
  - ячейка: `cell.config`, как сейчас.
- `items` / `useItems` внутри слоя запрещены — у поверхности для этого уже есть `*.items` /
  `*.useItems`. Список, который поверхность разрешила, по-прежнему заменяет `items` в итоговом
  `config` и стоит выше слоя.
- Смерженный `config` получают все рендереры, которые его уже получают
  (`filtering.component`, `editing.component`, `creating.component`, рендереры cell type через
  `FieldState`), и дополнительно слоты кита `MultiSelectFilter` и `BetweenInput`. `core.Input` и
  `OperatorSelect` его не получают.
- `FilterModel.config` — смерженный конфиг фильтра, для панелей на `useFilters()`.
- Поле фильтра (`filtering.fields[i].filtering.config`) принимает слой по тем же правилам мержа, что
  колонка; как и `cell` поля, бандл его не проверяет — поля типизирует таблица.
- `createDataGrid` принимает `columnConfig: defineColumnConfig<{ filtering?; editing?; creating? }>()` —
  type-only маркер. Колонки бандла (inline и из его builder-ов) проверяют слои против этого типа;
  поверхность, которую бандл не объявил, на его колонках запрещена. Без бандла слои `unknown` и не
  проверяются.
- Grid слои не читает и не валидирует по содержимому: он только доставляет их.
- Колонка без слоёв получает ровно тот `config`, что сейчас — изменение не ломающее.
- Документация: строка «There is no filter-only config» в `filtering/index.mdx` заменяется описанием
  слоёв; слои описаны на страницах filtering, editing, creating и в разделе про `createDataGrid`.

## Capabilities

### New Capabilities

- `data-grid-column-config-layers`: слои конфига поверхностей над `cell.config` — каскад и порядок
  мержа, запрет `items` в слое, какие рендереры и слоты получают смерженный `config`, объявление типа
  слоёв в бандле.

### Modified Capabilities

- `data-grid-column-typing`: колонки бандла проверяют `filtering.config` / `editing.config` /
  `creating.config` против `columnConfig` бандла; колонки из builder-ов бандла несут ту же форму;
  колонки голого грида слои не проверяют.
- `data-grid-filter-model`: модель фильтра несёт `config` — смерженный конфиг фильтра цели.
- `data-grid-filter-fields`: поле фильтра принимает `filtering.config` и мержит его поверх своего
  `cell.config`.

## Impact

- **Core** (`@ez-kit/data-grid-core`): `ColumnFilteringConfig`, `ColumnEditingConfig`,
  `ColumnCreatingConfig`, `FilterFieldDef`, `ColumnDef` / `ColumnDefCommon` получают параметр типа
  слоёв; `resolveFiltering` переносит слой в `ColumnFilteringMeta.config`.
- **React** (`@ez-kit/data-grid-react`): `createDataGrid` / `DataGridBundle` / привязанные
  `createColumns` / `createColumnHelper` несут тип слоёв; `configWithItems` в `items-view.tsx`
  становится зависимым от поверхности; вызывающие его места (`render-filter-input`, `cell.tsx`,
  `creating-row.tsx`, `auto-form.tsx`) и ветки `MultiSelectFilter` / `BetweenInput` передают
  смерженный `config`; `FilterModel.config`; `MultiSelectFilterProps` / `BetweenInputProps`
  получают `config`.
- **Kits** (`shadcn`, `heroui`): аннотации `DataGridBundle<…>` в `data-grid.tsx` получают новый
  параметр; встроенные слоты `config` игнорируют.
- **Docs** (`apps/docs`): страницы filtering / editing / creating / создания кита; таблицы опций
  покрыты `docs-option-names.test.ts`, так что новые ключи нужно зарегистрировать там.
- **ADR**: новое решение (0018) — слои конфига поверхностей, тип объявляется в бандле, без
  declaration merging и без вывода типа из слотов.
- **Changeset**: minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`.
