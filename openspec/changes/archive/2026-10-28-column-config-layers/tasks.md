# Tasks

## 1. Типы слоёв и объявление в бандле (главный риск — первым)

- [x] 1.1 Замерить исходное время type-check: `tsc --extendedDiagnostics --incremental false` на `apps/docs`; сохранить цифры в scratchpad для сравнения в 1.6 (в ADR идёт команда, а не цифры)
- [x] 1.2 Написать тип-тесты в `packages/data-grid/react/react/src/create-data-grid-columns.test.tsx` — по одному на каждый сценарий `specs/data-grid-column-typing/spec.md` (объявленный слой, опечатка в слое, опечатка в опции `filtering`, необъявленная поверхность, бандл без `columnConfig`, builder проверяет слой, builder → `DataGrid`, голый грид, вывод `TRow`) и сценарий двух бандлов из `specs/data-grid-column-config-layers/spec.md`; проверить, что `pnpm --filter @ez-kit/data-grid-react typecheck` падает (RED)
- [x] 1.3 Core: добавить тип слоёв (`ColumnConfigShape`, `UncheckedColumnConfig`, слой поверхности как `Omit<…, 'items' | 'useItems'>` или `Record<string, unknown>` для необъявленной) и протянуть параметр `TColumnConfig` последним с умолчанием через `ColumnFilteringConfig` / `ColumnEditingConfig` / `ColumnCreatingConfig` → `ColumnDefCommon` → `ColumnDef` → `FilterFieldDef`; проверить `pnpm --filter @ez-kit/data-grid-core typecheck`
- [x] 1.4 React: `defineColumnConfig<T>()` (type-only маркер), опция `columnConfig` у `createDataGrid`, параметр в `DataGridBundle` / `RegistryUseDataGridConfig` / `BoundDataGridProps` и связанных публичных типах (последним, умолчание `UncheckedColumnConfig`), привязанные `createColumns` / `createColumnHelper`, React `ColumnDef`; экспорт из `src/index.ts`; тип-тесты 1.2 зелёные
- [x] 1.5 Проверить, что киты и docs компилируются без правки аннотаций: `pnpm --filter @ez-kit/data-grid-shadcn typecheck`, `pnpm --filter @ez-kit/data-grid-heroui typecheck`, `pnpm --filter @ez-kit/docs typecheck` (в т.ч. `apps/docs/shared/DataGrid.tsx`)
- [x] 1.6 Повторить замер из 1.1 и убедиться, что прирост в пределах шума прогонов; если нет — остановиться и обсудить
- [x] 1.7 Документировать `columnConfig` / `defineColumnConfig` в `apps/docs/content/docs/data-grid/advanced/react.mdx` (строка `createDataGrid` в таблице и раздел про создание кита) и зарегистрировать опцию в `apps/docs/test/docs-options/page-type-map.ts`; проверить `pnpm --filter @ez-kit/docs test -- docs-option-names`

## 2. Резолв слоя в core

- [x] 2.1 Тесты в `core/src/column/map-columns/map-columns.test.ts`: `filtering.config` попадает в `meta.filtering.config` как есть, отсутствие слоя не добавляет ключ; в `core/src/create-table/resolve-filter-fields.test.ts`: поле сохраняет `filtering.config`; проверить RED
- [x] 2.2 `resolveFiltering` переносит `filtering.config` в `ColumnFilteringMeta.config` (`setIfDefined`), поле `config` в `ColumnFilteringMeta` с докблоком; тесты 2.1 зелёные
- [x] 2.3 Предупреждение в разработке для `items` / `useItems` внутри любого слоя (рядом с `warnOnBothItemSources`): называет колонку или поле, поверхность и опцию `*.items`; тест на текст предупреждения и на `warnOnce`; `pnpm --filter @ez-kit/data-grid-core test` зелёный

## 3. Мерж слоёв по поверхностям в React

