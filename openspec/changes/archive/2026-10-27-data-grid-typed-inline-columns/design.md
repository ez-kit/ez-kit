# Design

## Context

Мотивация описана в proposal.md (Why), требования — в `specs/data-grid-column-typing/spec.md`.

**Как сейчас устроено.**

- `TableConfig.columns: ColumnDef<TRow, any, unknown>[]` (`core/src/types.ts`). Из-за `any` поле
  `cell` не проверяется. `accessorKey` при этом проверяется: `ColumnDef` — mapped union по
  `keyof TRow`, и `TRow` в нём остаётся.
- `DataGridBundle<TCellTypes, TFeatures, TContext>` (`react/src/create-data-grid.tsx`) использует
  `TCellTypes` только в `createColumns` / `createColumnHelper`. Его `DataGrid` / `useDataGrid`
  принимают одну из трёх форм:
  - `BoundDataGrid` / `BoundUseDataGridConfig`, если есть `features`;
  - `ContextBound*`, если есть только `context`;
  - `typeof DataGrid` / `typeof useDataGrid` (bare), если нет ни того, ни другого.
- Киты аннотируют свой bundle как `DataGridBundle<KitCellTypes, KitFeatures>`, так что реестр до
  их prebuilt `DataGrid` уже доходит.
- `BoundDataGridProps` — публичный тип. Docs-переключатель `apps/docs/shared/DataGrid.tsx` типизирует
  им свой `DataGridBase` и передаёт props в любой из двух китов.
- `<DataGrid cellTypes>` типизирован как `CellTypeRegistry`; мерж по полям идёт в рантайме.

**Что показала проба** (прототип `useDataGrid` на собранных `dist`, TS 5.9.3):

- `columns: ColumnDef<TRow, KitCellTypes>[]`: `TRow` выводится из `data`; `nosuch`, лишний ключ
  config и опечатка в `accessorKey` дают ошибку; `value` типизирован по полю; колонки из
  непривязанного `createColumns<Row>` принимаются; колонки под чужой реестр отвергаются.
- `columns: ColumnDef<TRow, TCellTypes & TExtra>[]` и `cellTypes?: TExtra`: `TExtra` выводится **из
  колонок**, и `nosuch` проходит молча. С `NoInfer<TExtra>` в `columns` `rating` из `cellTypes`
  принимается, а `nosuch` отвергается.
- JSX `<DataGrid>` (union controlled | uncontrolled props), время `tsc` и вид ошибок в пробе **не
  проверялись**. Это задачи группы 1.

**Результаты группы 1** (прототип = финальные типы в `create-data-grid.tsx`, TS 5.9.3; bundle
аннотирован `DataGridBundle<BaseCellTypes, typeof allDataGridFeatures>`, как у китов).

- 1.1, JSX `<DataGrid>` с union-props: `TRow` выводится из `data`, `TExtra` — из `cellTypes`.
  Inline `nosuch` — ошибка; `cellTypes={{ rating }}` + `type: 'rating'` компилируется;
  `cellTypes={{ rating }}` + `type: 'nosuch'` — ошибка (колонка свой id не регистрирует);
  `cellTypes={{ date: { view } }}` + `type: 'date', config: { min }` компилируется (решение 6
  подтверждено). Controlled `<DataGrid table={…}>` не затронут. Через опубликованные `.d.ts`
  проверка доходит до потребителя: в `apps/docs` prebuilt `DataGrid` обоих китов отвергает
  `nosuch` и принимает `date`.
- Найденная при реализации деталь: колонки типизированы core-`ColumnDef<TRow, R>` (TNode
  `unknown`, как в `TableConfig.columns`), а не React-`ColumnDef` (TNode `ReactNode`). Иначе
  отвергаются колонки из core-`createColumns`, у которых `header` возвращает `unknown`.
