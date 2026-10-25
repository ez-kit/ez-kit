# form-schema-blocks Specification

## Purpose

Определяет, как документ формы (`FormSchema`) описывает раскладку: блоки из `components` сборки
с плоскими пропсами и детьми, колонки на контейнерах, перевод через `{ i18n }` — и что из этого
проверяет `parseFormSchema` до рендера.

## Requirements

### Requirement: Блок резолвится из components сборки

Узел `{ type: 'block', component: 'X' }` SHALL рендерить компонент `X` из `components`, переданных
в `createSchemaForm`, — тот же, что доступен в JSX как `form.X`. `SchemaForm` MUST NOT принимать
отдельный реестр блоков.

#### Scenario: Один компонент для JSX и документа

- **WHEN** сборка создана с `components: { Card }`, а документ содержит
  `{ type: 'block', component: 'Card' }`
- **THEN** документ рендерит `Card`, и в JSX тот же компонент доступен как `form.Card`

#### Scenario: Компонент не передан

- **WHEN** документ содержит блок `Card`, а в `components` его нет, даже если блок скрыт `when`
- **THEN** `SchemaForm` до первого рендера бросает ошибку, называющую `Card` и `components`

#### Scenario: Имя из Object.prototype

- **WHEN** документ содержит блок с `component: 'toString'`
- **THEN** компонент не находится, и `SchemaForm` бросает ту же ошибку отсутствующего компонента

### Requirement: Пропсы блока передаются плоско и переводятся

Компонент блока SHALL получать значения `props` узла как свои пропсы под теми же именами. Значение
верхнего уровня вида `{ i18n, params? }` MUST быть переведено через `translate` до передачи.
Строки MUST передаваться без изменений. Узловых `label`, `description` и `disabledWhen` у блока нет.

#### Scenario: Плоские пропсы

- **WHEN** блок `{ component: 'Section', props: { title: 'Адрес', tone: 'muted' } }`
- **THEN** `Section` получает `title='Адрес'` и `tone='muted'`

#### Scenario: Перевод значения в props

- **WHEN** блок `{ component: 'Section', props: { title: { i18n: 'address' } } }` и
  `translate={(k) => k.toUpperCase()}`
- **THEN** `Section` получает `title='ADDRESS'`

#### Scenario: Кнопка отправки как лист-блок

- **WHEN** блок `{ component: 'SubmitButton', props: { children: 'Отправить' } }`
- **THEN** рендерится `SubmitButton` кита с текстом «Отправить»

### Requirement: Блок с детьми — контейнер

Блок SHALL принимать `children` — узлы документа. Они рендерятся тем же рендерером и передаются
компоненту как `children`. `when` блока MUST скрывать всё поддерево: дети не рендерятся, не
валидируются и, без `keepHiddenValues`, не попадают в отправку.

#### Scenario: Поля внутри своего контейнера

- **WHEN** блок `Card` с `children: [{ type: 'text', name: 'city' }]`
- **THEN** поле `city` рендерится внутри `Card` и остаётся по пути `city` в значениях формы

#### Scenario: Скрытый контейнер

- **WHEN** блок с `when`, ложным для текущих значений, содержит обязательное поле
- **THEN** поле не рендерится и не блокирует отправку

### Requirement: Колонки задаются на контейнере

`columns` (1–4) SHALL быть допустим на блоке с детьми, на `array` и на корне документа. Если он
задан, рендерер MUST обернуть детей контейнера в `Grid` с этим числом колонок, а каждого ребёнка —
в `Grid.Item` с его `colSpan`. Контейнер получает уже разложенных детей. У `array` сетка
вставляется внутрь каждой записи.

#### Scenario: Секция в две колонки

- **WHEN** блок `Section` с `columns: 2` и двумя полями, второе с `colSpan: 2`
- **THEN** `Section` получает детей внутри `Grid columns={2}`, второе поле — в
  `Grid.Item colSpan={2}`

#### Scenario: Колонки на корне

- **WHEN** у документа `columns: 2` и поля на верхнем уровне
- **THEN** поля рендерятся внутри `Grid columns={2}` без промежуточного контейнера

#### Scenario: Сетка внутри записи массива

