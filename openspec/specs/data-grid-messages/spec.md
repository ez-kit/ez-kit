# data-grid-messages Specification

## Purpose

Определяет словарь пользовательских строк грида: откуда грид берёт каждую видимую строку и каждое
accessible name, как проект заменяет часть строк или весь словарь и какие полные словари поставляет
пакет.

## Requirements

### Requirement: Каждая строка грида берётся из словаря

Каждая видимая строка, `placeholder` и accessible name, которые рендерят пакеты грида, MUST
браться из словаря `GridMessages`. Без опции `messages` грид MUST использовать английский словарь
`defaultMessages`.

#### Scenario: Грид без словаря

- **WHEN** грид с пагинацией рендерится без опции `messages`
- **THEN** подпись селектора размера страницы — `Rows per page`, а accessible name таблицы — `Data grid`

#### Scenario: Подпись оператора из словаря

- **WHEN** грид получает `messages: { operators: { common: { contains: 'Содержит' } } }`, а текстовая колонка из готового набора открыта с оператором `contains`
- **THEN** кнопка оператора, пункт меню и чип активного фильтра показывают `Содержит`

### Requirement: Частичный словарь сливается по записям группы

Опция `messages` MUST принимать любое подмножество словаря, группа за группой. Запись, которую
словарь не называет, MUST оставаться из нижнего слоя, в том числе внутри названной группы.

#### Scenario: Одна запись группы

- **WHEN** грид получает `messages: { pagination: { rowsPerPage: 'Строк на странице' } }`
- **THEN** селектор размера страницы подписан `Строк на странице`, а кнопка следующей страницы называется `Next page`

#### Scenario: Одна подпись оператора

- **WHEN** грид получает `messages: { operators: { date: { greaterThan: 'Позже' } } }`
- **THEN** `greaterThan` у колонки типа `date` подписан `Позже`, а `lessThan` той же колонки — `Before`

### Requirement: Словарь задаётся на трёх слоях опций

`messages` MUST задаваться в `createDataGrid`, в `DataGridOptionsProvider` и в конфиге экземпляра.
Верхний слой MUST заменять только записи, которые он называет.

#### Scenario: Словарь приложения и правка одного грида

- **WHEN** `DataGridOptionsProvider` задаёт `messages: ruMessages`, а грид под ним задаёт `messages: { fallbacks: { empty: 'Заказов нет' } }`
- **THEN** пустой грид показывает `Заказов нет`, а остальные строки этого грида — из `ruMessages`

### Requirement: Пакет поставляет полные словари en и ru

Каждый из subpath'ов `@ez-kit/data-grid-core/messages/en` и `@ez-kit/data-grid-core/messages/ru`
MUST экспортировать словарь под именем `messages`. Оба MUST иметь тип полного `GridMessages`;
английский словарь MUST совпадать с `defaultMessages`. В сценариях ниже `enMessages` и `ruMessages`
обозначают локальные имена этих импортов.

#### Scenario: Русский грид одним импортом

- **WHEN** грид получает `messages: ruMessages`, а текстовая колонка открыта с оператором `contains`
- **THEN** ни одна видимая строка и ни одно accessible name, которые рендерит сам грид, не на английском, включая подпись оператора и имя чекбокса выбора строки

#### Scenario: Английский словарь — тот же объект

- **WHEN** потребитель сравнивает `enMessages` и `defaultMessages`
- **THEN** это один и тот же объект

### Requirement: Новая запись словаря требует перевода в каждом поставляемом словаре

Поставляемый словарь MUST NOT проходить проверку типов, если в `GridMessages` есть запись, которой в
нём нет.

#### Scenario: Ключ без перевода

- **WHEN** в `GridMessages` добавлена запись, а в `ruMessages` её нет
- **THEN** проверка типов пакета сообщает об ошибке в `ruMessages`

### Requirement: Импорт словаря не тянет другие словари

Импорт `ruMessages` MUST NOT включать в бандл другие поставляемые словари, кроме английского, на
который грид опирается сам. Импорт грида без subpath'а `messages/*` MUST NOT включать `ruMessages`.

#### Scenario: Грид без русского словаря

- **WHEN** приложение импортирует только `createTable` из `@ez-kit/data-grid-core`, и бандл собирается esbuild
- **THEN** в бандле нет ни одного модуля entry `@ez-kit/data-grid-core/messages/ru`

### Requirement: Словарь читается вне грида

`useGridMessages` MUST возвращать полный словарь грида внутри `<DataGrid>` и `defaultMessages` вне
него, не выбрасывая ошибку.

#### Scenario: Компонент вне грида

- **WHEN** компонент, вызывающий `useGridMessages`, рендерится без `<DataGrid>` вокруг
- **THEN** он получает `defaultMessages`
