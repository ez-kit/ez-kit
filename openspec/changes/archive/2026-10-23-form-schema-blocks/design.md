# Design

## Context

Мотивация — в `proposal.md`, требования — в `specs/form-schema-blocks/spec.md`. Исходные решения —
D19–D22 в `specs/010-schema-form/draft.md`. Этот change реализует их с поправками, принятыми при
обсуждении (см. «Отличия от черновика 010»).

Что есть сейчас:

- **Узлы раскладки** (`packages/form/core/src/schema.ts`): `section` (`title`, `description`,
  `columns`, `children`), `submit` (`label`, `disabled`), `block` (`component`, `props`, без детей).
  Общие свойства любого узла — `CommonProps`: `label`, `description`, `when`, `disabledWhen`,
  `colSpan`.
- **Контейнеры для обхода** (`walk.ts`): `hasChildren` смотрит на `type` по набору
  `CONTAINER_TYPES = ['section', 'array']`. На `walkNodes` и его списке предков стоят видимость
  (`visibility.ts`), сборка валидатора (`validate.ts`) и проверки парсера.
- **Рендер** (`packages/form/react/react/src/schema`):
  - `renderChildren(nodes, { form, layout, context, parentColumns })` оборачивает каждого ребёнка в
    `layout.GridItem colSpan`, если у родителя есть `columns`;
  - `RenderNode` рисует `section` через `layout.Section` с `title`, `description` и `columns`,
    `submit` через `layout.SubmitButton` с `label` в `children`, а `block` — через
    `context.blocks[component]` с пропсом `{ props }`;
  - `layout` — это сырой `components` сборки (`LayoutComponents = FormComponents`);
  - `assertDocumentComponents` до первого рендера обходит весь документ и требует компонент для
    каждого узла, видимого или нет.
- **Реестр блоков** — проп `blocks` у `SchemaForm`, тип `BlockRegistry`, проверка
  `assertNoReservedFieldKeyCollision` в `create-schema-form.tsx`. Парсер проверяет `component` по
  `ParseOptions.blocks`.
- **Компоненты в JSX** (`create-form.tsx`): каждый ключ `components` становится `form.<Key>` как
  есть, без привязки к инстансу. Статическое свойство компонента (`Grid.Item`) поэтому доступно как
  `form.Grid.Item` без отдельного кода — так уже устроен `ArrayField.Item` в `fields`.
- **Перевод**: `LocalizedText = string | { key, params? }`, `resolveText(text, translate)`,
  `assertLocalizedText` в парсере (форма объекта и наличие `translate` через
  `ParseOptions.hasTranslate`).
- **Киты**: `blocks/layout.tsx` в обоих китах — `Section` с сеткой внутри и `GridItem`.

## Goals / Non-Goals

**Goals:**

- Документ — это JSX, записанный данными: тот же компонент, те же имена пропсов, одна регистрация.
- Любой зарегистрированный компонент может быть контейнером в документе.
- Колонки — свойство контейнера, а не отдельный узел и не особенность `section`.
- Ошибки раскладки ловит парсер, а не молчаливый рендер.

**Non-Goals:**

- Шаги в документе.
- Миграция документов v1 старого вида: формат ломается без конвертера, `version` остаётся `1`.
- Перевод значений во вложенных объектах и массивах внутри `props`.
- Адаптивность сетки: как сложить колонки на узком экране, решает `Grid` кита.

## Decisions

### Узел `block`

```ts
type BlockNode<TValues, TCustom extends string = never> = {
	type: 'block'
	component: string
	props?: Record<string, unknown>
	children?: FormNode<TValues, TCustom>[]
	columns?: number // только вместе с children
	colSpan?: number
	when?: Condition<TValues>
}
```

- Узловых `label`, `description` и `disabledWhen` у блока нет. Всё, что видит компонент, лежит в
  `props`. `CommonProps` делится: поля получают его целиком, блок — только `when` и `colSpan`.
  `disabledWhen` у секции и сегодня ничего не делал, поэтому у блока его просто нет.
- `when` скрывает блок вместе со всем поддеревом, как сегодня у `section`: видимость и валидатор
  читают `when` предков через `walkNodes`.
