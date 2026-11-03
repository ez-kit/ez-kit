# Design

## Context

Мотивация — proposal.md, «Why». Здесь только то, что определяет подход.

- Словарь живёт в core (`core/src/messages/`): `types.ts` (`GridMessages`, 21 группа), `defaults.ts`
  (английский), `resolve.ts` (`resolveMessages` складывает слои поверх `defaultMessages`).
  React-слой разрешает словарь один раз в `useDataGrid` (`use-data-grid.ts`, `resolveMessages`) и
  кладёт полный словарь в `table.grid.messages`; компоненты читают его через `useGridMessages()`.
- Слои опций (`createDataGrid` → провайдер → экземпляр) сливаются `mergeOptionLayers` полностью
  глубоко (`deepMerge`), а `resolveMessages` складывает итог поверх `defaultMessages` **только на
  один уровень**: `merged[group] = { ...defaults[group], ...layer[group] }`. Вложенная запись
  (`filtering.presets` сейчас) заменяется целиком; `localizeDatePresets` маскирует это, оставляя
  английскую подпись там, где записи нет.
- Подписи готового набора — литералы в `core/src/operators/definitions.ts` (25 определений, 17 id).
  Расходятся по типам: даты (`greaterThan` `After`, `greaterOrEqual` `On or after`, `lessThan`
  `Before`, `lessOrEqual` `On or before`) и boolean (`equals` `Is`, `notEquals` `Is not`).
  `badge` и `progress` пользуются наборами `select` и `number`.
- Колоночные операторы разрешаются в core без словаря (`resolve-filtering.ts` →
  `resolveColumnOperators`), а подпись читают пять мест React-слоя и китов: `filter-model.ts`
  (чип, `op.label`), `render-filter-input.tsx` (имя триггера), `active-filters-bar.tsx`, `OperatorSelect`
  обоих китов.
- ADR 0005 и ADR 0014: определения — объекты из литералов, без чтения свойств и spread на верхнем
  уровне entry `operators`; `tree-shaking.test.ts` это закрепляет.

## Goals / Non-Goals

**Goals:**

- Одна точка разрешения подписи оператора; киты и компоненты получают `label: string` и не знают о
  словаре.
- Частичная правка вложенной группы словаря (`operators.common.contains`, `filtering.presets.today`)
  не стирает соседние записи.
- `ruMessages` полон по типу; недостающий ключ — ошибка typecheck в репозитории.

**Non-Goals:**

- Локаль форматирования (`Intl`) уровня грида, опция `locale` — не трогаем.
- Перевод вендорных примитивов (`components/ui/**` shadcn, календарь react-day-picker, строки
  react-aria) — только документация, как их включить.
- Третий и следующие словари; механизм community-паков.
- `ordering.instructions`, который не обновляется на лету, — ограничение dnd-kit остаётся.

## Decisions

### D1. Форма `messages.operators`

```ts
operators: {
	common: Record<FilterOperator, string>
	date: Record<'greaterThan' | 'greaterOrEqual' | 'lessThan' | 'lessOrEqual', string>
	boolean: Record<'equals' | 'notEquals', string>
}
```

`common` содержит все 17 id готового набора (включая `between`, `in`, `notIn`, `isEmpty`), группы —
только расходящиеся формулировки. Тип группы — объединение ключей `GridMessages['operators']` без
`common`: `OperatorLabelGroup = 'date' | 'boolean'`.

Альтернативы: группы по всем типам ячеек (`text`, `number`, `date`, `select`, …) — дублирование 25
записей ради 6 различий и неясность для `badge`/`progress`; плоский ключ `dateGreaterThan` в одной
группе — смешивает id и тип, ломает «ключ = id» при поиске. Отклонены.

### D2. Пометка `labels` на определении, а не тип колонки

`FilterOperatorBase` получает `labels?: OperatorLabelGroup`. Встроенные определения дат и boolean
пишут её литералом (`labels: 'date'`), остальные — не пишут. Подпись ищется по группе определения,
поэтому `datetime`, собранный из `defaultOperators.byType.date`, получает `After` без настройки
(сценарий спеки). Литерал на определении не нарушает ADR 0005 / 0014: это не чтение свойства и не
spread.

Альтернатива — искать по типу ячейки колонки (`messages.operators[cellType]`): требует открытой
группы под чужие типы и ошибается для своего типа на наборе дат. Отклонена (обсуждение в explore).

### D3. Разрешение подписи — одна функция в core, вызов в React-слое

`resolveOperatorLabel(def, operatorsMessages): string` в `core/src/features/operators/` — цепочка
`def.label ?? messages[def.labels]?.[def.id] ?? messages.common[def.id] ?? def.id`, с `warnOnce`
в development на последнем шаге. Чистая функция, экспортируется с главного entry рядом с
`localizeDatePresets`.

Вызывается там, где React-слой отдаёт операторы колонки UI: список операторов в модели фильтра
(`filter-model.ts`) превращается в `ResolvedOperator = FilterOperatorDef & { label: string }` один
раз, и все читатели (`OperatorSelect`, чип, имя триггера, `active-filters-bar`) получают его. Для
стабильности ссылок результат строится по образцу `localizeDatePresets`: если подпись не изменилась,
возвращается тот же объект, если ни одна не изменилась — тот же массив.

