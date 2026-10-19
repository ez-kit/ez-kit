# Tasks

## 1. Core: опция, мета и сообщение

- [x] 1.1 Добавить `placeholder?: string` в `ColumnFilteringConfig` и `ColumnFilteringMeta` с docblock'ами (подсказка, а не имя; где показывается, где нет) и пробросить её через `setIfDefined` в `resolve-filtering.ts`; проверить юнит-тестом в core, что колонка и поле из `filtering.fields` с `placeholder: '10 цифр'` получают его в мете, а без опции ключа в мете нет
- [x] 1.2 Добавить `label: string` в `FilterPlaceholderContext` и сменить дефолт в `messages/defaults.ts` на `Filter ${label}…`; проверить: `resolve.test.ts` обновлён и зелёный, плюс тест, что словарь на `({ columnId })` по-прежнему проходит typecheck и даёт свой текст
- [x] 1.3 Добавить необязательный `placeholder?: string` в `FieldState` и `InputComponentProps` с docblock'ами (заполняется только фильтром); проверить: `pnpm --filter @ez-kit/data-grid-core typecheck` и `test` зелёные

## 2. React: модель и рендер фильтра

- [x] 2.1 В `resolveFilter` вычислять имя через `messages.filtering.placeholder({ columnId: target.id, label: target.label })` и отдавать `placeholder` в `FilterModel` (`filtering.placeholder ?? имя`); проверить: `filter-model.test.tsx` плюс два теста из спеки `data-grid-filter-model` (с подсказкой и без)
- [x] 2.2 В `render-filter-input.tsx` разделить имя и подсказку: `aria-label` / `VisuallyHiddenLabel` берут имя, видимый `placeholder` текстового инпута (plain и operator) берёт `model.placeholder`; проверить тестом в `render-filter-input.test.tsx`: placeholder `10 цифр`, accessible name `Filter ИНН…`
- [x] 2.3 Добавить `label?: string` в `MultiSelectFilterProps`, передавать в мультивыбор `label` = имя и `placeholder` = подсказку, обновить test-utils kit (`aria-label={label ?? placeholder}`); проверить тестом сценарий «Мультивыбор с подсказкой»
- [x] 2.4 Передавать `placeholder` в `FieldState` компонента cell-type (plain и operator) и в `InputComponentProps` для `filtering.component`; `BetweenInput` не трогать; проверить тестами «filtering.component получает подсказку» и «between игнорирует подсказку»
- [x] 2.5 Обновить тесты, которые ищут фильтры по старому `Filter <id>…` (`accessible-names.test.tsx`, `column-filter-debounce.test.tsx` и найденные `grep -rn "Filter [a-z]" packages/data-grid/react/react/src`), и добавить тест «Колонка с нестроковым заголовком»; проверить: `pnpm --filter @ez-kit/data-grid-react test` зелёный

## 3. Киты

- [x] 3.1 shadcn: `MultiSelectFilter` берёт `aria-label` из `label ?? placeholder`; `TextCellInput` и `NumberCellInput` ставят `placeholder` из `FieldState`; проверить: `pnpm --filter @ez-kit/data-grid-shadcn test typecheck lint` зелёные
- [x] 3.2 heroui: то же для `MultiSelectFilter`, `TextCellInput` и `NumberFilterInput` (через `placeholder` у `NumberField`); проверить: `pnpm --filter @ez-kit/data-grid-heroui test typecheck lint` зелёные

## 4. Документация и релиз

- [x] 4.1 Добавить строку `placeholder` в таблицу опций колонки в `apps/docs/content/docs/data-grid/filtering/index.mdx` (что показывает, что имя не меняется, какие контролы её игнорируют) и обновить счётчик имён этой таблицы в `page-type-map.ts`; проверить: `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный
- [x] 4.2 Показать `placeholder` в существующем docs-примере фильтрации (без внутренних комментариев в исходнике примера) и обновить e2e-спеки, которые ищут фильтр по старому тексту (`apps/docs/e2e/**`, начиная с `a11y/names.spec.ts`, `columns/cell-types.spec.ts`, `grouping.spec.ts`); проверить: `grep -rn "Filter [a-z][A-Za-z]*…" apps/docs/e2e` пуст или совпадает с заголовками, а затронутые спеки проходят в обоих китах
- [x] 4.3 Написать changeset `minor` для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` (новая опция, смена дефолтного текста `Filter <header>…`, `MultiSelectFilterProps.label` для внешних китов); проверить: `node scripts/check-changesets.mjs` зелёный

## 5. Интеграционная проверка

- [x] 5.1 Прогнать `pnpm verify:affected`, затем последовательно `build`, `lint`, `typecheck`, `test`, `size`; проверить, что все зелёные
