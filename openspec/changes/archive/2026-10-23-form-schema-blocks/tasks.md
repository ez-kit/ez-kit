# Tasks

Порядок внутри каждой задачи — TDD: сначала тест (красный), потом реализация (зелёный).

Пакеты:

- `C` = `packages/form/core`;
- `R` = `packages/form/react/react`;
- `S` = `packages/form/react/shadcn`;
- `H` = `packages/form/react/heroui`;
- `D` = `apps/docs`.

Между правками — `pnpm verify:affected`. `C` нужно собрать (`pnpm --filter @ez-kit/form-core build`),
прежде чем `R` увидит новые типы.

## 1. `{ i18n }` вместо `{ key }`

- [x] 1.1 Тесты в `C/src/localized-text.test.ts` и `C/src/parse.test.ts`: `{ i18n, params }`
      переводится; `{ key }` отклоняется парсером как неверный `LocalizedText`. Проверка: красные.
- [x] 1.2 `C/src/localized-text.ts` (тип, `resolveText`, сообщение), `assertLocalizedText` в
      `C/src/parse.ts`. Перевести на `{ i18n }` все тесты `C`, `R`, `S`, `H`, которые пишут
      `{ key }`. Проверка: `C`, `R`, `S`, `H` зелёные.

## 2. Узлы документа в `form-core`

- [x] 2.1 Типовые тесты в `C/src/schema-types.test.ts`: `BlockNode` принимает `children`,
      `columns`, `colSpan`, `when`; не принимает `label`, `description`, `disabledWhen`;
      `{ type: 'section' }` и `{ type: 'submit' }` не являются `FormNode`; `FormSchema` и
      `ArrayNode` принимают `columns`. Проверка: красные (`tsc`).
- [x] 2.2 `C/src/schema.ts`: разделить `CommonProps`, новый `BlockNode`, удалить `SectionNode` и
      `SubmitNode` (и их экспорты из `C/src/index.ts`), `columns` на `FormSchema` и `ArrayNode`.
      `RESERVED_NODE_TYPES` не меняется, комментарий объясняет, почему `section` и `submit`
      остаются в нём.
- [x] 2.3 Тест в `C/src/walk.test.ts`: блок с детьми обходится как контейнер, его дети получают
      блок в списке предков; блок без детей — лист. `C/src/walk.ts`: `hasChildren` определяет
      контейнер по наличию массива `children` у `block` и по `array`, а не по набору типов.
      Проверка: `walk`, `visibility`, `validate` зелёные; добавить тест в `C/src/visibility.test.ts`
      — поле внутри скрытого блока скрыто.

## 3. Парсер

- [x] 3.1 Тесты в `C/src/parse.test.ts` на каждое правило из требования «Парсер проверяет
      раскладку»: неизвестный `component` по `ParseOptions.components`; `component: 'Grid'`; `section` / `submit` /
      `step` с подсказкой; `label` / `description` / `disabledWhen` на блоке; `props.children`
      вместе с узловыми `children`; `columns` на поле и на блоке без детей; `colSpan` без
      `columns` у ближайшего контейнера (блок, `array`, корень); `{ i18n }` в `props` без
      `translate`. Плюс положительные: блок-контейнер с колонками, колонки на корне и на `array`.
      Проверка: красные.
- [x] 3.2 Реализация в `C/src/parse.ts`: `ParseOptions.blocks` → `components`,
      `assertNoReservedCollision` только по `fieldTypes`, проверки выше. Проверка: зелёные.

## 4. Контракт кита: `Section`, `Grid`

- [x] 4.1 Типовые тесты в `R/src/form-types.test.tsx` / `R/src/create-form-options.test.tsx`:
      `components: { Grid }` даёт `form.Grid` и `form.Grid.Item`; `Grid` без `Item` не проходит
      `satisfies FormComponents`; `Section` с пропом `columns` — ошибка. Проверка: красные.
- [x] 4.2 `R/src/field-props.ts` (`SectionProps` без `columns`, `GridProps`, `GridItemProps`) и
      `R/src/contract.ts` (`GridSlot`, `FormComponents` с `Grid` вместо `GridItem`), переутверждение
      в `R/src/create-form.tsx`, экспорты `R/src/index.ts`. Тестовый кит `R/src/test-kit.tsx`:
      `Section` без сетки, `Grid` с `Grid.Item`. Обновить `R/src/layout-parts.test.tsx` под
      `form.Grid`. Проверка: `R` зелёный.

## 5. Рендер документа

