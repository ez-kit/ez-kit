# Proposal

## Why

На вопрос «как добавить свой проп в ячейку или в инпут» доки отвечают только частично.
`custom-cell-types.mdx` учит регистрировать **новый** тип, но не объясняет:

- откуда тип ячейки вообще берётся (core-контракт → кит → bundle → prop);
- как расширить config **встроенного** типа (badge + `size`). Для этого нужны оба параметра
  `defineCellType` у select / badge, а описаны они только в JSDoc;
- что делает автор кита (`KitCellTypes`, проверка `_KitCellTypesMatchRegistry`). Сейчас это
  докблок в исходнике кита, и только.

Раздел «Type-safety» обещает меньше, чем есть на самом деле, и в главном вводит в заблуждение.
Он говорит, что не проверяется только id в рукописном `cell.type`. TS-проба на собранных пакетах
показала другое: колонки, переданные в `columns` inline (в `<DataGrid>` или `useDataGrid`), не
проверяются **совсем**, ни `type`, ни `config`, потому что `TableConfig.columns` типизирован как
`ColumnDef<TRow, any>`. Проверку делают только bundle-овские `createColumns` /
`createColumnHelper`. Prop `<DataGrid cellTypes>` (`CellTypeRegistry`) мержит рендереры в рантайме,
но типы колонок не меняет.

Про инпуты фильтра и редактирования доки говорят одной фразой («receives `FieldState` … plus the
column's `config`»). Из неё не видно, что `cell.config` один на все четыре слота, что per-slot
config нет, что замыкание в `editing.component` безопасно только при стабильных колонках (редактор
монтируется по идентичности компонента, `cell.tsx` `resolveEditComponent`) и что для меняющихся
значений правильный путь — `context` + `useGridContext`.

Попутно нашлась реальная поломка на той же странице. Docs-реестр `apps/docs/shared/data-grid/custom-cell-types.ts`
и пример `column-helper-registered.tsx` регистрируют инпуты под ключом `edit:`, а такого слота нет
(есть `editing`). Поэтому «click Edit on any row to try the custom inputs» показывает дефолтный инпут,
а не кастомный.

## What Changes

- `columns/custom-cell-types.mdx`:
  - новый раздел **Where cell types come from**: схема слоёв и одна фраза о том, что типы колонок
    задаёт bundle, а prop `cellTypes` меняет только рендереры;
  - новый раздел **Extending a built-in type**: рецепт badge + `size`; правило «расширять, а не
    менять форму»; зачем у select / badge два параметра типа;
  - новый раздел **For kit authors**: `KitCellTypes` объявлен, а не выведен через `typeof cellTypes`,
    и почему; пересечение и `Omit` для добавления или удаления типа; роль
    `_KitCellTypesMatchRegistry`;
  - раздел **Type-safety** переписан: проверка есть только у bundle `createColumns` /
    `createColumnHelper`, inline-колонки не проверяются сознательно (ради вывода `TRow`);
  - уточнена фраза про мерж реестров по полям: она про рантайм, а не про типы.
- `editing/index.mdx` и `filtering/index.mdx`: короткий раздел **Passing your own props to an
  input**. В нём три пути (ключ в `cell.config`, замыкание при стабильных колонках, `context`) и
  ссылка на расширение типа.
- Новый docs-пример `custom-cell-badge-size`, общий для обоих китов: view пишем сами, а `editing` /
  `filtering` badge-а берём из кита.
- Исправление: `edit:` → `editing:` в `apps/docs/shared/data-grid/custom-cell-types.ts` и
  `apps/docs/shared/data-grid/examples/components/column-helper-registered.tsx`.

Вне scope и отложено на отдельное обсуждение:

- проверка inline-колонок по реестру bundle (это изменение API);
- то, что `defineCellType` принимает неизвестный ключ слота (`edit:`) без ошибки: generic-вывод
  `TDefinition` отключает excess property check. Тоже изменение API, а не доков.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет. Change чисто документационный: поведение пакетов не меняется, а `edit:` → `editing:` чинит
docs-пример, а не библиотеку. Поэтому в `.openspec.yaml` стоит `skip_specs: true`.

## Impact

- `apps/docs/content/docs/data-grid/columns/custom-cell-types.mdx`, `editing/index.mdx`,
  `filtering/index.mdx`.
- `apps/docs/shared/data-grid/custom-cell-types.ts` (исправление слота и, возможно, расширенный badge,
  см. design), `custom-grid-shadcn.tsx`, `custom-grid-heroui.tsx`.
- `apps/docs/shared/data-grid/examples/components/custom-cell-badge-size.tsx` (новый),
  `manifest.json`, `registry.ts`, `column-helper-registered.tsx`.
- Guard-тесты docs: `docs-option-names.test.ts` (если в новых разделах появятся таблицы опций, их
  нужно классифицировать в `page-type-map.ts`), `e2e-slots.test.ts` не затрагивается.
- Пакеты `@ez-kit/data-grid-*` не меняются; changeset, если понадобится, только на `@ez-kit/docs`.
