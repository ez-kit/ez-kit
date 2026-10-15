# data-grid-infinite-pagination Specification

## Purpose

Определяет, как грид в режиме `pagination.mode: 'infinite'` показывает накопленные строки
независимо от набора зарегистрированных фич, как в этом режиме ведут себя `pageIndex` /
`pageSize` и что он сообщает вспомогательным технологиям о числе строк.

## Requirements

### Requirement: Бесконечный режим показывает все накопленные строки

В режиме `pagination.mode: 'infinite'` грид SHALL показывать каждую строку из `data` после
фильтрации, сортировки, группировки и развёртки, без среза по `pageIndex` / `pageSize`. Это MUST
выполняться при любом наборе фич, в том числе когда в нём зарегистрирована модель постраничного
среза (`paginatedRowModel`, входит в `allDataGridFeatures`).

#### Scenario: Полный набор фич и данных больше страницы

- **WHEN** грид создан с `features: allDataGridFeatures`, `pagination: { mode: 'infinite' }`, `pageSize` 10 и 25 строками в `data`
- **THEN** модель строк для отрисовки содержит все 25 строк

#### Scenario: Подгрузка дописывает строки

- **WHEN** `data` грида в режиме `infinite` растёт с 20 до 40 строк
- **THEN** модель строк содержит все 40 строк

#### Scenario: Набор без модели среза

- **WHEN** набор фич не содержит `paginatedRowModel` и включён режим `infinite`
- **THEN** модель строк содержит все строки, как и до изменения

#### Scenario: Вместе с виртуализацией строк

- **WHEN** режим `infinite` с `virtualization.row`, полным набором фич и `data` больше `pageSize`
- **THEN** виртуализатору передаются все строки, и прокрутка до конца доходит до последней накопленной строки

#### Scenario: Ручная подгрузка

- **WHEN** режим `infinite` с `trigger: 'manual'` и `data` больше `pageSize`
- **THEN** модель строк содержит все строки

#### Scenario: Вместе с сортировкой, фильтрацией и группировкой

- **WHEN** в режиме `infinite` с полным набором фич заданы сортировка, фильтр и группировка
- **THEN** модель строк содержит все отсортированные, отфильтрованные и сгруппированные строки, без среза до одной страницы

### Requirement: Набор фич с моделью среза не вызывает предупреждений в бесконечном режиме

Регистрация `paginatedRowModel` рядом с `pagination.mode: 'infinite'` MUST NOT вызывать
предупреждение в development: это допустимая и поддерживаемая конфигурация.

#### Scenario: allDataGridFeatures в бесконечном режиме

- **WHEN** грид создан с `allDataGridFeatures` и `pagination: { mode: 'infinite' }` в development
- **THEN** в консоль не пишется предупреждение о `paginatedRowModel`

### Requirement: Режим пагинации определяется конфигом при одном наборе фич

Один и тот же набор фич SHALL давать постраничный срез в обычном клиентском режиме, данные как
есть при `pagination.manual` и все строки в режиме `infinite`. Смена `pagination.mode` на живом
экземпляре MUST применяться без перемонтирования.

#### Scenario: Клиентская пагинация не меняется

- **WHEN** грид с `allDataGridFeatures`, `pagination: { pageSize: 10 }` и 25 строками
- **THEN** модель строк содержит 10 строк первой страницы

#### Scenario: Серверная пагинация не меняется

- **WHEN** грид с `pagination: { manual: true, rowCount: 100 }` и 10 строками в `data`
- **THEN** модель строк содержит эти 10 строк, а число страниц выводится из `rowCount`

#### Scenario: Переключение с постраничного режима на бесконечный

- **WHEN** экземпляр грида с полным набором фич и 25 строками переводится из `pagination: { pageSize: 10 }` в `pagination: { mode: 'infinite' }`
- **THEN** модель строк сразу содержит все 25 строк

### Requirement: Бесконечный режим начинается с нулевого pageIndex

В режиме `infinite` начальный `pageIndex` MUST быть 0, даже если `initialState.pagination.pageIndex`
задан иначе; засеянный `pageSize` при этом сохраняется. В development ненулевой засеянный
`pageIndex` в этом режиме SHALL вызывать предупреждение.

#### Scenario: Засеянный pageIndex игнорируется

- **WHEN** грид в режиме `infinite` создан с `initialState.pagination: { pageIndex: 2, pageSize: 20 }`
- **THEN** состояние пагинации — `{ pageIndex: 0, pageSize: 20 }`, а модель строк содержит все строки

#### Scenario: Предупреждение о засеянном pageIndex

- **WHEN** то же в development
- **THEN** в консоль пишется одно предупреждение, называющее `initialState.pagination.pageIndex` и режим `infinite`

### Requirement: Число строк для вспомогательных технологий в бесконечном режиме

В режиме `infinite` грид SHALL писать `aria-rowcount="-1"`, пока `hasNextPage` или
`hasPreviousPage` истинно, и MUST NOT писать `aria-rowcount`, когда подгружать больше нечего. `aria-rowindex`
строк MUST отсчитываться от начала накопленного набора, без смещения на `pageIndex · pageSize`.

#### Scenario: Есть следующая страница

- **WHEN** грид в режиме `infinite` с `hasNextPage: true`
- **THEN** у таблицы `aria-rowcount="-1"`

#### Scenario: Есть предыдущая страница

- **WHEN** грид в режиме `infinite` с `hasNextPage: false` и `hasPreviousPage: true`
- **THEN** у таблицы `aria-rowcount="-1"`

#### Scenario: Загружено всё

- **WHEN** грид в режиме `infinite` с `hasNextPage: false` и `hasPreviousPage: false`
- **THEN** у таблицы нет атрибута `aria-rowcount`

#### Scenario: Индекс первой строки

- **WHEN** грид в режиме `infinite` отрисован с первой накопленной строкой
- **THEN** её `aria-rowindex` равен числу строк заголовка плюс 1
