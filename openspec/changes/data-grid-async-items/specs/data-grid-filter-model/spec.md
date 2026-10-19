# Spec Delta

## MODIFIED Requirements

### Requirement: Варианты значений совпадают со встроенным мультивыбором

Поле `items` модели MUST содержать тот же список, что получает встроенный мультивыбор этой
колонки: список фильтра (`filtering.items` / `filtering.useItems`), иначе базовый список
`cell.config.items` / `cell.config.useItems` для `select` / `badge`, иначе уникальные значения
колонки при включённом `faceted`. При включённом `faceted` у вариантов MUST быть счётчики. Модель
MUST отдавать `itemsLoading` и `itemsError` этого списка: у статического списка `false` и
`undefined`.

#### Scenario: Варианты из конфигурации ячейки

- **WHEN** колонка типа `badge` объявляет `cell.config.items` и не задаёт `filtering.items`
- **THEN** `items` содержит эти варианты с их `label` и `icon`

#### Scenario: Счётчики при faceted

- **WHEN** у колонки включён `filtering.faceted`, и в данных значение `open` встречается 3 раза
- **THEN** у варианта `open` в `items` поле `count` равно 3

#### Scenario: Варианты из хука

- **WHEN** колонка задаёт `cell.config.useItems`, и хук вернул `{ items: [{ value: 'wh_12', label: 'Berlin' }], isLoading: false }`
- **THEN** `items` модели содержит `{ value: 'wh_12', label: 'Berlin' }`, а `itemsLoading` равно `false`

#### Scenario: Список ещё грузится

- **WHEN** хук списка фильтра возвращает `{ items: [], isLoading: true }`
- **THEN** `items` модели пустой, а `itemsLoading` равно `true`

## ADDED Requirements

### Requirement: Счётчик источника важнее faceted

Если вариант пришёл из `items` / `useItems` с полем `count`, модель MUST отдавать этот `count`,
даже если у колонки включён `faceted`. Клиентский faceted MUST проставлять счётчик только тем
вариантам, у которых источник `count` не задал.

#### Scenario: Серверные счётчики не перезаписываются

- **WHEN** хук возвращает `{ value: 'wh_12', label: 'Berlin', count: 4000 }`, у колонки включён `faceted`, и в загруженных строках `wh_12` встречается 12 раз
- **THEN** у варианта `wh_12` в `items` поле `count` равно 4000

#### Scenario: Faceted дополняет варианты без счётчика

- **WHEN** хук возвращает `{ value: 'wh_7', label: 'Bern' }` без `count`, у колонки включён `faceted`, и в строках `wh_7` встречается 3 раза
- **THEN** у варианта `wh_7` в `items` поле `count` равно 3

### Requirement: Ноль и отсутствие счётчика различаются

Если у колонки есть источник счётчиков (включён `faceted` или хотя бы один вариант списка несёт
`count`), вариант, для которого источник ничего не насчитал, MUST получать `count: 0`. Если
источника счётчиков нет, `count` MUST оставаться `undefined`. Встроенный мультивыбор обоих китов
MUST показывать `0` как число и MUST не делать такой вариант недоступным.

#### Scenario: Значение без строк при faceted

- **WHEN** у колонки включён `faceted`, её список содержит `archived`, а в данных нет ни одной строки с `archived`
- **THEN** у варианта `archived` в `items` поле `count` равно 0, и его можно выбрать

#### Scenario: Без faceted счётчика нет

- **WHEN** у колонки не включён `faceted`, и ни один вариант списка не несёт `count`
- **THEN** у всех вариантов `count` равно `undefined`

### Requirement: Подписи faceted-значений из строки

Если варианты фильтра колонки берутся из уникальных значений faceted, а колонка задаёт
`cell.config.getItem`, каждый вариант MUST получать `label`, `icon` (у `badge` ещё `variant`)
из `getItem` строки, в которой встречается это значение. Без `getItem` `label` MUST совпадать с
`String(value)`, как сейчас. Подпись выбранного значения в чипе MUST браться оттуда же.

#### Scenario: Фильтр с названиями без справочника

- **WHEN** колонка `warehouse` с `accessorFn: (r) => r.warehouse.id` задаёт `filtering: { faceted: true }` и `cell.config.getItem: (r) => ({ value: r.warehouse.id, label: r.warehouse.name })`, а в данных две строки склада `wh_12` с названием `Berlin`
- **THEN** `items` модели содержит `{ value: 'wh_12', label: 'Berlin', count: 2 }`

#### Scenario: Чип выбранного faceted-значения

- **WHEN** в той же колонке выбран фильтр `['wh_12']`
- **THEN** чип фильтра показывает `Berlin`

### Requirement: Faceted при серверной фильтрации

Если у грида `filtering.manual: true`, а faceted включён на уровне таблицы или колонки, грид MUST
в режиме разработки один раз предупредить, что facets считаются только по загруженным строкам,
и предложить передавать счётчики через `count` в `useItems`. Поведение faceted при этом MUST
оставаться прежним.

#### Scenario: Предупреждение при manual

- **WHEN** грид объявлен с `filtering: { manual: true, faceted: true }` в режиме разработки
- **THEN** в консоль выводится одно предупреждение, которое называет `filtering.faceted` и `filtering.manual`
