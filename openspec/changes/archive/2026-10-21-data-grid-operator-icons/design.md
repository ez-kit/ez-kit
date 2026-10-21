# Design

## Context

Мотивация — в proposal.md, требования — в `specs/data-grid-filter-operators`,
`specs/data-grid-operator-control` и `specs/data-grid-filter-model`.

Как оператор доходит до экрана сейчас:

```
table filtering.operators.items ----> buildOperatorRegistry(): Map(built-ins, затем table)
                                              |
column filtering.operators                    v
   true / нет items ------------> DEFAULT_OPERATORS_BY_TYPE[cellType]   (registry не читается)
   { items: ['contains', def] } -> cellTypeById.get(id) ?? registry.get(id)   (тип побеждает)
                                              |
                                              v  resolve-filtering.ts
                                  ColumnFilteringMeta.operators
                                              |
                                              v  filter-model.ts: localizeOperators (по id)
                                  FilterModel.operators
                                              |
                                              v  render-filter-input.tsx: renderOperatorFilter
   <div data-slot="filter-control"> editor + presets + clear </div>
   <OperatorSelect/>                                  <-- отдельная строка под полем
```

`render-filter-input.tsx` рендерит переключатель в шести ветках: `none` (только он), `between`,
`multiSelect` (без обёртки `filter-control`), `filtering.component`, cell-type и текстовое поле.
Оба кита растягивают первый элемент `filter-control` (`> *:first-child { flex-auto }`), а heroui
раскладывает `header-extras` столбцом.

Опции экземпляра собираются из трёх слоёв (`mergeGridOptionLayers`: factory `defaults` <
провайдер < экземпляр) функцией `deepMerge`. Она сливает объекты по ключам, React-элементы
заменяет целиком и не даёт `true` затереть объект. Внутри фичи объект означает «включено»
(`featureConfig`, `tableOperators = cfg !== false`).

## Goals / Non-Goals

**Goals:**

- Одна функция выбирает иконку оператора. Её читают и встроенный фильтр, и модель.
- Переопределение встроенного оператора реестром таблицы меняет логику и подпись, но не трогает
  встроенные наборы, когда таблица ничего не переопределяет.
- Контракт компонентов не растёт: новых слотов нет, `OperatorSelectProps` меняется только
  расширением типа `operators`.

**Non-Goals:**

- Переопределение оператора для одного типа ячейки (пара «тип + id»). Переопределение действует
  на все типы, это задокументировано.
- Иконки для других частей грида. `icons` — объект ради будущих наборов, но в этой change в нём
  только `operators`.
- Иконки в чипах активных фильтров и в `FilterPanel`: там остаётся подпись.

## Decisions

**`icons` на верхнем уровне конфига, а не в `filtering.operators`.** Объект внутри фичи её
включает, поэтому `createDataGrid({ defaults: { filtering: { operators: { icons } } } })` включил
бы фильтрацию и операторы во всех гридах бандла. А задать иконки один раз в defaults — главный
сценарий. Подписи операторов тоже живут вне `filtering`, в `messages.operators`, и иконки
ложатся рядом с ними. Новое поле `UseDataGridConfig.icons?: GridIcons` автоматически попадает в
`DataGridDefaultOptions` (это `Omit` от конфига) и сливается `deepMerge` по id. В
`ResolvedGridOptions` появляется `icons: { operators: Partial<Record<string, ReactNode>> }`,
всегда объект, как `messages`. Отвергнуто: флаг `enabled`-нейтральности внутри
`filtering.operators` — он ломает правило «объект = включено», на котором стоит весь конфиг.

