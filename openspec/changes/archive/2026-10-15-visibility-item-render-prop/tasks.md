# Tasks

## 0. Ветка

- [x] 0.1 Создать ветку от свежего `develop` (не от `easylimeyep/data-grid-operators`); проверка — `git merge-base --is-ancestor origin/develop HEAD` и `git log origin/develop..HEAD` пуст

## 1. Render-prop у `DataGridVisibilityItem`

- [x] 1.1 Дописать в `packages/data-grid/react/react/src/data-grid/visibility-item.test.tsx` сценарии спека для режима функции: ровно один элемент с `data-slot="column-visibility-item"` на колонку и никаких элементов от компонента; `itemProps.ref` попадает в адаптер как ref sortable'а (через `nodes` дублёра); `handleProps` — `null` без адаптера, при `visibilityMenu.drag: false`, у колонки `ordering: false` и вне грида, и `{ ref }` у перетаскиваемой строки; индексы, которые регистрирует режим функции, совпадают с режимом `ReactNode` на том же гриде; `isDragging` и `data-column-dragging="true"` только у тащимой строки; проверка — `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/visibility-item.test.tsx` падает на новых случаях
- [x] 1.2 Реализовать режим функции по design (решение 1): `VisibilityItemRenderProps`, дискриминированное объединение пропсов (`className` запрещён вместе с функцией), callback-типы `ref`; обе внутренние ветки вызывают функцию и не рендерят элемент; `ColumnDragContext` в этом режиме не публикуется; docblock компонента описывает оба режима и почему контекст не используется; проверка — тесты 1.1 зелёные, существующие тесты файла не тронуты по смыслу
- [x] 1.3 Добавить тест на тип: `className` вместе с функцией — ошибка типа (`// @ts-expect-error` в тесте); проверка — `pnpm --filter @ez-kit/data-grid-react typecheck` проходит
- [x] 1.4 Экспортировать `VisibilityItemRenderProps` (как тип) рядом с `DataGridVisibilityItemProps` в `src/index.ts`; проверка — `pnpm --filter @ez-kit/data-grid-react build` и `apps/docs/test/tree-shaking.test.ts` зелёные

## 2. Клавиатурная защита коллекции

- [x] 2.1 Написать unit-тесты для `useColumnDragKeyboardGuard` в новом модуле рядом с `dnd/dragging-attrs.ts`: пока внутри узла есть элемент с `COLUMN_DRAGGING_ATTR`, `keydown` не доходит до пузырькового слушателя на узле и React-`onKeyDown` внутри; без такого элемента — доходит; слушатель снимается при смене/обнулении ref; проверка — тесты падают до реализации
- [x] 2.2 Реализовать хук по design (решение 2): нативный capture-слушатель, селектор из `dragging-attrs.ts`, никакого импорта drag-стека; docblock с причиной (RAC не пробрасывает `onKeyDownCapture`, порядок фаз); проверка — тесты 2.1 зелёные
- [x] 2.3 Экспортировать хук из `src/index.ts` и `src/kit.ts`; добавить кейс в `apps/docs/test/tree-shaking.test.ts`, что импорт хука из `./kit` не тянет адаптер и `DataGrid`; проверка — тест записывает и держит набор entry-point'ов

## 3. Активатор заблокированного элемента

- [x] 3.1 Дописать в `heroui/src/dnd.test.tsx` и `shadcn/src/dnd.test.tsx` случай: элемент, зарегистрированный с `disabled: true`, после рендера с настоящим адаптером не несёт `role`, `tabindex`, `aria-roledescription`, `aria-describedby`, `aria-pressed`, `aria-grabbed`, `aria-disabled`; незаблокированный по-прежнему несёт их на handle; проверка — тесты падают до реализации
- [x] 3.2 Реализовать в обоих адаптерах ленивый отсоединённый inert-узел как `handle` для `spec.disabled` и no-op `handleRef` наружу (design, решение 3), с docblock'ом и ссылкой на поведение плагина `@dnd-kit/dom@0.1.21`; правка shadcn — сознательная правка registry payload `data-grid-dnd`; проверка — тесты 3.1 зелёные, `apps/docs/test/registry-payload.test.ts` зелёный
- [x] 3.3 Прогнать существующие e2e перетаскивания в обоих китах (`apps/docs/e2e/packages/data-grid/ordering/*.spec.ts`, `sensors/keyboard-sensors.spec.ts`); проверка — зелёные, включая перетаскивание мимо заблокированной колонки (`id` в `column-panel-drag`)

