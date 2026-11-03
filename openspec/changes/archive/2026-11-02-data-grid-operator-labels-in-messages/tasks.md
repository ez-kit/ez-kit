# Tasks

## 1. Слияние словаря на два уровня

- [x] 1.1 Тесты в `core/src/messages/resolve.test.ts` по design D4: `{ filtering: { presets: { today: 'Сегодня' } } }` сохраняет остальные пресеты английскими; функция-запись (`selection.count`) заменяется целиком, а не сливается; `{ filtering: { presets: undefined } }` ничего не стирает; проверить RED
- [x] 1.2 `resolveMessages` сливает вложенные простые объекты групп ещё на уровень; `PartialGridMessages` допускает частичные вложенные записи (явная двухуровневая форма, не `DeepPartial`); обновить docblock'и `resolve.ts` и `PartialGridMessages`; тесты 1.1 зелёные, `pnpm --filter @ez-kit/data-grid-core typecheck` зелёный

## 2. Группа `messages.operators` и разрешение подписи в core

- [x] 2.1 Тип `operators` в `GridMessages` по design D1 (`common: Record<FilterOperator, string>`, `date`, `boolean`) с docblock'ами, `OperatorLabelGroup`; английские записи в `defaults.ts` — те же строки, что сейчас в `definitions.ts`; `pnpm --filter @ez-kit/data-grid-core typecheck` зелёный
- [x] 2.2 Тесты `resolveOperatorLabel` в `core/src/features/operators/` по сценариям `specs/data-grid-filter-operators/spec.md`: явный `label` выигрывает; `labels: 'date'` даёт `After`; без группы — `common`; ни там ни там — id и одно предупреждение `warnOnce` на id; проверить RED
- [x] 2.3 `FilterOperatorDef.label?` и `labels?: OperatorLabelGroup` в `operators.ts`; `resolveOperatorLabel` там же, экспорт с главного entry рядом с `localizeDatePresets`; тесты 2.2 зелёные; `operator-def.types.test.ts` дополнен: определение без `label` проходит typecheck, `labels: 'text'` — нет
- [x] 2.4 Убрать `label` из всех определений `core/src/operators/definitions.ts`, поставить литерал `labels: 'date'` / `'boolean'` на шесть расходящихся определений; обновить docblock'и `definitions.ts` и `default-operators.ts` (рецепт «translated set» → словарь); тест в `default-operators.test.ts` (или рядом): у каждого определения нет `label`, для каждого `(def, defaultMessages.operators)` подпись совпадает с прежней английской; `pnpm --filter @ez-kit/data-grid-core test` зелёный

## 3. Подписи в React-слое и китах

- [x] 3.1 Тесты в `react/react/src/data-grid/` по спекам: грид без `messages` показывает `After` для `greaterThan` колонки `date` и `Greater than` для `number`; `messages: { operators: { common: { contains: 'Содержит' } } }` меняет кнопку, пункт меню и чип; тип `datetime` из набора дат даёт `After`; явный `label` выигрывает у словаря; `{ operators: { date: { greaterThan: 'Позже' } } }` оставляет `lessThan` `Before`; проверить RED
- [x] 3.2 Разрешение подписей в модели фильтра по design D3 (`ResolvedOperator` с `label: string`, стабильные ссылки по образцу `localizeDatePresets`); перевести на него `filter-model.ts`, `render-filter-input.tsx`, `active-filters-bar.tsx`; тесты 3.1 зелёные; `host-rerender-isolation.test.tsx` зелёный
- [x] 3.3 `OperatorSelect` shadcn и heroui читают разрешённую подпись (тип `label: string`, без `?? id` на месте); `pnpm verify:affected` зелёный (включая `@ez-kit/docs` с `registry-payload.test.ts`)

## 4. Словари `en` и `ru`

- [x] 4.1 `core/src/messages/en.ts` (`enMessages = defaultMessages`) и `core/src/messages/ru.ts` (`ruMessages: GridMessages`, полный литерал без spread, плюралы через `Intl.PluralRules('ru')`); тест: `enMessages === defaultMessages`; тест `ru`: каждая строковая запись непуста и не совпадает с английской, кроме допустимого списка (`of`, знаки), функции-записи склоняют `1 / 2 / 5` (`1 строка`, `2 строки`, `5 строк`); type-test: объект без одной записи не присваивается `GridMessages`
- [x] 4.2 Entry `messages/en` и `messages/ru` в `core/tsup.config.ts`, `exports` в `core/package.json`, бюджеты `size-limit` (реальный размер + ~15%); `pnpm --filter @ez-kit/data-grid-core build && pnpm --filter @ez-kit/data-grid-core size` зелёные
- [x] 4.3 `apps/docs/test/tree-shaking.test.ts`: `createTable` не достигает entry `messages/ru`; импорт `ruMessages` не тянет `operators`; ожидания для entry `operators` без английских подписей; `pnpm --filter @ez-kit/docs test -- tree-shaking` зелёный

## 5. Документация и решения

- [x] 5.1 `apps/docs/content/docs/data-grid/localization.mdx`: паки `enMessages` / `ruMessages`, `messages.operators` (`common`, `date`, `boolean`) вместо рецепта с переведённым набором, частичная правка пресетов, заметка о локали календаря кита (heroui — `I18nProvider`, shadcn — `locale` react-day-picker); пример `localization` переведён на `ruMessages` с одной правкой поверх; без внутренних комментариев в исходнике примера; `docs-option-names.test.ts` зелёный (классификация новых таблиц в `page-type-map.ts`)
- [x] 5.2 `apps/docs/content/docs/data-grid/filtering/operators.mdx`: `label` необязателен, порядок разрешения подписи, `labels`, раздел «Custom operators» — подпись в определении или в словаре; `docs-option-names.test.ts` зелёный
- [x] 5.3 ADR `openspec/decisions/0023-operator-labels-in-messages.md` по design D6; пометка в Context ADR 0005; строка в `AGENTS.md` (убрать «no `messages.operators`», добавить правило со ссылкой на 0023); docblock `core/src/messages/defaults.ts` про поставку словарей; проверить `grep -rn "messages.operators" AGENTS.md openspec/decisions` — нет утверждений, противоречащих 0023
- [x] 5.4 Changeset: minor `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` с секцией breaking (`label` необязателен, `defaultOperators` без подписей); без `@ez-kit/data-grid-shadcn`; `node scripts/check-changesets.mjs` зелёный

## 6. Интеграция

- [x] 6.1 Полный гейт последовательно: `pnpm run ci` зелёный
- [ ] 6.2 Ручная проверка в docs обоих китов: пример `localization` с `ruMessages` — переключатель оператора, меню, чип, пресеты дат, пагинация на русском; колонка `date` показывает «После»; скриншоты в описании PR

## Workflow follow-up

- После мержа: archive change, перенос `data-grid-messages` в `openspec/specs/`.