**По умолчанию — подпись, знаки — по выбору.** Знаки по умолчанию уже были и были убраны в
`6c179f3d` (#63): в закрытом селекте они нечитаемы без легенды. Эта change то решение не
пересматривает. Встроенные знаки — готовая карта `DEFAULT_OPERATOR_ICONS: Record<FilterOperator,
string>` в core, которую включают одной строкой: `createDataGrid({ defaults: { icons: {
operators: DEFAULT_OPERATOR_ICONS } } })`. Знаки не лежат в `def.icon` встроенных операторов: там
они перебивали бы `icons.operators`, а показывались бы всем без спроса. Выбор иконки — одна
чистая функция в React-слое, `resolveOperatorIcon(def, icons)`: `def.icon ??
icons.operators[def.id]`. Её вызывает `resolveFilter`, и иконка попадает в
`FilterModel.operators`. Рендерер берёт её из модели и сам ничего не выбирает. Отвергнуто:
знаки по умолчанию с меню как легендой. Голый `≥` в закрытой кнопке — ровно то, на что
жаловались в #63.

**`FilterOperatorDef.icon?: unknown` в core, `ReactNode` в React.** Тот же приём, что у
`SelectItem.icon`: core не зависит от React. В React-пакете появляется тип
`FilterOperatorOption = Omit<FilterOperatorDef, 'icon'> & { icon?: ReactNode }`, и
`FilterModel.operators` с `OperatorSelectProps.operators` типизируются им. Для кита это
расширение того, что он получает, поэтому сторонний кит компилируется без правок.

**Переопределения таблицы помечаются, а реестр остаётся одним `Map`.** `buildOperatorRegistry`
по-прежнему возвращает `Map<string, FilterOperatorDef>` — это публичный тип `OperatorRegistry`, и
менять его форму ради внутреннего различия незачем. Объекты из `filtering.operators.items`
таблицы core помечает во внутреннем `WeakSet`. `resolveColumnOperators` прогоняет набор типа
ячейки через помеченные (`op => tableOverride(registry, op.id) ?? op`), а id из `items` колонки
ищет в порядке: переопределение таблицы, набор типа, общий реестр. Набор без переопределений
возвращается той же ссылкой, что и сейчас. Отвергнуто: просто поменять порядок поиска на «реестр,
потом тип». Встроенный общий реестр содержит, например, текстовый `equals`, и он перебил бы
числовой `equals` у числовой колонки. Отвергнуто и разделить реестр на два `Map`: это меняет
экспортируемый тип, а метка даёт то же различие без этого.

**Подпись переопределения защищена той же меткой.** `localizeOperators` пропускает объекты,
помеченные при сборке реестра. Метка
по ссылке, а не по id: inline-оператор колонки, собранный из встроенного (`{ ...op, filterFn }`),
по-прежнему получает подпись из словаря, как сейчас. Публичного API у метки нет. Отвергнуто:
локализовать только встроенные объекты по ссылке. Это сломало бы как раз такие inline-копии.

**Строка фильтра собирается в одном месте.** `renderOperatorFilter` больше не возвращает
переключатель отдельным соседом: каждая ветка рендерит
`<div data-slot="filter-control"><div data-slot="filter-operator">…</div>{editor}{presets}{clear}</div>`,
включая мультивыбор и `none`. Для `none` вместо редактора идёт
`<span data-slot="filter-operator-label">` с подписью оператора. Обёртка `filter-operator` нужна
только стилям китов: за неё они держат кнопку по её ширине, а соседний контрол растягивают
(`[data-slot='filter-operator'] + *`). Отвергнуто: класть кнопку внутрь поля как adornment. Это
возможно только для `core.Input`, а фильтры cell-type, `between`, мультивыбор и
`filtering.component` — чужие контролы без слота под префикс.

**Тултип — в ките, а не в react-слое.** Первый вариант оборачивал переключатель в `core.Tooltip`.
Но кнопка — триггер меню кита, а shadcn собирает такую связку как `TooltipTrigger asChild` →
`DropdownMenuTrigger asChild` → `Button`: обернуть снаружи корень меню, который не рендерит
элемента, нельзя. Поэтому тултип с полной подписью рисует сам `OperatorSelect` кита, на своих
примитивах.

**Кнопка-триггер меню вместо combobox, в ките.** Слот `OperatorSelect` остаётся и рисуется
китом: shadcn — на вендоренном `dropdown-menu` (`DropdownMenuRadioGroup`), heroui — на своём
`Dropdown` с одиночным выбором. `core.Menu` не подходит: его иконки — это именованный
`GridMenuIcon`, а не произвольный `ReactNode`, а отмечать выбранный пункт он не умеет. Без
иконки кит показывает подпись в кнопке с ограниченной шириной и `text-overflow: ellipsis`.

**Имя кнопки — новое сообщение.** Видимый знак ничего не говорит скринридеру («asterisk a
asterisk»), а combobox раньше сам объявлял значение. Кит ставит `aria-label` из
`messages.filtering.operatorTrigger({ label })` (дефолт `Filter operator: ${label}`), меню
называется прежним `messages.filtering.operator`. Сообщение — новый ключ, поэтому собственные
словари, где его нет, получают английский дефолт и компилируются как раньше. Отвергнуто: склейка
строк в ките (`${operator}: ${label}`). Порядок и пунктуацию так не локализовать.

**Стили строки — в китах.** Правило `[data-slot='filter-control'] > *:first-child { flex-auto }`
в обоих `styles.css` растянуло бы кнопку оператора. Его заменяет правило, которое растягивает
контрол значения и оставляет кнопку и `filter-operator-label` по содержимому. В react-пакете
стилей не появляется.

## Risks / Trade-offs

- [Переопределённый `equals` заменяет числовой, датовый и текстовый одним `filterFn`, и автор
  может этого не ждать] → Докстринг `TableOperatorsConfig` и `operators.mdx` говорят это прямо.
  Раньше переопределение не работало вовсе, так что сломать работающий код оно не может.
- [Тесты и e2e ищут `combobox` с именем `Filter operator`] → Задача на обновление селекторов.
  `e2e-slots.test.ts` поймает новый slot-литерал, который не стилизован или не найден.
- [Подписи разной длины делают кнопки разной ширины, длинная («Greater than or equal») обрезается]
  → Ширина кнопки ограничена, полная подпись остаётся в tooltip, accessible name и меню. Кому
  нужна компактность, включает знаки одной строкой.
- [Юникод-знак в шрифте темы может выглядеть иначе (`≠∅`, `↔`)] → Знаки — опция; вместо
  `DEFAULT_OPERATOR_ICONS` кит или приложение передают свои иконки.
- [В узкой колонке кнопка отнимает ширину у поля] → Кнопка квадратная по высоте поля; при
  fallback на подпись ширина ограничена.

## Migration Plan

Миграции данных нет. Changeset `minor` для `@ez-kit/data-grid-core` (иконка, карта знаков,
поведение реестра) и `@ez-kit/data-grid-react` (`icons`, `operatorTrigger`, раскладка,
`FilterOperatorOption`) описывает два видимых изменения: переключатель переехал в строку поля,
а переопределение встроенного оператора теперь работает. Откат — revert change.
