# Tasks

Порядок внутри каждой задачи — TDD: сначала тест (красный), потом реализация (зелёный).
Пакеты: `R` = `packages/form/react/react`, `S` = `packages/form/react/shadcn`,
`H` = `packages/form/react/heroui`, `D` = `apps/docs`.

## 1. Контракт и типы в `@ez-kit/form-react`

- [x] 1.1 Убрать из рендер-пропсов в `R/src/contract.ts` `placeholder`, `type`, `rows`, `min`, `max`, `step` (Text, Number, Textarea, Select, MultiSelect, Slider, Date, DateRange) и импорт `TextInputType`; обновить докблок контракта. Проверка: `pnpm --filter @ez-kit/form-react typecheck` доходит только до ожидаемых ошибок в биндерах и рендерере схемы (их чинят группы 2 и 3).
- [x] 1.2 Завести в `R/src/field-registry.ts` рантайм-набор ключей биндинга для полей с опциями (`options`, `optionsFrom`, `optionsParams`, `loading`, `searchable`, `creatable`) рядом с `BASE_FIELD_PROP_KEYS`, сверенный с типом через `satisfies Record<keyof …, true>`. Проверка: тест в `field-registry.test.ts` на полноту набора, плюс ошибка компиляции при пропущенном ключе (`@ts-expect-error`-кейс).
- [x] 1.3 Ввести тип пропсов кита сверх контракта (`Omit<Parameters<C>[0], keyof <Field>RenderProps | ключи биндинга>`) и пересчитать `TextFieldProps` … `DateRangeFieldProps` и `BuiltInFieldComponents` в `R/src/field-props.ts` так, чтобы `form.<Field>` = пропсы биндинга & пропсы кита этого ключа из `TFields`; убрать `placeholder` / `type` / `rows` / `min` / `max` / `step` из `*FieldProps`. Проверка: новые кейсы в `R/src/field-types.test.tsx` — `autoComplete` компилируется с компонентом, принимающим `ComponentProps<'input'>`; `variant` компилируется только с компонентом, который его объявил; `variant='outlined'` вне юниона кита — ошибка; `onChange` / `value` на `form.TextField` — ошибка; юнион `SelectField` (string/number) сохраняет корреляцию `name` ↔ `options` с пропсами кита.
- [x] 1.4 Проверить вывод для полей записи массива и группы (`ArrayItemScope`, группы) и для набора по умолчанию `AllFormFieldSlots`. Проверка: кейсы в `R/src/array-types.test.tsx` и `R/src/composition-types.test.tsx` — `item.TextField autoComplete` компилируется с китом, принимающим его; с `AllFormFieldSlots` пропсов сверх биндинга нет.
- [x] 1.5 Проверить правило «пропсы кита сверх контракта только опциональные». Проверка: кейс в `field-types.test.tsx` — набор с `TextField`, требующим `icon`, не проходит `satisfies FormFieldSlots` (`@ts-expect-error`).

## 2. Биндеры двенадцати встроенных полей

- [x] 2.1 Переписать `R/src/fields/{text,number,textarea,checkbox,switch,slider,date,date-range}-field.tsx`: биндер забирает базовые ключи, остальное (`rest`) передаёт киту, вычисленные пропсы кладёт после `rest`. Проверка: тесты в `R/src/create-form.test.tsx` с тестовым китом (`R/src/test-kit.tsx`) — произвольный пропс (`autoComplete`, `data-testid`, `variant`) доходит до компонента; `placeholder` / `min` / `rows` доходят как раньше.
- [x] 2.2 То же для полей с опциями `R/src/fields/{select,multi-select,radio-group,checkbox-group}-field.tsx`: ключи опций остаются у биндинга, `rest` — киту. Проверка: тесты в `R/src/option-sources.test.tsx` / `R/src/searchable-select.test.tsx` — `optionsFrom` не доходит до кита, а `placeholder` и посторонний пропс доходят.
- [x] 2.3 Приоритет вычисленных пропсов в рантайме. Проверка: тест, где `onChange` / `value` / `id` / `data-field` передаются в обход типов (`as never`), и кит получает значения биндинга.
- [x] 2.4 Проброс в записи массива и в группе. Проверка: тесты в `R/src/array-field.test.tsx` и `R/src/field-groups.test.tsx` — `item.TextField autoComplete='…'` доходит до кита.
- [x] 2.5 Стабильная идентичность `rest` не нужна (у встроенных полей нет мешка `props`), но спред не должен ломать мемоизацию кита сильнее, чем сейчас. Проверка: существующие тесты `R` проходят — `pnpm --filter @ez-kit/form-react test`.

## 3. Рендерер схемы

- [x] 3.1 В `R/src/schema/render-node.tsx` передать `placeholder`, `rows`, `min`, `max`, `step` и `inputType` → `type` как пропсы кита через один локальный мешок атрибутов узла с явным приведением и комментарием «временно до переделки SchemaForm». Проверка: тест в `R/src/schema/schema-form.test.tsx` — узел `{ type: 'text', placeholder, inputType: 'email' }` даёт киту `placeholder` и `type='email'`; `pnpm --filter @ez-kit/form-react typecheck` зелёный.

## 4. Удаление `TextInputType` из React-поверхности

