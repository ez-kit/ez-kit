# Proposal

## Why

Встроенные поля формы (`form.TextField` и ещё одиннадцать) принимают фиксированный, перечисленный
нами список пропсов, и всё, чего в нём нет, теряется ещё на уровне типов: `autoComplete`,
`inputMode`, `maxLength`, HeroUI-шный `variant` передать нельзя. Чтобы хоть как-то покрыть
тип инпута, контракт завёл enum `TextInputType` — то есть пакет биндинга пытается перечислить за
UI-кит решения, которые принадлежат киту. Проект, подставивший в `createForm({ fields })` свой
`TextField` со своими пропсами, сейчас не может их использовать через `form.TextField`.

## What Changes

- Встроенное поле владеет только тем, что нужно для связи с формой: `name`, `validate`,
  `required`, общий словарь `label` / `description` / `disabled`, а у полей с опциями —
  `options`, `optionsFrom`, `optionsParams`, `loading`, `searchable`, `creatable`.
- Всё остальное, что автор пишет на `form.<Field>`, передаётся компоненту кита **плоско**, без
  перечисления. Тип этих пропсов выводится из параметров компонента, переданного в
  `createForm({ fields })` — сверх рендер-пропсов контракта.
- Вычисленные биндингом пропсы (`value`, `onChange`, `onBlur`, `id`, `name`, `errors`, `invalid`,
  `required`, `data-*`) кладутся после пропсов автора и не могут быть им перебиты; ключи, которыми
  владеет биндинг, вырезаны из типа пропсов кита.
- **BREAKING** — из рендер-пропсов контракта уходят `placeholder` (Text, Number, Textarea,
  Select, MultiSelect, Date, DateRange), `type` (Text), `rows` (Textarea), `min` / `max` / `step`
  (Number, Slider), `min` / `max` (Date, DateRange). Внешний кит, читавший их из контракта, должен
  объявить их в своих пропсах сам. Наши `@ez-kit/form-shadcn` и `@ez-kit/form-heroui` объявляют
  их, так что JSX их пользователей не меняется.
- **BREAKING** — `TextInputType` уходит из React-контракта, из `TextFieldProps` и из реэкспортов
  `@ez-kit/form-react` и обоих китов. `type={TextInputType.Password}` становится
  `type='password'`. Enum остаётся в `@ez-kit/form-core` только как тип `inputType` узла схемы.
- `SchemaForm` и формат документа не меняются: рендерер схемы передаёт существующие ключи узла
  (`placeholder`, `inputType` → `type`, `rows`, `min`, `max`, `step`) как пропсы кита.

## Capabilities

### New Capabilities

- `form-field-props`: разделение пропсов встроенного поля формы между биндингом и UI-китом — что
  поле забирает себе, что и в каком виде доходит до компонента кита, и как выводится их тип.

### Modified Capabilities

## Impact

- `@ez-kit/form-react`: `contract.ts` (рендер-пропсы двенадцати полей), `field-props.ts`
  (пропсы `form.<Field>`, `BuiltInFieldComponents`), двенадцать биндеров в `fields/`,
  `schema/render-node.tsx`, реэкспорт `TextInputType` из `index.ts`.
- `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`: компоненты полей объявляют свои пропсы сверх
  контракта и раскладывают их по элементам; убирается реэкспорт `TextInputType`.
- Документация: `form/fields`, `form/custom-kit`, `form/getting-started`,
  `form/installation/{shadcn,heroui}`, `form/composition`, `form/server-actions`, примеры в
  `apps/docs/shared/form/examples`; классификация таблиц в
  `apps/docs/test/docs-options/page-type-map.ts`.
- Релиз: major-changeset для `@ez-kit/form-react`, `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`.
- Вне рамок: формат документа `SchemaForm` и судьба `inputType` / `TextInputType` в core;
  `PasswordField` / `SearchField` (теперь решение кита, а не контракта).
