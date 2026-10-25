# Proposal

## Why

Документ формы и JSX описывают одну форму, но называют её части по-разному:

- блок документа резолвится из отдельного пропа `blocks` у `SchemaForm`, а компонент в JSX — из
  `components` сборки. Одну и ту же карточку приходится регистрировать дважды;
- блок получает пропсы обёрткой `{ props }`, а тот же компонент в JSX — плоско;
- контейнер в документе — только узел `section`, кнопка отправки — только узел `submit`. Свой
  контейнер (`Card`, `Tabs`) в документ не поставить;
- колонки есть только у `section`, а `colSpan` вне секции молча ничего не делает;
- ключ перевода записывается как `{ key }`, и по документу не видно, что это перевод.

Черновик `specs/010-schema-form/draft.md` (D19–D22) предлагает свести документ к JSX, записанному
данными. Этот change реализует его одним разом: формат ломается один раз, а не на каждом шаге.

## What Changes

- **BREAKING. Один реестр (D20).** Блок `{ type: 'block', component: 'X' }` ищется в `components`
  сборки, как `form.X` в JSX. Проп `blocks` у `SchemaForm` и тип `BlockRegistry` удаляются.
  `ParseOptions.blocks` переименовывается в `ParseOptions.components`.
- **BREAKING. Блок — это JSX данными.** Компонент получает `props` узла плоско, под теми же именами,
  что в JSX. Значение пропа вида `{ i18n }` переводится. У узла `block` больше нет `label`,
  `description` и `disabledWhen`.
- **BREAKING. Блок может быть контейнером (D21).** У `block` появляются `children`. Узлы `section` и
  `submit` удаляются: вместо них блоки `Section` и `SubmitButton` из `components`. Имена `section`,
  `submit` и `step` остаются зарезервированными, парсер отклоняет такие узлы с подсказкой, чем
  заменить.
- **BREAKING. Колонки на любом контейнере (D22).** `columns` (1–4) задаётся на любом узле с детьми:
  на блоке, на `array`, на корне документа. Рендерер сам вставляет сетку внутрь контейнера.
  `colSpan` у узла, чей родитель без `columns`, — ошибка парсера.
- **BREAKING. Сетка — пара `Grid` / `Grid.Item` в `components` (D19).** Она заменяет `GridItem`.
  `Section` теряет `columns`. В JSX сетка пишется как `form.Grid` / `form.Grid.Item`.
- **BREAKING. Ключ перевода — `{ i18n }`.** `LocalizedText` становится
  `string | { i18n: string; params? }` везде, где он принимался. Функция и проп `translate` не
  меняются.
- Миграции формата нет, `version` остаётся `1`: пакеты в 0.x, внешних потребителей формата нет.

## Capabilities

### New Capabilities

- `form-schema-blocks`: как документ формы описывает раскладку — блоки из `components` с
  плоскими пропсами и детьми, колонки на контейнерах, перевод через `{ i18n }` — и что из этого
  проверяет парсер.

### Modified Capabilities

## Impact

- `@ez-kit/form-core`: `schema.ts` (`BlockNode` с `children` / `columns`, удаление `SectionNode` и
  `SubmitNode`, `columns` на корне и на `array`), `walk.ts` (блок с детьми — контейнер),
  `parse.ts` (проверки блоков, колонок, `colSpan`, `{ i18n }`, отклонение удалённых узлов),
  `localized-text.ts`, экспорты `index.ts`.
- `@ez-kit/form-react`: `schema/render-node.tsx`, `schema/render-children.tsx`,
  `schema/required-components.ts`, `schema/registries.ts`, `schema/schema-form.tsx`,
  `create-schema-form.tsx`, контракт (`contract.ts`, `field-props.ts`: `SectionProps`, `GridProps`,
  `GridItemProps`, слот `Grid`), `test-kit.tsx`, экспорты.
- `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`: `blocks/layout.tsx` (`Section` без сетки, новый
  `Grid` с `Grid.Item`), `sets.ts`, `index.ts`, тесты.
- Документация: страницы `form/schema.mdx`, `layout.mdx`, `custom-kit.mdx`, `examples.mdx`,
  `custom-fields.mdx`, `arrays/api.mdx`, `server-actions.mdx`; около двадцати примеров в
  `apps/docs/shared/form/examples`; `page-type-map.ts`; README пакетов.
- Спеки: `specs/010-schema-form/draft.md` отмечается реализованным в D19–D22 с принятыми здесь
  поправками.
- Релиз: minor-changeset с пометкой Breaking для `@ez-kit/form-core`, `@ez-kit/form-react`,
  `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`.
- Вне рамок:
  - шаги в документе (вернутся поверх `form.Steps` отдельным change);
  - перевод значений во вложенных объектах и массивах внутри `props`;
  - вынос логики раскладки в `form-core` (009 §6).