- [x] 4.1 Убрать `TextInputType` из реэкспорта `R/src/index.ts` и из импортов `R/src/field-props.ts`; в `@ez-kit/form-core` оставить. Проверка: `grep -rn TextInputType packages/form/react/react/src` пуст, кроме тестов схемы; `pnpm --filter @ez-kit/form-react build typecheck test` зелёный.

## 5. Кит shadcn

- [x] 5.1 Переписать поля в `S/src/blocks/{fields,date,select,multi-value}.tsx`: каждый компонент объявляет пропсы `<Field>RenderProps & <пропсы кита>` (для инпутов — нативные атрибуты целевого элемента без управляемых ключей), явно разбирает пропсы оформления для `FieldShell`, а `rest` кладёт на элемент управления. `placeholder` / `type` / `rows` / `min` / `max` / `step` объявлены в пропсах кита. Проверка: `pnpm --filter @ez-kit/form-shadcn typecheck`; тесты в `S/src/index.test.tsx` и `S/src/remaining-fields.test.tsx` — `type='password'`, `autoComplete`, `inputMode`, `maxLength` оказываются на `<input>`.
- [x] 5.2 Экспортировать тип пропсов кита для каждого поля (`<Field>KitProps`, без коллизии с реэкспортированными `<Field>Props` из `@ez-kit/form-react`) и убрать реэкспорт `TextInputType` из `S/src/index.ts`. Проверка: `pnpm --filter @ez-kit/form-shadcn build test` зелёный; `grep TextInputType packages/form/react/shadcn/src` пуст.

## 6. Кит HeroUI

- [x] 6.1 Переписать поля в `H/src/blocks/{fields,date,select,multi-value,searchable-select,searchable-multi-select}.tsx`: пропсы кита соответствуют раскладке — атрибуты, которые React Aria принимает на корне (`type`, `autoComplete`, `inputMode`, `maxLength`, …), идут на корень, `placeholder` — на `<Input>`. Проверка: `pnpm --filter @ez-kit/form-heroui typecheck`; тесты в `H/src/index.test.tsx` и `H/src/remaining-fields.test.tsx` — `type='password'`, `autoComplete`, `placeholder` оказываются на `<input>`.
- [x] 6.2 Экспортировать `<Field>KitProps` и убрать реэкспорт `TextInputType` из `H/src/index.ts`. Проверка: `pnpm --filter @ez-kit/form-heroui build test` зелёный; `grep TextInputType packages/form/react/heroui/src` пуст.

## 7. Документация и примеры

- [x] 7.1 Заменить `TextInputType.X` на строку во всех примерах `D/shared/form/examples/components/*.tsx` и в `D/shared/form/FormKit.tsx`; в JSON-документах схемы оставить `inputType`. Проверка: `pnpm --filter @ez-kit/docs typecheck` зелёный; `grep -rn "TextInputType" apps/docs/shared` находит только документы схемы.
- [x] 7.2 Обновить страницы `form/fields`, `form/getting-started`, `form/installation/{shadcn,heroui}`, `form/composition`, `form/server-actions`: `type='password'` вместо enum, раздел «Shared props» плюс новый раздел о пропсах кита (всё прочее доходит до кита; набор зависит от кита). В getting-started убрать `TextInputType` из сниппета. Проверка: `grep -rn "TextInputType" apps/docs/content/docs/form` находит только примеры документов схемы.
- [x] 7.3 Обновить `form/custom-kit.mdx`: таблица «Per-kind props» без атрибутов инпутов, раздел о том, как кит объявляет свои пропсы, что они должны быть опциональными, и что вычисленные пропсы побеждают; в `form/custom-fields.mdx` — одна строка о разнице с мешком `props`. Проверка: страницы рендерятся на `pnpm docs:dev`, ссылки в них открываются.
- [x] 7.4 Перевести таблицы `form.SliderField` / `form.DateField` в `D/test/docs-options/page-type-map.ts` на типы кита (`<Field>KitProps` из `@ez-kit/form-shadcn`, новый `TypeModule`) и обновить ожидаемые счётчики. Проверка: `pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts` зелёный.

## 8. Релиз и полный прогон

- [x] 8.1 Добавить changeset: major для `@ez-kit/form-react`, `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`, с миграцией (`TextInputType.X` → строка; внешний кит объявляет `placeholder` / `type` / `rows` / `min` / `max` / `step` сам). Проверка: `node scripts/check-changesets.mjs` зелёный.
- [x] 8.2 Свериться с бюджетами `size-limit` трёх пакетов и при сдвиге перенастроить по правилу «реальный размер + ~15%». Проверка: `pnpm size` зелёный.
- [x] 8.3 Полный прогон последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size`. Проверка: все пять зелёные.
- [x] 8.4 Проверить в браузере на `pnpm docs:dev` страницы `form/getting-started` и `form/fields` под обоими китами: пароль маскируется, примеры работают. Проверка: e2e `apps/docs/e2e/smoke.spec.ts` для примеров формы зелёный.

## Workflow follow-up

- Код-ревью изменения (`typescript-reviewer` + `react-reviewer`) до коммита.
- Архивировать изменение после мержа (`/opsx:archive`).
