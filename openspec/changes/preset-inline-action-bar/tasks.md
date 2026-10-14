# Tasks

## 1. Место панели в пресетах

- [x] 1.1 Переписать блок «the action bar» в `packages/data-grid/react/react/src/layouts/presets.test.tsx` под спек, по всем четырём пресетам (`it.each`): при `selection: { bar: 'inline' }` `[data-slot="action-bar"]` стоит после тулбара и раньше `[data-slot="table-wrapper"]`; в `FilterPanelLayout` с активным фильтром колонки — после `ActiveFiltersBar`; при `selection: true` и при `bar: 'floating'` — после `table-wrapper`; при каждом варианте ровно один `[data-slot="action-bar"]`. Тест «puts it above the table when a layout writes it first» заменить сценарием спека про `children` (панель после таблицы при `inline` остаётся после таблицы, и она одна); проверка — `pnpm --filter @ez-kit/data-grid-react exec vitest run src/layouts/presets.test.tsx` падает на inline-случаях
- [x] 1.2 Добавить тест смены варианта на лету: грид с пресетом и выделенной строкой перерисовывается через `rerender` с `selection.bar` `'floating'` → `'inline'` → `'floating'`; после каждого шага панель на своём месте, она одна, строка выделена, ошибок рендера нет; плюс проверка, что DOM-узел панели сохраняется при переезде (design, решение 3); проверка — тест падает до реализации
- [x] 1.3 Добавить внутренний хук `useActionBarSlots()` в `layouts/action-bar-slots.tsx`: читает `resolveActionBarVariant(useDataGridTable())` без подписки на состояние и возвращает `{ top, bottom }` с одним `<ActionBar key='action-bar' />` и `null` в другом слоте (design, решение 1); docblock объясняет, почему слоты, а не флаг или обёртка, и почему нет подписки; не экспортировать из `layouts/index.ts` и `src/index.ts`; проверка — `pnpm --filter @ez-kit/data-grid-react typecheck` проходит
- [x] 1.4 Перевести `DefaultLayout`, `BottomBarLayout`, `FilterPanelLayout`, `PopoverFiltersLayout` на `{actionBar.top}` / `{actionBar.bottom}` в позициях из design (решение 2), убрав прямой `<ActionBar />`; проверка — тесты из 1.1 и 1.2 зелёные. Если сохранение DOM-узла из 1.2 не держится, ослабить проверку до сохранения выделения и записать причину в docblock хука (design, решение 3)
- [x] 1.5 Переписать docblock'и, которые утверждают старое правило: абзац про action bar и рецепт `InlineBarLayout` в `layouts/default-layout.tsx` (рецепт ставит панель между `Toolbar` и `Table` и подаётся как способ поставить её в своей раскладке, а не как обязательный обход), обоснование места панели в docblock `FilterPanelLayout`, вступление к блоку в `presets.test.tsx`, docblock `resolveActionBarVariant` в `data-grid/action-bar-variant.ts` (вариант задаёт вид, а пресеты дополнительно учитывают его при выборе места); проверка — `grep -rn "GridShell\|below the table\|accepted cost" packages/data-grid/react/react/src` не находит утверждений, противоречащих новому поведению
- [x] 1.6 Убедиться, что `feature-optionality.test.tsx` и прочие тесты пакета не изменились по смыслу; проверка — `pnpm --filter @ez-kit/data-grid-react test` зелёный

## 2. Правило в AGENTS.md

- [x] 2.1 Переписать пункт «A layout places `ActionBar` itself, and `selection.bar.variant` does not» в разделе settled-решений `AGENTS.md` по design (решение 4): запрещены опции, существующие только ради расположения; пресет может учитывать режим из конфига, чтобы поставить элемент на его место (прецедент — `useToolbarControls` и `creating.mode`); своя раскладка решает сама; `GridShell` упоминается как история с указанием, чем он отличался (обёртка, отнимавшая порядок детей); фраза про «accepted cost … below the table» удалена; проверка — `grep -n "accepted cost is that" AGENTS.md` больше не находит фразу про `selection: { bar: 'inline' }`, а пункт сохраняет абзац про вид панели (`data-variant`) и про отклонённый проп `variant`

## 3. Документация и примеры

- [x] 3.1 Обновить раздел «The action bar» в `apps/docs/content/docs/data-grid/layout/presets.mdx`: при `inline` пресеты ставят панель между тулбаром и таблицей (в `FilterPanelLayout` — после полосы чипов, с причиной), при `floating` — последней; рецепт своей раскладки исправить (панель между `Toolbar` и `Table`) и подать как способ поставить панель иначе; проверка — `grep -n "below" apps/docs/content/docs/data-grid/layout/presets.mdx` не находит утверждения про inline под таблицей
- [x] 3.2 Обновить тот же абзац в `apps/docs/content/docs/data-grid/layout/composition.mdx` (около строк 96–100) и раздел «Inline» в `apps/docs/content/docs/data-grid/selection/action-bar.mdx` (пример `selection-bar-inline` теперь показывает панель сверху без своей раскладки); проверка — `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный, и в обоих файлах не осталось «write a layout of your own» как обязательного шага для `inline`
- [x] 3.3 Поправить docblock `apps/docs/shared/data-grid/examples/components/production/OrdersLayout.tsx` («A grid that asks for `selection: { bar: 'inline' }` writes it first instead — nothing places it for you»): это своя раскладка, поэтому место по-прежнему задаёт она, но утверждение «nothing places it for you» больше не верно для пресетов; проверка — текст не противоречит `presets.mdx`
- [x] 3.4 Второй проход по утверждениям, а не по идентификаторам (правило из `AGENTS.md`): `grep -rn -i "inline" apps/docs/content/docs/data-grid packages/data-grid/react --include='*.mdx' --include='*.md' --include='*.tsx' --include='*.ts'` и вычитать каждое место, где говорится, что inline-панель под таблицей или что для неё нужна своя раскладка; проверка — найденные места исправлены или явно относятся к своей раскладке
- [x] 3.5 Проверить пример `selection-bar-inline` в обоих китах: `pnpm docs:dev`, открыть `/examples/shadcn/selection-bar-inline` и `/examples/heroui/selection-bar-inline`, выделить строку; проверка — полоса появляется между тулбаром и таблицей, одна, Delete и Export работают

## 4. Changeset

- [x] 4.1 Добавить `.changeset/preset-inline-action-bar.md` с `'@ez-kit/data-grid-react': minor` и `'@ez-kit/data-grid-heroui': minor` (без shadcn), заголовок **Breaking: …**, описание нового места панели при `inline` и неизменного при `floating`, упоминание сдвига таблицы при первом выделении и рецепт для тех, кому панель нужна снизу (своя раскладка с `<DataGrid.ActionBar />` последним); проверка — `pnpm lint` проходит `check-changesets.mjs` и `check-site-url.mjs`

## 5. Гейт

- [x] 5.1 Прогнать `pnpm verify:affected`; проверка — lint, typecheck и test зелёные для `@ez-kit/data-grid-react`, обоих китов и `@ez-kit/docs`
- [x] 5.2 Прогнать e2e панели действий в обоих китах (`apps/docs/e2e/packages/data-grid/selection/*.spec.ts`); проверка — зелёные в `shadcn` и `heroui`

## Workflow follow-up

- Коммит `feat(data-grid)!: …` без атрибуции агента; PR в `develop`.
- Архивировать change после ревью и мержа.
