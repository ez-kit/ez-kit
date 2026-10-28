# form-field-props Specification

## Purpose

Определяет, как пропсы встроенного поля формы делятся между слоем биндинга и UI-китом: что поле
забирает себе, что передаётся компоненту кита, в каком виде и с каким типом.

## Requirements

### Requirement: Биндинг владеет только пропсами связи с формой

Встроенное поле SHALL забирать себе только `name`, `validate`, `required`, `label`, `description`,
`disabled`, а поле с опциями — ещё `options`, `optionsFrom`, `optionsParams`, `loading`,
`searchable`, `creatable`. Никакой другой пропс поле MUST NOT интерпретировать.

#### Scenario: Пропс вне списка не интерпретируется биндингом

- **WHEN** автор пишет `<form.TextField name='email' placeholder='you@example.com' />`
- **THEN** биндинг не читает `placeholder`, а компонент кита получает его без изменений

#### Scenario: Пропсы опций остаются у биндинга

- **WHEN** автор пишет `<form.SelectField name='role' optionsFrom='roles' />`
- **THEN** компонент кита получает разрешённые `options` и `loading`, а не `optionsFrom`

### Requirement: Остальные пропсы передаются киту плоско

Любой пропс, написанный автором на `form.<Field>` и не принадлежащий биндингу, SHALL доходить до
компонента кита этого поля как пропс верхнего уровня с тем же именем и тем же значением.

#### Scenario: Нативный атрибут доходит до кита

- **WHEN** автор пишет `<form.TextField name='email' autoComplete='email' inputMode='email' />`
- **THEN** компонент кита получает `autoComplete='email'` и `inputMode='email'`

#### Scenario: Пропс, который объявил только кит, доходит до кита

- **WHEN** приложение регистрирует свой `TextField`, принимающий `variant`, и автор пишет
  `<form.TextField name='email' variant='bordered' />`
- **THEN** этот компонент получает `variant='bordered'`

#### Scenario: Поле в массиве и в группе передаёт пропсы так же

- **WHEN** автор пишет `<item.TextField name='city' autoComplete='address-level2' />` внутри записи
  массива или поля группы
- **THEN** компонент кита получает `autoComplete='address-level2'`

### Requirement: Вычисленные пропсы биндинга нельзя перебить

Пропсы, которые вычисляет биндинг (`value`, `onChange`, `onBlur`, `id`, `name`, `errors`,
`invalid`, `required`, `data-field`, `data-field-type`, `data-form-id`, а у полей с опциями —
`options`, `loading`, `search`), SHALL иметь приоритет над одноимёнными пропсами автора.

#### Scenario: Попытка передать вычисляемый ключ отклоняется типами

- **WHEN** автор пишет `<form.TextField name='email' onChange={handler} />`
- **THEN** это ошибка компиляции

#### Scenario: Вычисленное значение побеждает в рантайме

- **WHEN** вычисляемый ключ всё же доходит до поля в обход типов
- **THEN** компонент кита получает значение биндинга, а не автора

### Requirement: Тип пропсов кита выводится из его компонента

Пропсы `form.<Field>` SHALL типизироваться как пропсы биндинга этого поля плюс все пропсы
параметра компонента кита, зарегистрированного под этим ключом, кроме рендер-пропсов контракта.
Объявлять их отдельно (фантомом, хелпером) MUST NOT требоваться.

#### Scenario: Пропс, который кит не принимает, отклоняется

- **WHEN** зарегистрированный `TextField` не принимает `variant`, и автор пишет
  `<form.TextField name='email' variant='bordered' />`
- **THEN** это ошибка компиляции

#### Scenario: Тип пропса берётся из кита

- **WHEN** кит объявляет `variant?: 'flat' | 'bordered'`, и автор пишет `variant='outlined'`
- **THEN** это ошибка компиляции

### Requirement: Пропсы кита сверх контракта опциональны

Компонент, регистрируемый под встроенным ключом, SHALL принимать каждый пропс сверх рендер-пропсов
контракта как необязательный. Компонент с обязательным пропсом сверх контракта MUST NOT проходить
проверку набора полей.

#### Scenario: Обязательный пропс сверх контракта отклоняется

- **WHEN** набор полей кита содержит `TextField` с обязательным пропсом `icon` и проверяется
  через `satisfies FormFieldSlots`
- **THEN** это ошибка компиляции

### Requirement: Контракт не перечисляет атрибуты инпутов

Рендер-пропсы встроенных полей MUST NOT содержать `placeholder`, `type`, `rows`, `min`, `max`,
`step`. Кит, которому они нужны, SHALL объявлять их в своих пропсах. Тип `TextInputType` MUST NOT
экспортироваться из React-пакета формы и из UI-китов.

#### Scenario: Тип инпута задаётся строкой

- **WHEN** автор пишет `<form.TextField name='password' type='password' />` с китом shadcn или
  HeroUI
- **THEN** это компилируется без импорта, и инпут рендерится с `type="password"`

#### Scenario: Пользователи наших китов сохраняют прежние пропсы

- **WHEN** автор пишет `placeholder`, `rows`, `min`, `max` или `step` на поле shadcn или HeroUI
- **THEN** код компилируется и рендерит то же, что до изменения

### Requirement: Документ схемы передаёт ключи узла как пропсы кита

Рендерер схемы SHALL передавать ключи узла поля `placeholder`, `rows`, `min`, `max`, `step` киту
под теми же именами, а `inputType` — под именем `type`. Формат документа MUST NOT меняться.

#### Scenario: Ключи узла доходят до кита

- **WHEN** документ содержит `{ type: 'text', name: 'email', placeholder: 'you@example.com', inputType: 'email' }`
- **THEN** компонент кита `TextField` получает `placeholder='you@example.com'` и `type='email'`
