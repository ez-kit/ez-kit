# Proposal

## Why

Модалка создания и редактирования в data-grid умеет ровно одну форму: `AutoForm` выводит поля
всех колонок одним столбцом (`flex flex-col gap-4`) в порядке колонок. Render prop
`<DataGrid.CreatingModal>` / `<DataGrid.EditingModal>` меняет только диалог вокруг формы: `form`
приходит непрозрачным `ReactNode`, разложить его поля нельзя, а подставить свою форму
(react-hook-form, Formik, `@ez-kit/form`) можно только вручную, через `useDataGridTable()`,
`table.creating.setValue` и знание внутреннего состояния. Валидация при этом привязана к zod
структурно (`{ safeParse }`), так что valibot и arktype не подключаются, а ошибка схемы без `path`
(`refine` на уровне формы, например «пароли не совпадают») молча отбрасывается.

Цель: дефолтная форма остаётся для тех, кому её хватает, а разработчик, которому нужна своя,
подставляет любую и получает от грида открытие/закрытие, начальные значения и пайплайн сохранения.

## What Changes

- **Единственный путь — слот `FormModal`.** Своя форма или своя раскладка подставляется
  регистрацией своего компонента в слот `FormModal` (на гриде через `components` или для всего
  приложения). Render prop `children` у `<DataGrid.CreatingModal>` / `<DataGrid.EditingModal>`
  удаляется: корень грида сам монтирует модалку при `mode: 'modal'`, поэтому модалка, написанная в
  layout, рендерилась рядом со слотом кита, а не вместо него. **BREAKING**
- **Свои раскладки дефолтной формы.** Пропсы `FormModal` отдают помимо `children` (формы) ещё `fields` —
  отрендеренные поля по `columnId`, уже связанные с состоянием грида. Их можно разложить в любую
  сетку, вкладки или секции.
- **Своя форма целиком.** Пропсы `FormModal` отдают `mode`, `initialValues`, `submit`, `onCancel`,
  `validate`, `isPending`, `formError`, `errors` и `row`:
  - `initialValues` — только поля, которые попали бы в дефолтную форму (результат сборки конфига
    колонок: `defaultValue` при создании, значения строки при редактировании, без колонок с
    `creating: false` / `editing: false` и без системных);
  - `row` — `row.original` редактируемой строки, только для чтения; `undefined` при создании;
  - `submit(values?)` отдаёт значения в пайплайн грида и **возвращает** результат
    `{ ok: true } | { ok: false, errors, formError? }`, а не бросает исключение. Без аргумента
    берёт значения из состояния грида (режим `fields`), с аргументом — значения своей формы.
    Ошибка `ValidationError` из `onSave` приходит в том же результате;
  - ключи в `values`, которых нет в конфиге колонок, не отбрасываются и доходят до `onSave`;
  - `validate(values)` — валидатор грида как чистая функция: проверяет переданные значения и
    ничего не пишет в состояние. Своя форма может вызывать его на blur/change.
- **Правило валидации при `submit`.** Если задан `creating.validate` / `editing.validate`, `submit`
  прогоняет его перед `onSave` — в любом режиме, включая свою форму. Если не задан, `submit` сразу
  вызывает `onSave`, и валидация целиком на стороне формы. Двойная проверка бывает только тогда,
  когда её настроили явно.
- **Validation через Standard Schema.** `validate: { schema }` принимает любую схему, реализующую
  Standard Schema (`~standard.validate`): zod, valibot, arktype и другие. Ошибки без `path` идут в
  `formError`, вложенные пути больше не схлопываются молча. Структурный `ValidationSchema`
  (`safeParse`) заменяется типом Standard Schema, `zodResolver` переименовывается в
  `schemaResolver` и принимает любую такую схему. **BREAKING**
- **`row` в `EditingSaveContext`.** `onSave` при редактировании получает `row` рядом с `rowId` и
  `values`.
- **`values` редактирования — только поля формы.** Сейчас форма редактирования засевается
  значениями всех несистемных колонок, включая `editing: false`, и они уходят в `onSave`. Теперь
  в `values` попадают только поля формы, а всё остальное доступно через `row`. **BREAKING**
- **Слот `FormShell` → `FormModal`.** Имя совпадает со словарём грида (`mode: 'modal'`,
  `CreatingModal`, `EditingModal`) и больше не конфликтует с внутренним `FormShell` пакета
  `@ez-kit/form` (элемент `<form>`). `FormShellProps` → `FormModalProps`. Слот остаётся в группе
  `editing`: группа `core` по правилам контракта растёт только за счёт общих примитивов, а не
  компонентов, названных по фиче. **BREAKING** для китов, которые регистрируют слот.
- **Запасной путь `FormShell → core.Modal` удаляется.** `ComponentGuard` уже требует слот формы
  при `mode: 'modal'`, так что этот путь недостижим без ручного обхода. Сам `core.Modal` остаётся
  в контракте как общий примитив.

## Capabilities

### New Capabilities

- `data-grid-form-modal`: модалка создания и редактирования — дефолтная форма, её поля для своей
  раскладки, контракт подстановки своей формы (`initialValues`, `row`, `submit`, `onCancel`,
  `validate`, `isPending`, `formError`), слот `FormModal` и его разрешение.
- `data-grid-validation`: валидация записи строки — форма `validate` (функция или Standard
  Schema), когда валидатор прогоняется при `submit`, отображение issues в `errors` / `formError`,
  `ValidationError` из `onSave`, контекст `onSave`.

### Modified Capabilities

Нет: создание, редактирование и валидация до сих пор не описаны ни в одном spec.

## Impact

- `@ez-kit/data-grid-core`: `features/validation/*` (Standard Schema вместо `safeParse`, удаление
  `zodResolver`, разбор issues), `features/creating/creating.ts` и `features/editing/editing.ts`
  (`submit` с внешними значениями, чистый `validate(values)`, `row` в контексте `onSave`, засев
  `values` редактирования). Опциональная peer-зависимость `zod` уходит; тип Standard Schema
  копируется в пакет, как рекомендует сама спецификация, без новой зависимости.
- `@ez-kit/data-grid-react`: `data-grid/form-modal.tsx` (полный контракт формы в пропсах слота, удаление render prop),
  `data-grid/auto-form.tsx` (поля по `columnId`), `contract.ts` и `types.ts` (`FormModal`,
  `FormModalProps`), `component-guard.tsx`.
- Киты shadcn и heroui: `blocks/editing/FormShell.tsx` → `FormModal`.
  shadcn-версия входит в registry payload, так что меняется и он.
- `@ez-kit/form`: не меняется и не становится зависимостью грида; связка с ним — пример в
  документации поверх `submit`.
- Документация: `editing/*`, `editing/creating.mdx`, `layout/composition.mdx`, примеры модалок,
  новый пример своей формы на react-hook-form; таблицы опций проверяются
  `docs-option-names.test.ts`.
- Changeset: minor с breaking-изменениями для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`
  (shadcn-кит в changeset не входит), `@ez-kit/data-grid-heroui`.
