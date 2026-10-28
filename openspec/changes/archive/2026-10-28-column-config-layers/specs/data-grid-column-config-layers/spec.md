# Spec Delta

## Purpose

Даёт каждой поверхности колонки — фильтру, редактору, форме создания — свой слой конфига поверх
`cell.config`, чтобы кит и автор колонки передавали настройку одной колонки своему компоненту этой
поверхности, не показывая её остальным.

## ADDED Requirements

### Requirement: Слой поверхности мержится поверх базового конфига

Колонка MUST принимать `filtering.config`, `editing.config` и `creating.config`. Рендерер
поверхности MUST получать один `config`: `cell.config`, поверх которого по ключам наложен слой этой
поверхности. Ключ слоя MUST заменять значение базы целиком, без слияния вложенных объектов и
массивов. Ячейка MUST получать только `cell.config`.

#### Scenario: Слой фильтра дополняет базу

- **WHEN** колонка объявлена с `cell: { type: 'number', config: { decimals: 2 } }` и `filtering: { config: { step: 5 } }`
- **THEN** фильтр колонки получает `config` `{ decimals: 2, step: 5 }`, а ячейка получает `{ decimals: 2 }`

#### Scenario: Слой заменяет ключ базы целиком

- **WHEN** у колонки `cell.config` `{ format: { unit: 'kg', digits: 1 } }`, а `editing.config` `{ format: { unit: 't' } }`
- **THEN** редактор колонки получает `config.format`, равный `{ unit: 't' }`

#### Scenario: Слой одной поверхности не виден другим

- **WHEN** у колонки задан только `filtering.config: { creatable: true }`
- **THEN** редактор, форма создания и ячейка колонки получают `config` без ключа `creatable`

### Requirement: Форма создания наследует слой редактора

Форма создания MUST получать `cell.config`, поверх него `editing.config`, поверх него
`creating.config` — по ключам, в этом порядке.

#### Scenario: Создание без своего слоя

- **WHEN** у колонки задан `editing.config: { mask: 'phone' }` и нет `creating.config`
- **THEN** поле формы создания получает `config.mask`, равный `'phone'`

#### Scenario: Создание переопределяет один ключ

- **WHEN** у колонки `editing.config: { mask: 'phone', hint: 'a' }` и `creating.config: { hint: 'b' }`
- **THEN** поле формы создания получает `config` `{ mask: 'phone', hint: 'b' }`, а редактор получает `{ mask: 'phone', hint: 'a' }`

### Requirement: Список поверхности стоит выше слоя

Если поверхность колонки `select` / `badge` разрешила свой список значений (`*.items` / `*.useItems`
или базовый), `config.items` рендерера MUST быть этим списком, что бы ни лежало в базе и в слое.

#### Scenario: Список фильтра поверх слоя

- **WHEN** колонка `select` объявлена с `cell.config.items` `A`, `filtering.items` `B` и `filtering.config: { creatable: true }`
- **THEN** фильтр получает `config` с `items` `B` и `creatable: true`

### Requirement: Слой не задаёт список значений

Тип слоя MUST NOT допускать ключи `items` и `useItems`. Если слой всё же содержит один из них (код
без проверки типов), грид MUST игнорировать этот ключ и в режиме разработки MUST один раз
предупредить, назвав колонку, поверхность и опцию `*.items`, которой задаётся список.

#### Scenario: items в слое из JavaScript

- **WHEN** в режиме разработки колонка `select` получает `filtering: { config: { items: [x] } }`
- **THEN** в консоль выводится предупреждение с id колонки и `filtering.items`, а фильтр предлагает список из `cell.config.items`

#### Scenario: items в слое не компилируется

- **WHEN** колонка бандла записывает `editing: { config: { items: [] } }`
- **THEN** это ошибка компиляции

### Requirement: Колонка без слоёв получает прежний конфиг

Колонка, которая не задаёт ни одного слоя, MUST получать в каждом рендерере тот же `config`, что и
до появления слоёв, включая его отсутствие, когда у колонки нет ни `cell.config`, ни списка.

#### Scenario: Колонка без конфига

- **WHEN** колонка `text` без `cell.config` и без слоёв рендерит свой `filtering.component`
- **THEN** пропы компонента не содержат ключа `config`

### Requirement: Получатели смерженного конфига

Смерженный `config` своей поверхности MUST получать `filtering.component`, `editing.component`,
`creating.component`, рендереры `filtering` / `editing` / `creating` типа ячейки и слоты кита
`MultiSelectFilter` и `BetweenInput`. Общий слот ввода (`core.Input`) и выбор оператора
(`OperatorSelect`) MUST NOT получать `config`.

#### Scenario: Слот мультивыбора получает слой

- **WHEN** колонка с `filtering: { operators: true, config: { creatable: true } }` фильтруется оператором `in`
- **THEN** `MultiSelectFilter` получает `config.creatable`, равный `true`, в фильтре заголовка, в поповере заголовка и в панели фильтров

#### Scenario: Слот диапазона получает слой рядом со своими границами

- **WHEN** числовая колонка задаёт `filtering: { operators: { betweenOperator: { min: 0, max: 10 } }, config: { unit: '%' } }` и фильтруется оператором `between`
- **THEN** `BetweenInput` получает `min: 0`, `max: 10` отдельными пропами и `config.unit`, равный `'%'`

#### Scenario: Переиспользуемый компонент различает колонки

- **WHEN** один `filtering.component` назначен двум колонкам с `filtering.config: { creatable: true }` и `{ creatable: false }`
- **THEN** каждый экземпляр компонента получает `config.creatable` своей колонки

### Requirement: Грид не интерпретирует слой

Грид MUST передавать содержимое слоя без изменений и MUST NOT менять от него поведение фильтрации,
редактирования, создания или сопоставления значений.

#### Scenario: Флаг слоя не меняет фильтрацию

- **WHEN** колонка фильтруется оператором `in` с `filtering.config: { creatable: true }`
- **THEN** строки отбираются `filterFn` оператора так же, как без слоя

### Requirement: Бандл объявляет тип слоёв

`createDataGrid` MUST принимать `columnConfig`, созданный `defineColumnConfig<T>()`, где `T`
описывает слои по поверхностям (`filtering`, `editing`, `creating`). Маркер MUST нести только тип и
MUST NOT менять поведение грида. Тип слоёв бандла MUST NOT влиять на другие бандлы и голые гриды той
же программы.

#### Scenario: Два бандла с разными слоями

- **WHEN** в одной программе бандл `A` объявляет `filtering: { creatable?: boolean }`, а бандл `B` — `filtering: { mode?: 'tags' }`
- **THEN** колонка бандла `A` с `filtering.config: { mode: 'tags' }` не компилируется, а колонка бандла `B` с ним компилируется