- Блок без `children` — лист, как сегодняшний `block`. Блок с `children` — контейнер.

### Рендер блока

`RenderNode` для `block`:

1. Берёт компонент из `layout` по `component` (`Object.hasOwn`, чтобы не найти
   `Object.prototype`). `assertDocumentComponents` уже гарантировал, что он есть.
2. Переводит пропсы: каждое значение верхнего уровня вида `{ i18n, params? }` прогоняется через
   `resolveText`, остальное передаётся как есть. Строки не трогаются: строка — готовый текст.
   Хелпер `resolveBlockProps(props, translate)` живёт в `schema/` рядом с рендером.
3. Если у узла есть `children`, рендерит их через `renderChildren` с `columns` узла и передаёт
   результат как `children` компонента. Иначе `children` берётся из `props`, если он там есть.

Пропсы блока передаются **плоско**, а у кастомного поля остаются вложенными (`{ props }`), и это не
противоречие. Поле получает привязку (`name`, `value`, `onChange`, `disabled`, …), и плоские
пропсы из документа могли бы её перезаписать — поэтому `CustomFieldRenderProps.props` вложен.
У блока привязки нет, перезаписывать нечего, а плоские пропсы дают то, ради чего всё затевалось:
один компонент для JSX и документа.

Ключ ребёнка-блока — позиция (`block-<index>`), как сегодня у `section`, `block` и `submit`.

### Колонки

- `columns` разрешён на блоке с детьми, на `array` и на корне `FormSchema`. На поле и на блоке без
  детей — ошибка парсера.
- `renderChildren` получает `columns` вместо `parentColumns`. Если он задан, весь список детей
  оборачивается в `<layout.Grid columns>`, а каждый ребёнок — в `<layout.Grid.Item colSpan>`.
  Иначе дети рендерятся как есть. Контейнер получает уже разложенных детей и о колонках не знает.
- У `array` сетка вставляется внутрь каждой записи: `columns` описывает раскладку полей одной
  записи, а не список записей.
- `colSpan` у узла, чей ближайший контейнер (родительский блок, `array` или корень) не задаёт
  `columns`, — ошибка парсера. Сегодня он молча игнорируется.
- Диапазон 1–4 и `clampToGridRange` не меняются.

### Сетка в контракте кита

```ts
type GridProps = { columns?: number | undefined; children: ReactNode }
type GridItemProps = { colSpan?: number | undefined; children: ReactNode }
type GridSlot = ((props: GridProps) => ReactNode) & { Item: (props: GridItemProps) => ReactNode }

type FormComponents = {
	SubmitButton?: (props: SubmitButtonProps) => ReactNode
	Section?: (props: SectionProps) => ReactNode
	Grid?: GridSlot
}

type SectionProps = { title?: ReactNode; description?: ReactNode; children: ReactNode }
```

- `Grid` — одна пара под одним ключом, по образцу `ArrayField` с `ArrayField.Item`: сетка и ячейка
  друг без друга не имеют смысла, а кит, заменивший одну половину, получил бы ячейки, не
  совпадающие с сеткой.
- `GridItem` удаляется из контракта. В JSX: `form.Grid` / `form.Grid.Item`.
- `Section` больше не принимает `columns`, только заголовок, описание и детей. Секция в две колонки
  в JSX — `<form.Section title='…'><form.Grid columns={2}>…</form.Grid></form.Section>`.
- `createForm` по-прежнему переутверждает пропсы этих ключей через `Pick<FormComponents, …>`.

### Обязательные компоненты

`assertDocumentComponents` до первого рендера:

- `block` — компонент `component` есть в `layout` (собственное свойство). Сообщение называет имя:
  `SchemaForm: the document has a block "Card", but no Card component was passed in components.`;
- узел или корень с `columns` — есть `Grid` (с `Item`);
- остальное как сейчас: `ArrayField` для `array`, слоты полей и реестр кастомных полей.

`MissingComponentMessage.Section`, `.GridItem` и `.SubmitButton` удаляются: секция и кнопка — теперь
обычные блоки с общим сообщением.

### Парсер

- `ParseOptions.blocks` переименовывается в `ParseOptions.components`: имена, которые может
  назвать `block.component`. Без списка любой блок — ошибка, как сегодня.
