# Proposal

## Why

Готовые раскладки `@ez-kit/data-grid-react` ставят `<ActionBar />` последним ребёнком при любом
варианте панели. Для `selection: { bar: 'inline' }` это значит, что полоса в потоке документа
встаёт под пагинацией, вдали от строк, с которыми работает. Сейчас это записано как «accepted
cost»: потребитель, включивший `inline`, обязан писать свою раскладку. Но пресет обещает другое —
корректно показать грид, у которого фичи просто включены. Раскладка, которая на одной из двух
документированных форм панели даёт заведомо неудобный результат, этого обещания не выполняет.

## What Changes

- **BREAKING (поведение пресетов):** при `selection.bar.variant: 'inline'` все четыре пресета
  (`DefaultLayout`, `BottomBarLayout`, `FilterPanelLayout`, `PopoverFiltersLayout`) рисуют
  `ActionBar` между тулбаром и таблицей; в `FilterPanelLayout` — после `ActiveFiltersBar`, сразу
  над таблицей. Кто полагался на панель под таблицей, увидит её сверху.
- При `floating` (по умолчанию) порядок не меняется: панель последняя.
- В каждом пресете ровно один экземпляр `ActionBar`. Вариант читается из
  `resolveActionBarVariant(table)` одним общим хуком в `layouts/`, а не условием, скопированным в
  четыре файла.
- Смена варианта на лету (controlled `selection.bar`) переносит панель без ошибок и без потери
  выделения.
- Своя раскладка через `children` и раскладка, зарегистрированная потребителем как
  `core.Layout`, не меняются: место панели там задаёт автор.
- Правило в `AGENTS.md` («A layout places `ActionBar` itself, and `selection.bar.variant` does
  not») переформулируется: запрещены опции, которые существуют только ради расположения; пресет
  может ставить элемент туда, где ему место по режиму, который уже есть в конфиге. Docblock'и,
  тесты и документация, утверждающие обратное, обновляются.
- Рецепт «своя раскладка для `inline`» в документации исправляется: панель в нём стояла перед
  тулбаром, а должна стоять между тулбаром и таблицей. Он остаётся как пример для своих
  раскладок, но перестаёт быть обязательным обходом.
- Changeset: `minor` для `@ez-kit/data-grid-react` и `@ez-kit/data-grid-heroui` (её готовый
  `DataGrid` привязывает `DefaultLayout`) с пометкой **Breaking** — по прецеденту
  `presets-mount-only-entry-controls.md`. Пакеты в `0.x`, поэтому ломающее изменение идёт как
  minor (`0.10 → 0.11`).

## Capabilities

### New Capabilities

- `data-grid-layout-presets`: что готовые раскладки рисуют и в каком порядке, в зависимости от
  включённых фич и их режимов; начинается с расположения панели действий.

### Modified Capabilities

<!-- Нет: в openspec/specs пока нет ни одной спецификации. -->

## Impact

- Код: `packages/data-grid/react/react/src/layouts/*.tsx` (четыре пресета и новый общий хук),
  docblock'и `default-layout.tsx`, `layouts/index.ts`, `data-grid/action-bar-variant.ts`.
- Тесты: `layouts/presets.test.tsx` (блок «the action bar» переписывается).
- Документация: `apps/docs/content/docs/data-grid/layout/presets.mdx`,
  `layout/composition.mdx`, `selection/action-bar.mdx`; комментарий в
  `apps/docs/shared/data-grid/examples/components/production/OrdersLayout.tsx`. Пример
  `selection-bar-inline` автоматически покажет панель сверху.
- Правила репозитория: `AGENTS.md`.
- Кит shadcn не трогается и в changeset не входит (registry-пакет в `ignore`); его готовый
  `DataGrid` получит новое поведение через `@ez-kit/data-grid-react`.
- Публичный API (типы, экспорты, опции) не меняется.