- [x] 3.1 Тесты на `config`, который получают рендереры, по сценариям `specs/data-grid-column-config-layers/spec.md`: слой фильтра поверх базы и не виден ячейке; ключ заменяется целиком; редактор ячейки (`cell.tsx`); строка создания (`creating-row.tsx`) и авто-форма (`auto-form.tsx`) наследуют `editing.config` и переопределяют `creating.config`; `items` поверхности выше слоя; `items` в слое игнорируется; колонка без конфига не получает ключа `config`; переиспользуемый `filtering.component` различает колонки; проверить RED
- [x] 3.2 `configWithItems` в `data-grid/items-view.tsx` принимает поверхность (`ItemsSourceSlot`) и строит базу по таблице слоёв рядом с `OPTIONS_BY_SLOT` в `items-source/lists.ts`; `ItemsMeta` расширяет `Pick` до `config`; `fieldItemsProps` / `useFieldItems` и все вызывающие места передают поверхность; тесты 3.1 зелёные
- [x] 3.3 Убедиться, что существующие тесты конфигов и списков не изменились по поведению: `pnpm --filter @ez-kit/data-grid-react test` зелёный без правки старых ожиданий
- [x] 3.4 Документация слоёв: заменить «There is no filter-only config» в `filtering/index.mdx` разделом про слой фильтра; описать `editing.config` в `editing/index.mdx` и `creating.config` с наследованием в `editing/creating.mdx`; строки опций в таблицах; ограничение «тип слоя на весь бандл, не на cell type»; зарегистрировать опции в `page-type-map.ts`; проверить `pnpm --filter @ez-kit/docs test -- docs-option-names`

## 4. Слоты кита и модель фильтра

- [x] 4.1 Тесты: `MultiSelectFilter` получает `config` слоя в фильтре заголовка, в `PopoverFiltersLayout` и в `FilterPanel`; `BetweenInput` получает `config` рядом с `min` / `max`; `core.Input` и `OperatorSelect` не получают `config`; `useFilters().filters[i].filter.config` — тот же объект, что у рендерера, `undefined` у колонки без конфига; поле из `filtering.fields` доносит слой до `MultiSelectFilter` и модели; флаг слоя не меняет отбор строк; проверить RED
- [x] 4.2 `MultiSelectFilterProps<TConfig>` / `BetweenInputProps<TConfig>` с необязательным `config` и докблоками; `FilterModel.config`; ветки `MultiSelect` / `Between` в `render-filter-input.tsx` передают смерженный `config` (отсутствует, когда собирать нечего); тесты 4.1 зелёные
- [x] 4.3 Встроенные `MultiSelectFilter` / `BetweenInput` в shadcn и heroui остаются без изменений и игнорируют `config`: `pnpm --filter @ez-kit/data-grid-shadcn test`, `pnpm --filter @ez-kit/data-grid-heroui test` зелёные
- [x] 4.4 Документация: `config` в таблице модели в `filtering/variants.mdx`, проп `config` слотов в разделе про создание кита (`advanced/react.mdx`) с примером creatable-мультивыбора; проверить `pnpm --filter @ez-kit/docs test -- docs-option-names`

## 5. Решение и релиз

- [x] 5.1 ADR `openspec/decisions/0018-column-config-layers.md` из D1–D4 design.md (команда замера из 1.1 вместо цифр, guard-тесты) и правило одним абзацем со ссылкой в `AGENTS.md` (раздел «Settled data-grid API decisions»); проверить `pnpm lint` (включая `check-site-url.mjs`)
- [x] 5.2 Changeset: minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`, без `@ez-kit/data-grid-shadcn`; проверить `node scripts/check-changesets.mjs`

## 6. Интеграционная проверка

- [x] 6.1 Полный гейт последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size` — каждый отдельным `turbo run`; размер `@ez-kit/data-grid-react` в пределах бюджета

## Workflow follow-up

- Архивировать change после ревью и мержа PR в `develop`; перед архивом убедиться, что ADR 0018 и правило в `AGENTS.md` на месте.
