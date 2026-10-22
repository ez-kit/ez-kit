# Design

## Context

Мотивация — в proposal.md (раздел Why), требования — в `specs/data-grid-form-modal` и
`specs/data-grid-validation`. Здесь только то, что определяет реализацию.

- Состоянием формы владеет срез таблицы `creating` / `editing` (`values`, `errors`, `formError`,
  `commitStatus`). Пайплайн `commit()` читает `values` из среза, прогоняет `runValidate`, затем
  `onSave`, а `ValidationError` раскладывает обратно в срез. Отмена идёт через два контроллера:
  форма и поле (`resetFormController` / `resetFieldController`), и поле никогда не отменяет форму.
- `runValidate` продублирован в `creating.ts` и `editing.ts` и вызывает `zodSafeParseToResult`.
- Засев: `creating.start()` — `resolveDefaultValues`; `editing.start()` — `snapshotRow`, который
  берёт **все** несистемные колонки, включая `editing: false`.
- `FormModalHost` разрешает `children` → `editing.FormShell` → `core.Modal`. `ComponentGuard` уже
  требует `FormShell` при `mode: 'modal'`, поэтому третья ступень недостижима.
- `AutoForm` в одном цикле и решает, какие поля входят в форму, и рендерит их в обёртку
  `data-slot='auto-form'`.

## Goals / Non-Goals

**Goals:**

- Один пайплайн сохранения для всех форм: дефолтной, своей раскладки и чужой формы.
- Никакой новой runtime-зависимости в core и react-пакете.
- Без `React.memo`: изоляция ререндеров только селекторами и стабильными значениями.

**Non-Goals:**

- Генерация схемы `@ez-kit/form` из колонок и пакет-мост к нему. После этой работы мост сводится
  к примеру в документации поверх `submit`; отдельный пакет — следующее изменение, если понадобится.
- Раскладка дефолтной формы через конфиг колонок (секции, `colSpan`). Раскладка делается в JSX
  через `fields`.
- Адаптеры результата под resolver react-hook-form или Formik.
- Своя форма для режимов `row` / `pin-row` / `cell`. Контракт касается только модалки.

## Decisions

### 1. `commit` принимает значения и возвращает результат

`creating.commit(options?)` и `editing.commit(options?)` получают `{ values }` и возвращают
`Promise<CommitResult>`:

```ts
type CommitResult =
	| { ok: true }
	| { ok: false; reason: 'rejected'; errors: ValidationErrors; formError: string | null }
	| { ok: false; reason: 'cancelled' | 'busy' | 'closed' }
```

`reason` — закрытый набор `CommitFailure`. Ошибки есть только у `rejected`: остальные исходы
ничего не пытались сохранить, и показывать им нечего. Изначально был один `ok: false` с флагом
`cancelled?`; ревью показало, что «форма не открыта» и «идёт `validate()`» тогда были
неотличимы от отказа с пустыми ошибками.

Если `values` переданы, пайплайн сначала записывает их в срез вместо текущих, а дальше идёт
обычным путём. Так ошибки, `isPending` и `formError` в срезе остаются единственным источником
правды для пропсов слота, а дефолтный `FormModal` и своя форма видят одно и то же состояние.

Повторный вызов, пока сохранение в полёте, возвращает **тот же промис**: промис хранится рядом с
контроллером формы в `abortBox`. Это проще, чем выдумывать результат «занято», и честно
выполняет требование «`onSave` вызывается один раз». Сохранение, отменённое через `cancel()`,
резолвится в `{ ok: false, reason: 'cancelled' }` сразу, даже если `onSave` игнорирует `signal`.
`commit`, пока идёт `validate()`, резолвится в `busy`; `validate()` во время сохранения ничего не
делает и возвращает `null`, чтобы не обрывать сохранение, которое уже могло дойти до сервера.
Пайплайн живёт в `features/form/commit-pipeline.ts`. Неожиданная ошибка из
`onSave`, как и сейчас, записывает общий `formError` и пробрасывается: промис отклоняется.

Отвергнуто: отдельный `submit(values)` в core рядом с `commit`. Это два пайплайна с одной
логикой отмены и одинаковыми гонками, которые придётся держать синхронными.

### 2. Чистая проверка — `validateValues`

В API обеих фич добавляется `validateValues(values): Promise<ValidationResult>`. Она вызывает тот
же валидатор, но не пишет в срез и не трогает контроллеры формы и поля. Её `signal` — отдельный
контроллер в `abortBox`, который отменяется только при `cancel()` / закрытии формы, чтобы
проверка на blur в своей форме не отменяла идущее сохранение и наоборот. Существующие
`validate()` и `validateField()` остаются как есть: их использует дефолтная форма.

### 3. Валидация через Standard Schema, без зависимости

Интерфейс Standard Schema v1 копируется в `features/validation/standard-schema.ts`. Спецификация
прямо предлагает так делать, а пакет и сейчас держит тип схемы у себя, чтобы `index.d.ts` не
требовал установленного zod. Опциональный peer `zod` удаляется из `package.json`; zod остаётся
devDependency для тестов.

Один `runValidator(validate, values, ctx)` в модуле валидации заменяет обе копии `runValidate`.
Он вызывает функцию либо `schema['~standard'].validate(values)` с `await`, потому что результат
может быть промисом. Разбор issues:

- сегмент пути бывает `PropertyKey` или `{ key }` — нормализуется к `key`;
- ключ поля — первый сегмент; сообщения одного поля копятся списком;
- issues без пути склеиваются в `formError` через `\n`. Оба кита отображают баннер с
  `white-space: pre-line`, чтобы несколько сообщений шли строками.

