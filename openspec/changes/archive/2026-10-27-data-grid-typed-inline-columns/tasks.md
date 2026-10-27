# Tasks

## 1. Измерения до реализации (решение 7: при провале — стоп и пересмотр design)

- [x] 1.1 Прототип типов в ветке (без рантайм-правок): JSX `<DataGrid>` из bundle с union-props выводит `TRow` из `data` и `TExtra` из `cellTypes`; inline `nosuch` — ошибка; `cellTypes={{ rating }}` + `type: 'rating'` — компилируется; `cellTypes={{ date: { view } }}` не ломает колонки `date` (решение 6). Результат записать в design.md (раздел Context)
- [x] 1.2 Замерить `tsc --extendedDiagnostics` на `apps/docs` (Check time, Instantiations, Memory) до и после прототипа, три прогона каждый; записать медианы в design.md. Порог — +20 % Check time
- [x] 1.3 Собрать в design.md тексты ошибок для четырёх случаев (неизвестный id, лишний ключ config, опечатка в `accessorKey`, колонки под чужой реестр); если ошибка частого случая нечитаема — предложить именованный alias, не отказываться от проверки
- [x] 1.4 Проверить, как пакеты заявляют минимальную версию TypeScript для потребителей (README / peer / `typesVersions`); если нигде — добавить в README `@ez-kit/data-grid-react` минимум TS 5.4 из-за `NoInfer`; проверить, что README рендерится и `check-site-url` проходит

## 2. Типы bundle

- [x] 2.1 В `create-data-grid.tsx` добавить параметр реестра в конец `BoundUseDataGridConfig`, `BoundDataGridProps`, `BoundDataGrid`, `ContextBound*` с default «любой `cell`» (решение 4); `columns` → `ColumnDef<TRow, TCellTypes & NoInfer<TExtra>>[]`, `cellTypes?: TExtra`; проверить `pnpm --filter @ez-kit/data-grid-react typecheck`
- [x] 2.2 Ввести форму для bundle без `features` и без `context` (решение 3) и протянуть `TCellTypes` во все четыре ветки `DataGridBundle`; проверить typecheck пакета
- [x] 2.3 Написать `src/create-data-grid-columns.test.tsx` по сценариям spec (каждый `#### Scenario` — тест или `@ts-expect-error`-кейс): bundle inline id / config / расширенный badge, per-grid `cellTypes`, колонка не регистрирует свой id, вывод `TRow`, опечатка в accessor, `value` по accessor, base-builder принят, чужой реестр отвергнут, bare-грид не проверяет, рантайм рендерит сырое значение; проверить `pnpm --filter @ez-kit/data-grid-react test` и typecheck
- [x] 2.4 Переписать докблок `TableConfig.columns` в `core/src/types.ts` (слот не проверяет, проверку делает bundle, ссылка на ADR 0016); проверить lint core

## 3. Киты и потребители внутри репозитория

- [x] 3.1 `pnpm --filter @ez-kit/data-grid-heroui --filter @ez-kit/data-grid-shadcn typecheck test`; каждую новую ошибку разобрать: настоящий дефект колонок чинить в колонках, ослаблять тип нельзя
- [x] 3.2 Добавить в тесты одного кита (heroui) кейс сценария «Kit grid rejects an unknown id» / «accepts a built-in type»; проверить typecheck кита
- [x] 3.3 `pnpm --filter @ez-kit/docs typecheck`; разобрать каждую ошибку в примерах, как в 3.1; убедиться, что docs-переключатель (`shared/DataGrid.tsx`, `BoundDataGridProps` с default) не стал проверять. Все примеры остаются рабочими в браузере для затронутых файлов (оба кита)

## 4. Документация, ADR, changeset

- [x] 4.1 `custom-cell-types.mdx`: раздел «Type-safety» — inline-колонки bundle и кита проверяются, bare-грид пакета нет; per-grid `cellTypes` расширяет допустимые id. Исправить сниппет «…or per grid, with the `cellTypes` prop» так, чтобы он компилировался (колонки inline в том же grid); проверить сниппет пробой против собранных пакетов
- [x] 4.2 Создать `openspec/decisions/0016-bundle-types-inline-columns.md` (решения 1 и 2, замеры из 1.2 — ссылкой на тест/команду, без цифр, по правилам README ADR) и правило со ссылкой в AGENTS.md («Settled data-grid API decisions»); проверить `pnpm lint` (check-site-url, prettier)
- [x] 4.3 Changeset: `@ez-kit/data-grid-react` minor и `@ez-kit/data-grid-heroui` minor, текст с пометкой о breaking-изменении типов и путём миграции (передать реестр через `cellTypes` или собрать колонки builder-ом bundle); shadcn не указывать; проверить `scripts/check-changesets.mjs` через `pnpm lint`

## 5. Интеграция

- [x] 5.1 Повторить замер 1.2 на финальной реализации и записать в design.md; прогнать `pnpm verify:affected`, затем полный gate последовательно (`pnpm run ci`); всё зелёное

## Workflow follow-up

- Перед архивом убедиться, что ADR 0016 и правило в AGENTS.md на месте.
- Отдельно остаётся тема excess-check неизвестных слотов в `defineCellType`.
