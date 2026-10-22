# Tasks

## 1. Валидация через Standard Schema (core)

- [x] 1.1 Скопировать интерфейс Standard Schema v1 в `features/validation/standard-schema.ts` и заменить им `ValidationSchema`; проверить `pnpm --filter @ez-kit/data-grid-core typecheck` и что собранный `dist/index.d.ts` не импортирует `zod`
- [x] 1.2 Написать общий `runValidator` (функция или `~standard.validate` с `await`, путь `PropertyKey | { key }`, первый сегмент — ключ поля, issues без пути склеиваются в `formError` через `\n`) и заменить им обе копии `runValidate`; тесты на valibot-подобную, асинхронную и zod-схему, на вложенный путь, несколько сообщений поля и issue без пути
- [x] 1.3 Переименовать `zodResolver` в `schemaResolver` (возвращает промис), убрать опциональный peer `zod` из `package.json` core, оставив его в devDependencies; переписать `zod-resolver.test.ts` под новое имя и убедиться, что `pnpm --filter @ez-kit/data-grid-core test` зелёный
- [x] 1.4 Обновить `apps/docs/content/docs/data-grid/editing/validation.mdx` (Standard Schema, `schemaResolver`, ошибки формы из схемы) и примеры `CreatingValidationExample` / `EditingValidationExample`; проверить `pnpm --filter @ez-kit/docs test` (в том числе `docs-option-names.test.ts`)

## 2. Пайплайн сохранения (core)

- [x] 2.1 `commit(options?: { values })` в creating и editing: записывает переданные значения в срез и возвращает `CommitResult`; повторный вызов в полёте возвращает тот же промис; отмена через `cancel()` даёт `{ ok: false, reason: 'cancelled' }`; тесты в `creating.test.ts` и `editing.test.ts` на каждый случай, включая `ValidationError` и неожиданную ошибку (промис отклоняется)
- [x] 2.2 `validateValues(values)` в обеих фичах: не пишет в срез, свой контроллер в `abortBox`, отменяется только закрытием формы; тесты, что срез не меняется, что без валидатора результат `null` и что вызов не отменяет идущий `commit`
- [x] 2.3 Поле `initialValues` в срезах `creating` / `editing`, заполняемое в `start()`; тест, что `setValue` не меняет его идентичность
- [x] 2.4 Сначала тестом закрепить, что в режиме `row` ячейка с `editing: false` показывает значение строки, затем научить `snapshotRow` пропускать колонки, выключенные для формы редактирования (через `resolveColumnFormConfig`); тест, что `onSave` не получает такой ключ
- [x] 2.5 Добавить `row` в `EditingSaveContext` для `commit` и `commitCell`; тест на строку с полем без колонки
- [x] 2.6 Описать в `editing/index.mdx` и `editing/creating.mdx` новый контекст `onSave` (`row`) и то, что `values` редактирования содержат только поля формы; проверить `pnpm --filter @ez-kit/docs test`

## 3. Слот FormModal (react и киты)

- [x] 3.1 Переименовать `FormShell` → `FormModal` и `FormShellProps` → `FormModalProps` в `contract.ts`, `types.ts`, `index.ts`, `component-guard.tsx`, `test-utils.tsx` и `CONTRACT.md`, оставив слот в группе `editing`; обновить `component-guard.test.tsx` под новое имя в сообщении об ошибке
- [x] 3.2 Убрать из `FormModalHost` ветку с `core.Modal`; проверить, что `core.Modal` остаётся в контракте, а `pnpm --filter @ez-kit/data-grid-react test` зелёный
- [x] 3.3 Переименовать `blocks/editing/FormShell.tsx` → `FormModal.tsx` в обоих китах, обновить `editing-components.ts`, баннер `formError` отображать с `white-space: pre-line`; проверить тесты обоих китов и `pnpm --filter @ez-kit/docs registry:build` (новое имя файла в `public/r/data-grid.json`)
- [x] 3.4 Найти в документации все упоминания `FormShell` и заменить их; проверить `grep -rn FormShell apps/docs/content` пустым

## 4. Контракт формы в слоте FormModal (react)

- [x] 4.1 Вынести из `AutoForm` хук со списком `{ columnId, element }` полей формы; `AutoForm` рендерит его в `data-slot='auto-form'` без изменений разметки; существующие тесты `AutoForm` и `modal-edit-mode.test.tsx` проходят без правок
- [x] 4.2 Расширить `FormModalProps`: `mode`, `initialValues`, `row`, `submit(values?)`, `validate`, `errors`, `fields` рядом с `title`, `formError`, `isPending`, `onSave`, `onCancel`, `children`; удалить render prop `children` у `CreatingModal` и `EditingModal` и типы `DataGridFormModalProps` / `DataGridFormModalRenderArgs` / `DataGrid{Creating,Editing}ModalProps` (design §8); тесты со своим `FormModal`, зарегистрированным через `components` по сценариям `specs/data-grid-form-modal`: своя форма через `submit(values)`, своя раскладка через `fields` и `submit()`, ошибка сервера в результате, двойной `submit`, `row` при создании и редактировании, лишние ключи доходят до `onSave`
- [x] 4.3 Проверить, что `host-rerender-isolation.test.tsx` проходит без изменений и что в пакете не появилось `memo`
- [x] 4.4 Пример своей формы на `@ez-kit/form` (форма того же кита, что и грид) и пример своей раскладки через `fields`: компоненты в `apps/docs/shared/data-grid/examples/components/`, записи в `manifest.json` и `registry.ts`, без внутренних комментариев в исходниках; раздел в `editing/creating.mdx` или `layout/composition.mdx` со сниппетом для react-hook-form; открыть обе страницы примеров (shadcn и heroui) в dev-сервере и убедиться, что создание и редактирование сохраняют строку и показывают ошибки

## 5. Интеграция и выпуск

- [x] 5.1 Добавить changeset (minor, breaking) для `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/data-grid-heroui` с миграцией из design; проверить `pnpm lint` (в том числе `check-changesets.mjs`)
- [x] 5.2 Прогнать полный гейт последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size`; при изменении бюджетов `size-limit` обосновать новые цифры
- [x] 5.3 Прогнать e2e модалок создания и редактирования для обоих китов (`apps/docs/e2e/packages/data-grid/`) и убедиться, что они зелёные

## Workflow follow-up

- После ревью архивировать изменение через `/opsx:archive` и синхронизировать specs.