- [x] 5.1 Тесты в `R/src/schema/` (новый `blocks.test.tsx`, правки `sections.test.tsx`,
      `registries.test.tsx`, `missing-components.test.tsx`, `layout-contract.test.tsx`,
      `schema-form.test.tsx`, `arrays.test.tsx`):
  - блок резолвится из `components`, тот же компонент доступен как `form.X`;
  - пропсы приходят плоско, `{ i18n }` переводится, строка — нет;
  - лист-блок `SubmitButton` с `props.children`;
  - блок с детьми передаёт отрендеренных детей; скрытый блок скрывает и не валидирует поддерево;
  - `columns` на блоке, корне и `array` оборачивает детей в `Grid` / `Grid.Item`;
  - блок `Grid` — ошибка до первого рендера;
  - отсутствующий компонент блока и отсутствующий `Grid` — ошибка до первого рендера, в том числе
    для скрытого узла;
  - `component: 'toString'` не находится.

  Проверка: красные.

- [x] 5.2 Реализация: `resolveBlockProps` в `R/src/schema/`, ветка `block` в `render-node.tsx`,
      `renderChildren` с `columns` и `Grid`, корень в `schema-form.tsx`, записи `array`,
      `assertDocumentComponents` и `MissingComponentMessage` в `required-components.ts`. Удалить
      ветки `section` / `submit`, проп `blocks`, `BlockRegistry`, `RenderNodeContext.blocks`,
      `assertNoReservedFieldKeyCollision` и его вызов в `create-schema-form.tsx`, экспорт
      `BlockRegistry` из `R/src/index.ts`. Проверка: `R` зелёный.

## 6. Киты

- [x] 6.1 Тесты в `S/src/remaining-fields.test.tsx` и `H/src/remaining-fields.test.tsx`: документ с
      блоком `Section` и `columns: 2` рендерит заголовок, сетку (`data-slot='form-grid'`) и ячейки
      (`data-slot='form-grid-item'`); `index.test.tsx` — ключи `allFormComponents` равны
      `['Grid', 'Section', 'SubmitButton']`. Проверка: красные.
- [x] 6.2 `S/src/blocks/layout.tsx` и `H/src/blocks/layout.tsx`: `Section` без сетки, `Grid` с
      `Grid.Item` (классы колонок — литералами, как сейчас), `sets.ts`, `index.ts`. Проверка: `S`,
      `H` зелёные, `pnpm --filter @ez-kit/form-shadcn --filter @ez-kit/form-heroui lint typecheck`.

## 7. Документация и примеры

- [x] 7.1 Примеры в `D/shared/form/examples/components/`: перевести документы на блоки
      (`section` → `Section`, `submit` → `SubmitButton`), `{ key }` → `{ i18n }`, `blocks` →
      `components` сборки, JSX-примеры `form.GridItem` → `form.Grid` / `form.Grid.Item`.
      Затронутые файлы — все, что находит
      `grep -rlE "type: '(section|submit)'|blocks=|GridItem|key: '" D/shared/form`.
      Примеры не содержат внутренних комментариев.
- [x] 7.2 Страницы `D/content/docs/form/`: `schema.mdx` (таблица узлов, блоки, колонки, перевод,
      список ошибок парсера, опции `parseFormSchema`), `layout.mdx`, `custom-kit.mdx` (контракт
      `Section` / `Grid`), `examples.mdx`, `custom-fields.mdx`, `arrays/api.mdx`,
      `server-actions.mdx`. Второй проход — по описаниям поведения, а не только по именам: секция
      с колонками, кнопка как узел, отдельный реестр блоков.
- [x] 7.3 `D/test/docs-options/page-type-map.ts`: таблицы `SectionProps`, `GridProps`,
      `GridItemProps`, `ParseOptions`, опций `SchemaForm`. README пакетов `C`, `R`, `S`, `H`.
      Проверка: `pnpm --filter @ez-kit/docs test`, `node D/scripts/verify-manifest-coverage.mjs`.

## 8. Спека и changeset

- [x] 8.1 `specs/010-schema-form/draft.md`: отметить D19–D22 реализованными этим change и
      перенести «Отличия от черновика 010» из `design.md`.
- [x] 8.2 Changeset: minor с пометкой Breaking для `@ez-kit/form-core`, `@ez-kit/form-react`,
      `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`, с таблицей «было → стало» из
      `proposal.md`.

## 9. Интеграционная проверка

- [x] 9.1 Полный гейт последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm size`.
- [x] 9.2 e2e форм для обоих китов: `apps/docs/e2e/packages/form/**`.
- [x] 9.3 Ручная проверка в docs: страницы `form/schema`, `form/layout`, `form/examples` в обоих
      китах — секции, колонки, кнопка отправки, перевод в примере `schema-from-json`.
- [x] 9.4 Ревью отдельным агентом: `typescript-reviewer` и `react-reviewer` по `C`, `R`, `S`, `H`.