- 1.2, `tsc --extendedDiagnostics --incremental false` на `apps/docs`, медиана трёх прогонов:

  |       | Check time | Instantiations     | Memory               |
  | ----- | ---------- | ------------------ | -------------------- |
  | до    | 5.92 s     | 1 036 075          | 1 183 203 K          |
  | после | 5.83 s     | 1 044 363 (+0.8 %) | 1 191 359 K (+0.7 %) |

  Check time в пределах шума прогонов (5.77–6.09 s); порог +20 % не достигнут.

  5.1, повтор на финальной реализации (те же условия): Check time 5.85 s, Instantiations
  1 044 393 (+0.8 %), Memory 1 173 140 K (−0.9 %). Итог тот же: в пределах шума.

- 1.3, тексты ошибок:
  - неизвестный id: `Type '"nosuch"' is not assignable to type '"number" | "boolean" | … |
"progress" | undefined'` (с `cellTypes` в списке есть и `"rating"`);
  - лишний ключ config: `Object literal may only specify known properties, and 'nope' does not
exist in type 'NumberCellConfig'`;
  - опечатка в `accessorKey`: `Type '"nam"' is not assignable to type '"at" | "id" | "name" |
"score" | undefined'. Did you mean '"name"'?`;
  - колонки под чужой реестр: `Type 'ColumnDef<Row, BaseCellTypes & { rating: … }>[]' is not
assignable to type 'ColumnDef<Row, BaseCellTypes, unknown>[]'`, дальше 8 строк
    раскрытия через `columns` групп. Первая строка называет оба реестра, разница (`rating`)
    видна в ней. Это нечастый случай, alias не нужен.
- 1.4: минимальная версия TS нигде не заявлена (ни README, ни peer, ни `typesVersions`).
  `data-grid-react` до этой правки `NoInfer` не использовал. В README пакета добавлено
  «TypeScript 5.4 or later».

## Goals / Non-Goals

**Goals:**

- Проверка inline-колонок в каждом bundle и в prebuilt-гридах китов без единой правки на месте
  вызова для корректного кода.
- Документированный путь регистрации типа на одном grid (`cellTypes` prop) продолжает компилироваться.

**Non-Goals:**

- Проверка у bare `DataGrid` / `useDataGrid` пакета. Его реестр живёт в рантайме (провайдер).
- Проверка неизвестных ключей слотов в `defineCellType` (`edit:`) — отдельная тема.
- Любые изменения рантайма.

## Decisions

**1. Реестр задаётся типом bundle, а не выводится на месте вызова.** _Durable._
Компромисс в докблоке `TableConfig.columns` касался **выводимого** второго параметра. Bundle уже
несёт `TCellTypes`, поэтому параметр фиксирован, и вывод `TRow` не страдает (проба).
`TableConfig` в core не меняется: `columns` там остаётся `ColumnDef<TRow, any>`. Сужение делается на
уровне react-типов, которые отдаёт bundle.
Альтернативы:

- (a) второй выводимый параметр на `TableConfig` — то, что отклонено исходным компромиссом;
- (b) проверять только builder-ами (статус-кво);
- (c) ESLint-правило — не видит реестр.

**2. Реестр grid расширяется только через `cellTypes`, с `NoInfer`.** _Durable._
`columns: ColumnDef<TRow, TCellTypes & NoInfer<TExtra>>[]`, `cellTypes?: TExtra`,
`TExtra extends CellTypeRegistry = {}`. `NoInfer` — единственное, что не даёт колонкам самим
«зарегистрировать» свой id (проба). Нужен TS ≥ 5.4; репозиторий на 5.9. Для потребителя на
TS < 5.4 `NoInfer` не существует, поэтому минимальная версия TS становится частью совместимости
пакета. Её нужно проверить и указать в README / peer-диапазоне (задача 1.4).
Альтернатива — без `TExtra`. Отклонена: она ломает документированный путь `<DataGrid cellTypes>`.

