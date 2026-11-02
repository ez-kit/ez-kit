# Proposal

## Why

Сейчас грид нельзя перевести одним словарём. `messages` покрывает всё, кроме подписей операторов
фильтра: они записаны английскими литералами в определениях готового набора, и переведённый грид
обязан передавать второй канал — переведённую копию `defaultOperators` (рецепт на странице
Localization). Каждый проект пишет и этот словарь, и этот рецепт заново, а готового русского словаря
пакет не поставляет вовсе (`defaults.ts` объясняет это тем, что недопереведённый словарь молча
показывает английский).

Оба препятствия снимаются вместе: подписи встроенных операторов переезжают в `GridMessages`, а пакет
поставляет два полных словаря — `en` и `ru` — типизированных как полный `GridMessages`, так что новый
ключ без перевода ломает typecheck в репозитории, а не рендер у потребителя.

## What Changes

- Новая группа словаря `messages.operators`: `common` (подпись по id оператора) и группы подписей
  набора — `date` (`After`, `Before`, `On or after`, `On or before`) и `boolean` (`Is`, `Is not`),
  то есть ровно те формулировки, которые в готовом наборе расходятся по типам. Группа закрытая и
  типизированная: ключи — id `FilterOperator`, группы — фиксированный список.
- Новое необязательное поле определения оператора `labels` — литеральная пометка, из какой группы
  словаря брать подпись (`labels: 'date'`). Ставится только на встроенные определения, чья подпись
  отличается от `common`.
- **BREAKING** `FilterOperatorDef.label` становится необязательным; встроенные определения готового
  набора больше не несут `label`. Подпись оператора разрешается при рендере по цепочке
  `def.label` → `messages.operators[def.labels][def.id]` → `messages.operators.common[def.id]` → id
  с предупреждением в development. Явный `label` определения всегда выигрывает у словаря. Потребитель,
  читавший `defaultOperators.byType.x[i].label`, получает `undefined`.
- Кит и компоненты React-пакета получают операторы с уже разрешённой подписью (`label: string`),
  поэтому переключатель, меню, чип и модель фильтра продолжают читать одно поле.
- Новые subpath'ы `@ez-kit/data-grid-core/messages/en` (`enMessages`, тот же объект, что
  `defaultMessages`) и `@ez-kit/data-grid-core/messages/ru` (`ruMessages`). Оба — полный
  `GridMessages`. Голое имя `ru` не используется: оно сталкивается с `ru` из
  `react-day-picker/locale` и `date-fns/locale` в одном файле shadcn-проекта.
- Новый ADR, который заменяет в ADR 0005 пункт «no `messages.operators`» и сохраняет остальное:
  поведение читается из `input`, определения — объекты из литералов. Строка в `AGENTS.md`
  обновляется ссылкой на него.
- Документация: страница Localization — паки `en`/`ru`, `messages.operators` вместо рецепта с
  переведённым набором, заметка о локали календаря кита (heroui — `I18nProvider` react-aria, shadcn —
  `locale` react-day-picker); страница Filter operators — `label` необязателен, `labels`.

## Capabilities

### New Capabilities

- `data-grid-messages`: словарь пользовательских строк грида — форма `GridMessages`, слияние
  частичных словарей по группам и слоям опций, чтение через `useGridMessages`, поставляемые полные
  словари `en` и `ru` на subpath'ах.

### Modified Capabilities

- `data-grid-filter-operators`: подпись оператора больше не берётся только из определения —
  требование «Подпись оператора берётся из его определения» заменяется цепочкой разрешения через
  словарь; определения готового набора не несут `label`; появляется пометка `labels`; подпись по типу
  (`After` у `date`) выражается через словарь.

## Impact

- `packages/data-grid/core`: `messages/` (типы, `defaults.ts`, новые `en.ts` / `ru.ts`, обоснование
  в докблоке `defaults.ts`), `operators/definitions.ts` и `default-operators.ts` (без `label`, с
  `labels`), `features/operators/operators.ts` (`FilterOperatorDef`, стаб неизвестного оператора,
  функция разрешения подписи), `package.json` (два `exports` и бюджеты `size-limit`), `tsup` entry.
- `packages/data-grid/react/react`: разрешение подписей там, где строится список операторов колонки
  для UI и модели фильтра (`filter-model.ts`, `render-filter-input.tsx`, `active-filters-bar.tsx`).
- Киты shadcn и heroui: `OperatorSelect` читает разрешённую подпись; правок поведения не ожидается.
  shadcn-правка, если понадобится, — registry payload (ADR 0002).
- `apps/docs`: `localization.mdx`, `filtering/operators.mdx`, пример `localization`,
  `docs-option-names` (`page-type-map.ts`), `tree-shaking.test.ts` (новые entry; `operators` больше не
  содержит английских подписей).
- `openspec/decisions/`: новый ADR; `AGENTS.md`.
- Changeset: minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` (пакеты 0.x), с пометкой
  breaking про `label`. `@ez-kit/data-grid-shadcn` в changeset не входит.