## 4. Колоночная панель HeroUI на `GridList`

- [x] 4.1 Переписать тесты колоночной панели в `heroui/src/index.test.tsx` («draws a dialog of checkboxes…», «draws the panel for a drag-only panel…») под спек: `role="grid"` с `role="row"` на каждую колонку, строка — сам элемент с `data-slot="column-visibility-item"`; выбор строки вызывает `onToggle`; колонка с `canHide: false` недоступна для выбора и остаётся в списке; стрелки перемещения работают у такой колонки; простой переключатель по-прежнему меню; проверка — тесты падают до реализации
- [x] 4.2 Реализовать панель по design (решение 4): `items` + функция-ребёнок, `DataGridVisibilityItem` в режиме функции, грип-`Button` на `handleProps`, `Checkbox slot="selection"`, `MoveControls`, `ref` коллекции — `useColumnDragKeyboardGuard()`, `KIT_CLASS_NAME` на портале; убрать ставший ненужным импорт `ColumnDragHandle`, если он больше нигде в файле не используется; проверка — тесты 4.1 зелёные, `pnpm --filter @ez-kit/data-grid-heroui typecheck lint` зелёные
- [x] 4.3 Добавить e2e `apps/docs/e2e/packages/data-grid/ordering/column-panel-keyboard.spec.ts` (оба кита): `Space` на грипе, один `ArrowDown`, `Space` — строка сдвинулась ровно на одну позицию, один коммит, видимость колонок не изменилась; вне перетаскивания `ArrowDown` двигает фокус по строкам (только heroui, где панель — коллекция); проверка — зелёный в `shadcn` и `heroui`, и красный в `heroui` при временно отключённой защите
- [x] 4.4 Добавить в `apps/docs/e2e/packages/data-grid/a11y/` проверку axe по открытой колоночной панели примера `column-panel-drag` (оба кита) и проверку, что `th` заблокированной колонки не несёт `role="button"` / `aria-pressed`; проверка — зелёная в обоих китах
- [x] 4.5 Проверить, куда возвращается фокус после клавиатурного броска в панели HeroUI, и записать результат в docblock панели; если фокус теряется в непредсказуемое место, завести issue на английском и сослаться на него; проверка — запись есть

## 5. Документация

- [x] 5.1 Обновить `apps/docs/content/docs/data-grid/drag-and-drop/api.mdx` (строки таблиц про `<DataGrid.VisibilityItem>` и поверхность панели) и `drag-and-drop/columns.mdx`: режим функции для китов, чья панель — коллекция, `handleProps` вместо `<ColumnDragHandle />` в этом режиме, `useColumnDragKeyboardGuard` и зачем он нужен; пример кода без внутренних комментариев; проверка — `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный, при новой таблице опций — запись в `page-type-map.ts`
- [x] 5.2 Второй проход по утверждениям (правило `AGENTS.md`): `grep -rn "VisibilityItem\|column-visibility-item\|dialog of checkboxes" packages/data-grid/react apps/docs/content` и вычитать места, где говорится, что строка всегда `div` или что панель HeroUI — диалог чекбоксов; проверка — найденные места исправлены

## 6. Changeset и гейт

- [x] 6.1 Добавить `.changeset/visibility-item-render-prop.md`: `'@ez-kit/data-grid-react': minor` (режим функции, guard, исправление активатора), `'@ez-kit/data-grid-heroui': minor` (панель на `GridList`, изменение разметки, сохранённые `data-slot`); без shadcn; проверка — `pnpm lint` проходит `check-changesets.mjs` и `check-site-url.mjs`
- [x] 6.2 Прогнать `pnpm verify:affected`; проверка — lint, typecheck и test зелёные для `@ez-kit/data-grid-react`, обоих китов и `@ez-kit/docs`
- [x] 6.3 Прогнать полный гейт последовательно (`build`, `lint`, `typecheck`, `test`, `size`) и e2e колоночной панели и сенсоров в обоих китах; проверка — всё зелёное, `size-limit` в бюджете

## Workflow follow-up

- Ревью: `typescript-reviewer` и `react-reviewer` параллельно, `a11y-architect` по панели HeroUI.
- Коммит `feat(data-grid): …` без атрибуции агента; PR в `develop` на английском.
- Архивировать change после ревью и мержа.