- Узлы `section`, `submit` и `step` отклоняются в `assertNodeShape` с подсказкой:
  - `section` → `use { type: 'block', component: 'Section', props: { title }, children }`;
  - `submit` → `use { type: 'block', component: 'SubmitButton', props: { children } }`;
  - `step` → как сейчас, `form.Steps`.

  Все три остаются в `RESERVED_NODE_TYPES`: под этими именами нельзя зарегистрировать тип поля.

- `component: 'Grid'` — ошибка с подсказкой задать `columns` на контейнере. Сетку в документе
  вставляет только рендерер: `Grid`-блок дал бы сетку в сетке, а `colSpan` под ним было бы не к
  чему привязать. `assertDocumentComponents` бросает ту же ошибку для документа, который не шёл
  через парсер.
- `label`, `description` или `disabledWhen` на блоке — ошибка с подсказкой перенести в `props`.
- `props.children` у блока с узловыми `children` — ошибка: у компонента был бы второй источник
  детей.
- `columns` на поле или на блоке без детей — ошибка; `colSpan` без `columns` у ближайшего
  контейнера или шире его `columns` — ошибка (второе добавлено по итогам ревью: браузер
  достраивает неявные колонки).
- `props` блока проверяются как JSON-значение, как `params` источника опций: документ с сервера
  попадает в компонент через них. Что из строк безопасно рендерить, парсер знать не может — это
  забота компонента, и документация говорит об этом прямо.
- Значение верхнего уровня в `props`, которое является объектом с ключом `i18n`, проверяется как
  `LocalizedText`, включая требование `hasTranslate`.
- `assertNoReservedCollision` проверяет только `fieldTypes`: имя компонента не пересекается с
  `type` узла, потому что блок ищется по `component`.

### `{ i18n }` вместо `{ key }`

```ts
type LocalizedText = string | { i18n: string; params?: Record<string, string | number> }
```

- Меняются `localized-text.ts` (тип и `resolveText`), `assertLocalizedText` и его сообщения,
  все тесты и примеры, которые пишут `{ key }`.
- `Translate`, проп `translate` и `ParseOptions.hasTranslate` не меняются.
- Почему `i18n`: `key` не говорит, что это перевод, и совпадает с частой формой пропсов, а перевод
  теперь применяется к `props` блока, где случайное совпадение формы стало бы ошибкой. Так же
  называется поле ключа перевода в JSON Forms.
- Объект `{ i18n: … }` в `props` всегда считается ключом перевода. Компонент, которому нужен проп
  ровно такой формы для другой цели, получить его из документа не может — цена принята.

### Что удаляется из `SchemaForm`

- проп `blocks`, тип `BlockRegistry`, поле `blocks` в `RenderNodeContext`;
- `assertNoReservedFieldKeyCollision` и его вызов в `create-schema-form.tsx`;
- ветки `section` и `submit` в `RenderNode` и `renderChildren`.

## Отличия от черновика 010

- **D19.** Отдельных опций фабрики `Grid` и `Wizard` нет. `Grid` живёт в `components` под
  фиксированным именем, как `Section` и `SubmitButton`; `Wizard` удалён вместе со схемным
  визардом.
- **D20.** Узловые `label` и `description` блоку не передаются. Вместо этого переводятся значения
  `{ i18n }` в `props`, и пропсы называются так же, как в JSX (`title` у `Section`, `children` у
  `SubmitButton`).
- **D22.** `columns` разрешён и на корне документа, и на `array`.
- **Новое:** `{ key }` переименован в `{ i18n }`.

## Risks / Trade-offs

- **Формат ломается без миграции.** Каждый документ с `section`, `submit`, `blocks` или `{ key }`
  перестаёт парситься. Принято: пакеты в 0.x, внешних потребителей формата нет. Парсер называет
  замену в сообщении, поэтому правка механическая.
- **Пропсы блока не типизированы в документе.** `props: Record<string, unknown>` — компонент
  получает то, что написано, без проверки на этапе компиляции, как и сегодня.
- **Больше вложенности в JSX для секции с колонками** (`Section` → `Grid` → `Grid.Item`). Цена
  разделения: секция перестаёт знать о сетке, и сетка доступна любому контейнеру.