- **WHEN** у `array` задан `columns: 2`
- **THEN** поля каждой записи рендерятся в своей сетке из двух колонок

#### Scenario: Сетка не передана

- **WHEN** документ использует `columns`, а в `components` нет `Grid`
- **THEN** `SchemaForm` до первого рендера бросает ошибку, называющую `Grid`

### Requirement: Сетка в JSX — form.Grid и form.Grid.Item

Кит SHALL поставлять сетку одной парой `Grid` с `Grid.Item` под ключом `Grid` в `components`.
`Section` MUST NOT принимать `columns`. В JSX сетка доступна как `form.Grid` и `form.Grid.Item`.

#### Scenario: Секция с сеткой в JSX

- **WHEN** в JSX написано
  `<form.Section title='Адрес'><form.Grid columns={2}><form.Grid.Item colSpan={2}>…`
- **THEN** рендерится секция с заголовком, сеткой из двух колонок и ячейкой на две колонки

### Requirement: Ключ перевода записывается как { i18n }

`LocalizedText` SHALL быть строкой или объектом `{ i18n: string, params? }` во всех местах, где
документ принимает переводимый текст: подписи и описания полей, `validate.messages`, подписи
опций, значения `props` блока.

#### Scenario: Перевод подписи поля

- **WHEN** поле с `label: { i18n: 'signup.email' }` и переданный `translate`
- **THEN** кит получает переведённую строку

#### Scenario: Старый вид ключа

- **WHEN** документ содержит `label: { key: 'signup.email' }`
- **THEN** `parseFormSchema` отклоняет его как неверный `LocalizedText`

### Requirement: Парсер отклоняет удалённые узлы

`parseFormSchema` SHALL отклонять узлы `section`, `submit` и `step` с `FormSchemaError`, путём к
узлу и подсказкой, чем его заменить. Эти имена MUST оставаться зарезервированными для типов полей.

#### Scenario: Удалённый узел section

- **WHEN** документ содержит `{ type: 'section', children: [] }`
- **THEN** ошибка называет замену `{ type: 'block', component: 'Section', … }`

#### Scenario: Имя section как тип поля

- **WHEN** `ParseOptions.fieldTypes` содержит `section`
- **THEN** `parseFormSchema` бросает ошибку зарезервированного имени

### Requirement: Парсер проверяет блоки

`parseFormSchema` SHALL отклонять с путём к узлу: `block.component`, которого нет в
`ParseOptions.components`; `component: 'Grid'` (сетку задаёт `columns`); `label`, `description` или `disabledWhen` на блоке; `props.children` у
блока с узловыми `children`; `props`, которые не являются JSON-значением; значение `{ i18n }` в
`props` без зарегистрированного `translate`.

#### Scenario: Неизвестный компонент

- **WHEN** блок `Card`, а `ParseOptions.components` — `['Section']`
- **THEN** ошибка называет `Card`

#### Scenario: Grid как блок

- **WHEN** блок `{ type: 'block', component: 'Grid', children: [ … ] }`
- **THEN** ошибка подсказывает задать `columns` на контейнере

#### Scenario: Подпись на блоке

- **WHEN** блок с `label: 'Адрес'`
- **THEN** ошибка подсказывает перенести значение в `props`

#### Scenario: Два источника детей

- **WHEN** блок с `children` и `props.children`
- **THEN** ошибка указывает путь к блоку

### Requirement: Парсер проверяет колонки

`parseFormSchema` SHALL отклонять `columns` на поле или на блоке без детей и `colSpan` у узла, чей
ближайший контейнер (блок, `array` или корень документа) не задаёт `columns` или задаёт меньше
колонок, чем `colSpan`.

#### Scenario: colSpan без колонок

- **WHEN** поле с `colSpan: 2` лежит в блоке без `columns`
- **THEN** ошибка указывает путь к полю

#### Scenario: colSpan шире контейнера

- **WHEN** у контейнера `columns: 2`, а у ребёнка `colSpan: 3`
- **THEN** ошибка указывает путь к ребёнку

#### Scenario: columns на поле

- **WHEN** у поля `text` задан `columns: 2`
- **THEN** ошибка указывает путь к полю
