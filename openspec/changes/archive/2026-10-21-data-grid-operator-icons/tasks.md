# Tasks

## 1. Core: реестр переопределений

- [x] 1.1 Отличать в `buildOperatorRegistry` переопределения таблицы от встроенных операторов (метка по ссылке, тип `OperatorRegistry` не меняется), а в `resolveColumnOperators` прогонять набор типа ячейки через переопределения и искать id из `items` в порядке «переопределение → набор типа → общий реестр»; без переопределений набор по умолчанию возвращается той же ссылкой; проверить тестами в `operators.test.ts` на четыре сценария требования «Реестр таблицы переопределяет встроенный оператор» (набор по умолчанию, колонка с `items`, все типы ячеек, без переопределений)
- [x] 1.2 Помечать объекты переопределений во внутреннем `WeakSet` и пропускать их в `localizeOperators`; inline-копия встроенного (`{ ...op, filterFn }`) по-прежнему локализуется; проверить тестами в `localize.test.ts`: переопределённый `contains` сохраняет `Похоже на`, inline-копия получает «Содержит», `fuzzy` сохраняет `Fuzzy`
- [x] 1.3 Переписать докстринг `TableOperatorsConfig` (переопределение действует на все типы ячеек и на наборы по умолчанию, подпись автора не локализуется); проверить: `grep -n "overrides of built-ins" packages/data-grid/core/src` указывает на исправленный текст, `pnpm --filter @ez-kit/data-grid-core typecheck` зелёный

## 2. Core: иконки и сообщение

- [x] 2.1 Добавить `icon?: unknown` в `FilterOperatorDef` с docblock'ом по образцу `SelectItem.icon` и экспортировать `DEFAULT_OPERATOR_ICONS: Record<FilterOperator, string>` со знаками из спеки; проверить тестом, что у каждого члена `FilterOperator` есть знак, и что `public-api` / `index` тесты core видят новый экспорт
- [x] 2.2 Добавить `filtering.operatorTrigger: (ctx: { label: string }) => string` в `GridMessages` и дефолт `Filter operator: ${label}`; проверить: тест сообщений даёт `Filter operator: Contains`, а словарь без этого ключа проходит typecheck
- [x] 2.3 Прогнать core целиком; проверить: `pnpm --filter @ez-kit/data-grid-core test typecheck lint` зелёные

## 3. React: опция `icons` и модель

- [x] 3.1 Добавить `UseDataGridConfig.icons?: GridIcons` (`{ operators?: Partial<Record<FilterOperatorId, ReactNode>> }`) с docblock'ом (ничего не включает, слои сливаются по id) и `ResolvedGridOptions.icons` (всегда объект); проверить тестами в `data-grid-options-context.test.tsx`: кит `equals` + `contains`, провайдер `contains` → у `equals` иконка кита, у `contains` провайдера; экземпляр главнее провайдера; `defaults: { icons }` без `filtering` не включает ни фильтров, ни операторов
- [x] 3.2 Ввести тип `FilterOperatorOption` и чистую `resolveOperatorIcon(def, icons)` (`def.icon` > `icons.operators[id]`; `DEFAULT_OPERATOR_ICONS` только по выбору через `icons.operators`), вызывать её в `resolveFilter` и типизировать `FilterModel.operators` и `OperatorSelectProps.operators` через `FilterOperatorOption`; проверить тестами в `filter-model.test.tsx` сценарии «Встроенный оператор без настройки иконки не имеет», «Знак из опции грида в модели», «Пользовательский оператор без иконки», «Иконка оператора может быть элементом» и «Иконка оператора важнее опции грида»
- [x] 3.3 Подать `icons` в `resolveFilter` из `render-filter-input.tsx` и `filter-panel.tsx`, а в `active-filters-bar.tsx` убедиться, что чип переопределённого оператора показывает подпись автора; проверить тестом сценария «Автор переопределения сохраняет свою подпись» (переключатель и чип)

## 4. React: строка фильтра

