# Design

## Context

См. proposal.md — Why. Текущее устройство, на которое опирается решение:

- Операторы разрешаются в **core**: `column/map-columns/resolve-filtering.ts` читает
  `DEFAULT_OPERATORS_BY_TYPE[cellType]`, `create-table/create-table-options.ts` строит реестр
  `buildOperatorRegistry(table items)`. React-слой получает уже разрешённый список в
  `meta.filtering.operators` и локализует его (`localizeOperators`) в `filter-model.ts` и
  `active-filters-bar.tsx`.
- `createDataGrid` складывает `features` и `context` в слой `factoryDefaults`
  (`create-data-grid.tsx`), а слои сливаются через `mergeOptionLayers` → `deepMerge`: обычные
  объекты рекурсивно, массивы и атомы заменяются; `features` заменяется целиком особым правилом
  (`data-grid-options-context.tsx`).
- Поведение по id: `MULTI_OPERATORS` и `=== Between` в `filter-model.ts` (`editorForOperator`,
  `nextValueFor`), `requiresInput` в `filter-model.ts`, `active-filters-bar.tsx`, `filters-batch.ts`,
  `operators.ts` (`createOperatorFilterFn`), `=== Between` в `date-presets.ts`.
- Измерено esbuild на собранном `dist`: `import { FilterOperator } from '@ez-kit/data-grid-core'`
  даёт около 11.3 KB minified вместе со всеми `filterFn` и подписями. Модуль собирает наборы через
  spread массивов (`...EMPTY_OPERATORS`) и импортирует `defaultMessages`.