Списочная форма — `resolveOperatorLabels(defs, messages)` рядом с ней. Имя `localizeOperators`
занято историей: так назывался хелпер прежнего `messages.operators`, удалённого в `0d2319a5` (группы
по типу ячейки), и `operators/entry.test.ts` держит его в списке запрещённых экспортов главного entry.
Стабильность ссылок в React-слое — `toOperatorOptions` с `WeakMap` по списку определений: словарь
пересобирается на каждый рендер, поэтому сравниваются сами подписи, а не идентичность словаря.

Альтернатива — разрешать в core при маппинге колонок (`resolve-filtering.ts`): core не видит
словарь (он React-опция) и перерасчёт колонок на смену словаря дороже. Отклонена. Альтернатива —
читать словарь в каждом из пяти мест: пять копий цепочки. Отклонена.

`FilterOperatorDef.label` становится `label?: string`; стаб неизвестного id в
`resolveColumnOperators` сохраняет `label: item`.

### D4. Слияние словаря на два уровня

`resolveMessages` для значения группы, которое само является простым объектом (не функцией и не
строкой), сливает его ещё на уровень: `{ ...resolved[group][key], ...layer[group][key] }`.
Затрагивает `operators.*` и `filtering.presets`. `PartialGridMessages` описывается как
`{ [K]?: { [L in keyof GridMessages[K]]?: GridMessages[K][L] extends Record<string, string> ? Partial<…> : GridMessages[K][L] } }`
— по-прежнему явная двухуровневая форма, не `DeepPartial`, поэтому функции-записи не становятся
частичными. Docblock `resolve.ts` и `PartialGridMessages` обновляются.

Альтернатива — вынести `operators` в три группы верхнего уровня (`operators`, `dateOperators`,
`booleanOperators`): не нужна правка слияния, но группа словаря перестаёт соответствовать опции
конфига `operators`. Отклонена.

### D5. Поставляемые словари

- `core/src/messages/en.ts`: `export const enMessages: GridMessages = defaultMessages`.
- `core/src/messages/ru.ts`: `export const ruMessages: GridMessages = { … }` — полный литерал, без
  spread `defaultMessages` (spread сделал бы недостающий ключ английским молча; полный тип ловит
  его). Функции-записи с русскими плюралами — через `Intl.PluralRules('ru')` внутри модуля.
- Entry tsup `messages/en`, `messages/ru`; `exports` в `package.json`; бюджеты `size-limit` на оба
  (по правилу «реальный размер + ~15%»).
- tsup собирает с `charset: 'utf8'`: экранированная `\uXXXX` кириллица утраивала сырой размер `ru.js`.
  Бюджет `operators` подтянут до 850 B — подписи из него ушли.
- Имена экспортов `enMessages` / `ruMessages`; голое `ru` конфликтует с `react-day-picker/locale`.
- Subpath `messages/*`, а не `locales/*` / `i18n`: `locale` в пакетах уже значит BCP 47 тег
  (`cell.config.locale`), `i18n` обещает фреймворк, которым словарь не является (docblock
  `GridMessages`).
- Re-export из `@ez-kit/data-grid-react`: нет — один путь импорта, как у `operators`.

### D6. ADR и `AGENTS.md`

Новый ADR `0023-operator-labels-in-messages.md` («Related: 0005»): решение — подписи встроенных
операторов в `messages.operators`, `labels` на определении, явный `label` выигрывает; паки `en`/`ru`
полного типа. ADR 0005 получает пометку в Context о том, что пункт «no `messages.operators`» заменён
0023; остальное (поведение из `input`, литералы) — без изменений, поэтому статус 0005 остаётся
Accepted. В `AGENTS.md` из строки 0005 убирается «no `messages.operators`», добавляется короткое
правило со ссылкой на 0023. Обоснование в docblock `defaults.ts` («no other locales ship»)
переписывается: паки поставляются, полнота гарантирована типом.

## Risks / Trade-offs

- [Потребитель читал `def.label` готового набора (свой UI вне грида)] → получает `undefined`. Минор
  для 0.x с пометкой breaking в changeset; в доках — `resolveOperatorLabel` для такого случая.
- [Проект передавал переведённый набор с `label`] → продолжает работать: явный `label` выигрывает.
  Но тогда `ruMessages` не перебьёт его подписи — ожидаемо, описано в доках.
- [Перевод `ru` устаревает при добавлении ключа] → typecheck падает в том же PR; цена — каждый PR
  с новым ключом переводит его. Принято при двух языках.
- [Слияние на два уровня меняет поведение `filtering.presets`] → частичная правка пресетов раньше
  оставляла пропущенные записи английскими через фолбэк; теперь — через слияние. Видимое поведение
  то же; тест `resolve.test.ts` фиксирует.
- [Размер главного entry растёт на ~30 английских строк] → они уходили бы с entry `operators`;
  суммарно для грида с операторами ничего не меняется, грид без операторов платит ~0.5 kB. Бюджет
  `index` пересматривается по факту.
- [Стабильность ссылок операторов при смене словаря] → `resolveOperatorLabel` вызывается в
  мемоизированном по словарю месте модели; лишние перерисовки ловит существующий
  `host-rerender-isolation.test.tsx`.

## Migration Plan

Один PR, без флага. Changeset minor для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` с
секцией breaking: `FilterOperatorDef.label` необязателен, `defaultOperators` без подписей,
`messages.operators`. Откат — revert PR; данные и состояние (`filter value { operator, value }`) не
меняются, persist-ссылки совместимы.