`zodResolver` переименовывается в `schemaResolver` и возвращает `Promise<ValidationResult>`.

### 4. Засев формы и `initialValues`

`snapshotRow` пропускает колонки, у которых `resolveColumnFormConfig(meta, Editing) === false`, —
теми же правилами, что `AutoForm`, поэтому «поле формы» определяется одним помощником.
`resolveDefaultValues` не меняется.

Засев сохраняется в срез вторым полем `initialValues` в момент `start()`. Слот читает
его оттуда, поэтому идентичность объекта стабильна, пока форма открыта, без `useMemo` по
открытию. `row` не хранится в срезе: модалка берёт его по `rowId` из core row model, так же как
`editedRowOf` в `auto-form.tsx` сейчас.

`EditingSaveContext.row` берётся из core row model по `rowId` в момент сохранения.

### 5. `fields`: разделить решение и обёртку

Из `AutoForm` выносится хук, который возвращает упорядоченный список `{ columnId, element }` для
полей формы, с прежней цепочкой разрешения компонента (компонент колонки → реестр типа ячейки →
запасной `Input`). `AutoForm` оборачивает список в `data-slot='auto-form'`, как сейчас, а
`fields` собирается из того же списка в объект по `columnId`. Так дефолтная форма и `fields`
не могут разойтись. Каждый элемент `fields` — тот же `data-slot='auto-form-field'`, поэтому
стили китов к нему применяются и вне `auto-form`.

### 6. Слот `FormModal` и разрешение модалки

`FormShell` → `FormModal`, `FormShellProps` → `FormModalProps`, файлы китов переименовываются. Слот
остаётся в группе `editing`: правило контракта не пускает в `core` компоненты, названные по фиче,
а обе формы и так используют одну группу. `FormModalHost` рендерит только `FormModal`; ветка с
`core.Modal` и её ошибка удаляются, а `ComponentGuard` переходит на новое имя. `core.Modal`
остаётся в контракте.

### 8. Своя форма — только через слот

Изначально контракт формы отдавался render prop `children` у `<DataGrid.CreatingModal>` /
`<DataGrid.EditingModal>`. При реализации выяснилось, что корень грида сам монтирует модалку при
`mode: 'modal'`, и модалка, написанная в layout, рендерится **рядом** со слотом кита, а не вместо
него. Развести их можно было регистрацией из layout (runtime-claim) или переносом монтирования в
пресеты; выбран самый простой путь: render prop удаляется, а `FormModalProps` получает весь
контракт (`mode`, `initialValues`, `row`, `submit`, `validate`, `errors`, `fields` рядом с
прежними `title`, `formError`, `isPending`, `onSave`, `onCancel`, `children`). Своя форма — это
свой `FormModal`, зарегистрированный на гриде (`components={{ editing: { FormModal } }}`, слияние
по членам группы) или для всего приложения. Кит рендерит `children` и игнорирует остальное.
`cancel` из контракта совпал бы с `onCancel`, поэтому остался один `onCancel`.

### 7. Документация: пример своей формы на `@ez-kit/form`

Живой пример своей формы строится на `@ez-kit/form`, который уже есть в docs-приложении, а не на
react-hook-form: тогда не нужна новая зависимость в `apps/docs`. Сниппет для react-hook-form
даётся в MDX без живого примера. В исходниках примеров нет внутренних комментариев: пояснения
идут в MDX.

## Risks / Trade-offs

- [Редактирование строкой отдаёт меньше ключей в `onSave`] → это и есть breaking change из
  proposal. Замена — `row` в контексте; changeset и страница редактирования говорят об этом прямо.
- [Ячейки с `editing: false` в режиме `row` могли читать значение из `values`] → перед сменой
  `snapshotRow` проверить, что такие ячейки рендерят вид строки, и закрепить это тестом.
- [`fields` пересоздаётся на каждое изменение среза, и вместе с ним ререндерится слот] →
  так же, как сейчас ререндерится `form`. Своя форма в режиме B сам срез не меняет, поэтому
  ререндерится только на смене `commitStatus` / ошибок. Тест на изоляцию ререндеров хоста не
  должен измениться.
- [Асинхронная схема делает `schemaResolver` асинхронным] → функция `validate` и так может
  возвращать промис; сигнатура помощника меняется вместе с переименованием, отдельной ломки нет.
- [Несколько issues без пути склеиваются в строку] → в `formError` по-прежнему одна строка, чтобы
  не менять тип; список ошибок формы можно добавить позже без ломки.

## Migration Plan

Один changeset: minor с breaking-изменениями для `@ez-kit/data-grid-core`,
`@ez-kit/data-grid-react` и `@ez-kit/data-grid-heroui` (shadcn-кит в changeset не входит).
Миграция в тексте changeset:

- `zodResolver(schema)` → `schemaResolver(schema)`; `validate: { schema }` с zod работает как раньше;
- `components.editing.FormShell` → `components.editing.FormModal`, `FormShellProps` → `FormModalProps`;
- поля без колонки формы при редактировании читаются из `ctx.row`, а не из `ctx.values`.
- `<DataGrid.EditingModal>{fn}</DataGrid.EditingModal>` → свой `FormModal` в `components={{ editing: { FormModal } }}`; аргументы render prop стали его пропсами (`form` → `children`).

Откат — revert изменения целиком: данные и хранилище не затрагиваются.