- Готовые киты подставляют `allDataGridFeatures` и `DefaultLayout` в своём `data-grid.tsx`, не в
  `index.ts`; это правило AGENTS.md («binding lives in the kit's `data-grid.tsx`»).
- Changeset `data-grid-operator-icons.md` (опция `icons.operators`, табличная замена встроенного
  id) ещё pending; коммит не выходил в релиз.

## Goals / Non-Goals

**Goals:**

- Ни одной проверки конкретного id оператора в коде пакетов грида.
- Набор операторов — значение, которое проходит через слои опций так же, как `features`, но
  сливается по типу ячейки.
- Core не тянет готовый набор; цена набора платится при его импорте.

**Non-Goals:**

- Пресеты дат как конфиг бандла: подписи остаются в словаре (`messages.filtering.presets`),
  `presets: true` и массив колонки не меняются.
- Хелперы сборки набора (`withOperatorLabels`, `withOperatorIcons`, `mapOperators`): проект собирает
  набор сам.
- Санация восстановленного состояния (`columnFilters` с неизвестным оператором или колонкой).
- Проверка на уровне типов, что набор есть для каждого типа ячейки, которому включены операторы.

## Decisions

### 1. `byType` хранит определения, глобального реестра нет

`OperatorsConfig = { byType?: Partial<Record<string, FilterOperatorDef[]>>; defaultByType?:
Partial<Record<string, FilterOperatorId>> }`. Строка в колоночном `items` ищется в `byType[тип]`
колонки; определение в `items` берётся как есть.

Альтернатива — плоский реестр уникальных определений плюс `byType` из id. Отклонена: один `equals`
на все типы должен ветвиться по типу значения внутри `filterFn`, либо id становится `number.equals`,
что ломает формат обмена `{ operator, value }`. С этим уходят `ALL_BUILT_INS`, порядок
«текст побеждает», `TABLE_OPERATORS` (WeakSet), `tableOverride` / `withTableOverrides`.

### 2. Набор течёт через слой опций в core

`TableConfig` (core) получает поле `operators?: OperatorsConfig`. `createDataGrid({ operators })`
кладёт его в `factoryDefaults` рядом с `features` и `context`; провайдер и экземпляр могут задавать
то же поле. `operators` **не** добавляется в особое правило замены `features`: `deepMerge`
рекурсивно сливает `byType` по ключам и заменяет массив одного типа целиком — ровно требуемое
поведение. `resolveFiltering` получает `operators` через `ResolveFilteringOptions` вместо
`registry`.

`createDataGrid` получает `operators` отдельным полем, а не только через `defaults`, по той же
причине, что `features`: это бандловое решение, которое кит подставляет, и оно должно быть видно в
сигнатуре фабрики. Тип при этом не протягивается дженериком — набор не сужает тип конфигурации.

### 3. `FilterOperatorDef` — объединение по `input`, `filterFn` объявлен методом

```ts
type FilterOperatorDef<TValue = unknown> = { id: FilterOperatorId; label: string; icon?: unknown } & (
	| { input: 'none'; filterFn(rowValue: unknown): boolean }
	| { input: 'single'; filterFn(rowValue: unknown, value: TValue): boolean }
	| { input: 'range'; filterFn(rowValue: unknown, value: BetweenValue<TValue>): boolean }
	| { input: 'list'; filterFn(rowValue: unknown, value: readonly TValue[]): boolean }
)
```

`OperatorInput` — const object плюс union (правило репо о замкнутых наборах). `input` обязателен:
без дискриминанта TS ненадёжно сужает контекстный тип колбэка. Метод вместо свойства: параметры
метода бивариантны, поэтому `FilterOperatorDef<number>` присваивается в `FilterOperatorDef[]` без
приведения; это убирает около 38 приведений `as FilterOperatorDef[]` / `as unknown as BetweenValue`.
Ослабленная проверка при присваивании приемлема: грид всё равно передаёт значение строки как
`unknown`, реальная гарантия — форма значения по `input`.

`createOperatorFilterFn` отсекает пустое значение до вызова `filterFn` для любого `input`, кроме
`none` (`undefined`, `null`, `''`, `[]`, диапазон без обеих границ). Встроенные `filterFn`
`between` / `in` / `notIn` перестают проверять пустоту сами.

### 4. Поведение выводится из `input` в одной функции

В React-слое одна точка: `inputOf(operators, id): OperatorInput | undefined` (поиск определения по
id в разрешённом списке колонки). Её используют:

| место                                      | было                                              | стало                                                                                                    |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `editorForOperator`                        | `requiresInput`, `=== Between`, `MULTI_OPERATORS` | `none` → None, `range` → Between, `list` → MultiSelect                                                   |
| `nextValueFor`                             | по id `between`                                   | `none` → без значения; `range` → `{}`; другой `input`, чем у текущего → без значения; тот же → сохранить |
| `isEmptyFilterValue`, `renderValueDisplay` | `requiresInput === false`                         | `input === 'none'`                                                                                       |
| `presetsForOperator`                       | `=== Between`                                     | `range` → диапазонные, `single` → одиночные, иначе — ни одного                                           |

Смена оператора между разными `input` теперь сбрасывает значение (`in` → `equals` раньше сохраняло
массив, `contains` → `in` — строку). Это осознанное изменение: значение другой формы оператор не
может принять. Между двумя `range` (`between` → `notBetween`) диапазон сохраняется.

Контрол диапазона по-прежнему выбирает разбор границ по типу ячейки (`date` → даты, иначе числа,
`render-filter-input.tsx`); оператор `range` на текстовой колонке получит числовые поля — так же, как
сегодня `between` на ней. `list` на колонке без вариантов показывает пустой мультивыбор.

### 5. Подписи только в определении

`label: string` обязателен. Удаляются `messages.operators.{text,number,date,boolean,multi,empty}`,
`OPERATOR_GROUP_BY_CELL_TYPE`, `localizeOperators`; `messages.operators.presets` переезжает в
`messages.filtering.presets`, `localizeDatePresets` читает его оттуда. Готовый набор пишет английские
подписи прямо в определениях (дата — `After`, `On or before`, …; boolean — `Is`, `Is not`). Строка, а
не `ReactNode`: подпись идёт в `textValue` пункта меню HeroUI (typeahead, доступное имя), в
`messages.filtering.operatorTrigger({ label })` и в текст чипа; все остальные подписи, которые пишет
потребитель (`SelectItem.label`, `ActionItem.label`), тоже строки.

### 6. Готовый набор на subpath `./operators`, без spread

Новый entry `@ez-kit/data-grid-core/operators` (`src/operators/entry.ts` → `dist/operators/index.js`
в `tsup`, `exports`, `size-limit`): `defaultOperators`, `FilterOperator`, `DEFAULT_OPERATOR_ICONS`.
Каждое определение — отдельная константа; наборы перечисляют элементы
(`text: [contains, equals, notEquals, startsWith, endsWith, isEmpty, isNotEmpty]`), без spread и без
импорта `defaultMessages`. Определения с разной логикой по типу — разные константы с общим id
(`textEquals`, `numberEquals`, …), экспортируются только через `defaultOperators`. Главный entry
сохраняет типы (`FilterOperatorDef`, `OperatorInput`, `OperatorsConfig`, `StructuredFilterValue`,
`BetweenValue`) и `OperatorInput`; `FilterOperator`, `DEFAULT_OPERATORS_BY_TYPE`,
`DEFAULT_OPERATOR_ID_BY_TYPE`, `*_OPERATORS` из главного entry уходят.

`defaultByType` готового набора: `text` / `image` / `link` → `contains`, `select` / `badge` → `in`;
у остальных первым в наборе стоит оператор по умолчанию (`equals`), поэтому `defaultByType` их не
называет.

Гарантию держит `apps/docs/test/tree-shaking.test.ts`: (а) `{ createTable }` из `.` не достигает
entry `operators`; (б) `{ FilterOperator }` из `./operators` не содержит тела `filterFn` (литерал из
тела, например `.endsWith(`); (в) полный набор `@ez-kit/*` entry для `{ defaultOperators }`. Цифры —
в тесте, не в прозе.

Альтернатива — `/* @__PURE__ */` на сборке наборов. Отклонена по уже записанному в AGENTS.md
измерению: esbuild не роняет вызов со spread в аргументе; литералы без spread этого не требуют.

### 7. Киты подставляют `defaultOperators` в `data-grid.tsx`

Обе `data-grid.tsx` передают `operators: defaultOperators` в тот же `createDataGrid`, что
`allDataGridFeatures`. Импорт `@ez-kit/data-grid-core/operators` живёт только там: подъём в
`index.ts` или `core-components` тихо дал бы набор каждому составному гриду. Тест tree-shaking для
кита фиксирует: `DataGrid` достигает entry `operators`, `createDataGrid` — нет.

### 8. Без набора и неизвестный id — предупреждения в development

- `createTableOptions`: табличный `filtering.operators === true` и пустой `operators.byType` →
  одно `console.warn` на создание таблицы; колонки не предупреждают повторно (существующее правило
  «под табличным `true` колонка молчит»). Колонка, включившая операторы сама, предупреждает как
  сейчас, с текстом без упоминания `defineCellType`.
- Неизвестный id в значении: `createOperatorFilterFn` хранит `Set` уже предупреждённых id в замыкании
  колонки и предупреждает при первой встрече; поведение (пропустить все строки) не меняется.
  Переключатель и чип уже показывают сырой id.

### 9. Удаления

`TableOperatorsConfig.items` (и сам тип, если пустеет — `filtering.operators` на таблице становится
`boolean`), `buildOperatorRegistry`, `OperatorRegistry`, `defineCellType`'s `operators` /
`defaultOperator`, `GridIcons` / `ResolvedGridOptions.icons` / опция `icons` целиком (других ключей
в ней нет), `data-grid/operator-icons.ts`; `FilterOperatorOption` остаётся как определение с
итоговой иконкой, но иконка теперь — `def.icon`.

## Risks / Trade-offs

- [Бивариантный `filterFn` пропустит определение с неверным типом параметра при присваивании в
  набор] → форма значения закреплена объединением по `input`; тесты готового набора проверяют каждое
  определение реальными значениями.
- [Смена оператора между разными `input` теперь сбрасывает значение] → описано в changeset;
  правило покрыто сценариями модели.
- [Наборы разных бандлов различаются, ссылки с исчезнувшим id перестают фильтровать] →
  предупреждение в development и абзац в `operators.mdx` (оставить старый id в наборе как алиас).
- [Набор, пересобираемый на каждом рендере провайдера, заново разрешает операторы всех колонок] →
  документация показывает `useMemo`; по правилу «stable values» тест изоляции рендера не трогается,
  потому что `operators` — опция, а не значение контекста.
- [Проект, который переводил операторы словарём, теряет перевод молча — ключей больше нет в типе
  `messages`, но лишний ключ в объекте-литерале словаря даст ошибку типов] → это и есть сигнал
  миграции; changeset называет замену.

## Migration Plan

1. Core: тип определения, `OperatorInput`, `OperatorsConfig`, `TableConfig.operators`; разрешение
   через `byType`; удаление реестра и локализации; пустое значение в `createOperatorFilterFn`.
2. Entry `./operators` с готовым набором без spread; удаление констант из главного entry.
3. React: `createDataGrid({ operators })`, слои, `inputOf` и все потребители, удаление `icons`.
4. Киты: `data-grid.tsx` подставляют `defaultOperators`.
5. Docs, примеры, `page-type-map`, `tree-shaking.test.ts`, `size-limit`, AGENTS.md, changesets.

Откат — revert change целиком: формат `columnFilters` (`{ operator, value }`) не меняется, поэтому
сохранённые фильтры совместимы в обе стороны, пока набор содержит их id.