- [x] 4.1 Перестроить `renderOperatorFilter`: каждая ветка (текст, cell-type, `filtering.component`, `between`, мультивыбор) рендерит переключатель первым ребёнком `filter-control`; мультивыбор заворачивается в `filter-control`; переключатель — в `<div data-slot="filter-operator">` для стилей китов (тултип с полной подписью рисует кит); проверить тестами в `render-filter-input.test.tsx`, что в каждой ветке кнопка оператора — первый ребёнок `[data-slot='filter-control']` и вне него операторов нет
- [x] 4.2 Для `none` рендерить в `filter-control` переключатель и `<span data-slot="filter-operator-label">` с подписью оператора; проверить тестом сценарий «Переход на „пусто“» и тем, что колонка без операторов не получает кнопку
- [x] 4.3 Обновить test-utils kit (`OperatorSelect` как кнопка + меню с `aria-label` из `operatorTrigger`) и тесты, которые искали `combobox` оператора (`accessible-names.test.tsx`, `filters.test.tsx`, `filter-panel.test.tsx`, `cell-types-context.test.tsx`, `items-source.integration.test.tsx` и найденные `grep -rn "Filter operator" packages/data-grid/react/react/src`); проверить тестами сценариев «Имя по умолчанию», «Локализованное имя» и «Выбор оператора», затем `pnpm --filter @ez-kit/data-grid-react test typecheck lint` зелёные

## 5. Киты

- [x] 5.1 shadcn: переписать `OperatorSelect` на вендоренном `dropdown-menu` (`DropdownMenuRadioGroup`, `KIT_CLASS_NAME` на контенте) — кнопка с иконкой или обрезанной подписью, пункты «иконка + подпись», отмеченный текущий; в `styles.css` заменить `filter-control > *:first-child` правилом, которое растягивает контрол значения, и стилизовать `filter-operator-label`; проверить: `pnpm --filter @ez-kit/data-grid-shadcn test typecheck lint` зелёные и скриншот страницы операторов (shadcn) без отдельной строки под полями
- [x] 5.2 heroui: то же на HeroUI-меню с одиночным выбором (`KIT_CLASS_NAME` на поповере), убрать переопределения `TRIGGER_CLASS` / `INDICATOR_CLASS` `Select`, поправить `header-extras` / `filter-control` в `styles.css`; проверить: `pnpm --filter @ez-kit/data-grid-heroui test typecheck lint` зелёные и скриншот страницы операторов (heroui) с одинаковой высотой строк у колонок с операторами и без

## 6. Документация и релиз

- [x] 6.1 Обновить `apps/docs/content/docs/data-grid/filtering/operators.mdx`: новая раскладка, иконки по умолчанию, `icons.operators` в `createDataGrid({ defaults })` / провайдере / экземпляре, `icon` на собственном операторе, переопределение встроенного оператора на все типы ячеек; добавить пример с `icons` в манифест и `registry.ts` (без внутренних комментариев в исходнике); строки `icon` / `icons` в таблицы опций и счётчики в `page-type-map.ts`; проверить: `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный, пример открывается в обоих китах
- [x] 6.2 Обновить e2e, которые адресуют переключатель (`apps/docs/e2e/packages/data-grid/localization/messages.spec.ts` и найденные `grep -rn "operator" apps/docs/e2e`), и задать `operatorTrigger` в русском словаре docs-примера локализации; проверить: `e2e-slots.test.ts` зелёный, затронутые спеки проходят в обоих китах
- [x] 6.3 Написать changeset `minor` для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` (переключатель в строке поля, иконки и `icons`, `operatorTrigger`, переопределение встроенного оператора теперь работает и действует на все типы); проверить: `node scripts/check-changesets.mjs` зелёный

## 7. Интеграционная проверка

- [x] 7.1 Прогнать `pnpm verify:affected`, затем последовательно `build`, `lint`, `typecheck`, `test`, `size`; проверить, что все зелёные и `tree-shaking.test.ts` не видит новых точек входа