**3. Все четыре формы bundle получают реестр.**
`BoundDataGrid`, `BoundUseDataGridConfig` / `BoundDataGridProps`, `ContextBound*` и форма «без
features и без context». Последняя сейчас — просто `typeof DataGrid`, и ей нужен свой тип
(`RegistryBoundDataGrid` / `RegistryBoundUseDataGrid` или общий параметр). Иначе
`createDataGrid({ components, cellTypes })` без `features` останется без проверки. Конкретную
форму выбрать при реализации, ориентируясь на минимальный дифф в `DataGridBundle`.

**4. Новый параметр публичных типов по умолчанию не проверяет.**
`BoundDataGridProps<TFeatures, TRow, TContext, TCellTypes = AnyRegistry>` и аналоги получают
параметр реестра в конце. По умолчанию это реестр, который принимает любой `cell` (эквивалент
сегодняшнего `any`). Тогда сторонний код, который пишет `BoundDataGridProps<F, Row>` (как
docs-переключатель), сохраняет поведение, а bundle передаёт свой реестр явно.
Альтернатива — default `BaseCellTypes`. Отклонена: ломает сторонние обёртки, которые не знают
реестра.

**5. Bare `DataGrid` / `useDataGrid` пакета не меняются.**
Колонки там по-прежнему `ColumnDef<TRow, any>`: типы, зарегистрированные через `CellTypesProvider`,
не видны.

**6. Мерж по полям остаётся рантайм-деталью.**
`cellTypes={{ date: { view } }}` переопределяет id, который уже есть в bundle. Тип
`TCellTypes & TExtra` для `date` даёт пересечение config, а `{ view }` без `__config` ничего не
сужает. Проверить в задаче 1.1, что такое переопределение не ломает колонки `date`.

**7. Порядок работы: сначала измерения, потом реализация.**
Группа 1 закрывает три непроверенных риска (JSX-вывод, время tsc, вид ошибок). Если вывод JSX не
работает или время tsc растёт заметно (ориентир — больше чем на 20 % по `Check time` на
`apps/docs`), реализация останавливается и design пересматривается вместе с пользователем, без
обходных решений.

**8. Документация и ADR.**
ADR `0016-bundle-types-inline-columns.md` фиксирует решения 1 и 2, правило со ссылкой идёт в
AGENTS.md (раздел «Settled data-grid API decisions»). Докблок `TableConfig.columns` переписывается:
сам слот не проверяет, проверку делает bundle, ссылка на ADR. В `custom-cell-types.mdx` раздел
«Type-safety» описывает новую проверку, а сниппет с `cellTypes` prop исправляется, чтобы
компилироваться: колонки пишутся inline в том же grid, где `cellTypes` их и разрешает.

## Risks / Trade-offs

- [JSX generic-компонент с union-props (controlled | uncontrolled) хуже выводит `TRow` / `TExtra`,
  чем хук] → задача 1.1 до любой реализации; при неудаче — стоп и пересмотр design (решение 7).
- [Время `tsc` растёт: mapped union по `keyof TRow` × union arm-ов реестра на каждой inline-колонке]
  → замер `--extendedDiagnostics` на `apps/docs` до и после (задачи 1.2 и 4.x).
- [Ошибки для чужого реестра — многострочные union-простыни] → задача 1.3 фиксирует примеры. Если
  ошибка для частого случая нечитаема, это повод для type-alias с понятным именем, а не для отказа.
- [Breaking для кода, который передаёт колонки под чужой реестр] → путь миграции: передать
  реестр через `cellTypes` этого grid или собрать колонки builder-ом этого bundle. Описать в
  changeset.
- [`NoInfer` требует TS ≥ 5.4 у потребителя] → задача 1.4: проверить, что заявлено в пакете, и
  указать минимум.
- [Docs-примеры начнут падать на typecheck там, где колонки и grid из разных реестров] → это и есть
  находки; чинить примеры, а не ослаблять тип.
