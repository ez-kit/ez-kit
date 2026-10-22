# Spec Delta

## Purpose

Валидация записи строки в data-grid: чем задаётся валидатор, когда грид его прогоняет, как ошибки
попадают в поля и в сообщение формы и что получает обработчик сохранения.

## ADDED Requirements

### Requirement: Валидатор задаётся функцией или Standard Schema

`creating.validate` и `editing.validate` SHALL принимать либо функцию `(values, ctx) =>
ValidationResult | Promise<ValidationResult>`, либо `{ schema }`, где `schema` — любая схема,
реализующая Standard Schema v1. Грид SHALL NOT требовать конкретную библиотеку схем.

#### Scenario: Схема valibot

- **WHEN** `editing.validate` равен `{ schema }` со схемой valibot, и значение `email` не проходит её проверку
- **THEN** сохранение не вызывается, а у поля `email` появляется сообщение из схемы

#### Scenario: Асинхронная схема

- **WHEN** проверка схемы асинхронная и завершается с ошибками
- **THEN** грид дожидается результата и показывает ошибки так же, как для синхронной схемы

### Requirement: Issues схемы раскладываются по полям и форме

Каждое issue схемы с непустым путём SHALL попадать в `errors` под ключом первого сегмента пути.
Несколько issues одного поля SHALL сохраняться списком в исходном порядке. Issues без пути SHALL
объединяться в `formError`.

#### Scenario: Ошибка уровня формы из схемы

- **WHEN** схема проверяет совпадение двух паролей на уровне объекта и возвращает issue без пути с сообщением `'Passwords do not match'`
- **THEN** `formError` равен `'Passwords do not match'`, и сохранение не вызывается

#### Scenario: Несколько сообщений одного поля

- **WHEN** у `password` два issue: `'too short'` и `'needs uppercase'`
- **THEN** `errors.password` равен `['too short', 'needs uppercase']`

#### Scenario: Вложенный путь

- **WHEN** issue имеет путь `['address', 'street']`
- **THEN** сообщение попадает в `errors.address`

### Requirement: Валидатор грида прогоняется при каждом сохранении

Если `validate` задан, грид SHALL прогонять его перед `onSave` при каждом сохранении в любом
режиме: строкой, ячейкой, закреплённой строкой, дефолтной модалкой и своей формой через `submit`.
При непустом результате `onSave` SHALL NOT вызываться. Если `validate` не задан, сохранение SHALL
сразу вызывать `onSave`.

#### Scenario: Своя форма и валидатор грида

- **WHEN** задан `creating.validate`, и своя форма вызывает `submit(values)` с невалидными значениями
- **THEN** `onSave` не вызывается, а `submit` возвращает `{ ok: false, reason: 'rejected' }` с ошибками валидатора

#### Scenario: Валидатор не задан

- **WHEN** `creating.validate` не задан, и своя форма вызывает `submit(values)`
- **THEN** `onSave` вызывается с этими значениями без предварительной проверки

### Requirement: Валидатор грида доступен как чистая функция

Модалка SHALL отдавать `validate(values)`, который прогоняет валидатор грида над переданными
значениями и возвращает `ValidationResult`. Вызов SHALL NOT менять значения, ошибки и статус
формы в состоянии грида. Если валидатор не задан, результат SHALL быть `null`.

#### Scenario: Проверка на blur в своей форме

- **WHEN** своя форма вызывает `validate({ email: 'x' })`, а валидатор отклоняет `email`
- **THEN** результат содержит `errors.email`, а `errors` в состоянии грида не изменились

#### Scenario: Без валидатора

- **WHEN** `validate` не задан в конфиге, а своя форма вызывает `validate(values)`
- **THEN** результат равен `null`

### Requirement: ValidationError из onSave возвращает ошибки в форму

Если `onSave` бросает `ValidationError`, грид SHALL записать его `errors` и `formError` в форму и
оставить её открытой. Любая другая ошибка SHALL оставлять форму открытой с общим сообщением в
`formError` и SHALL пробрасываться дальше.

#### Scenario: Ошибка сервера по полю

- **WHEN** `onSave` бросает `ValidationError({ errors: { email: ['taken'] }, formError: 'Fix the fields below' })`
- **THEN** у поля `email` сообщение `'taken'`, `formError` равен `'Fix the fields below'`, форма открыта

#### Scenario: Неожиданная ошибка

- **WHEN** `onSave` бросает обычный `Error`
- **THEN** форма открыта, `formError` содержит общее сообщение, а ошибка не проглатывается

### Requirement: Значения сохранения — только поля формы

При редактировании в модалке и строкой `values`, которые получают `validate` и `onSave`, SHALL
содержать только поля формы редактирования (без колонок с `editing: false` и без системных), если
своя форма не передала другие ключи через `submit(values)`.

#### Scenario: Нередактируемая колонка не уходит в сохранение

- **WHEN** у колонки `createdAt` стоит `editing: false`, и строка сохраняется из дефолтной модалки
- **THEN** в `values` для `onSave` нет ключа `createdAt`

### Requirement: onSave редактирования получает строку

Контекст `editing.onSave` SHALL содержать `row` — исходный объект редактируемой строки — рядом с
`rowId`, `values` и `signal`, во всех режимах редактирования.

#### Scenario: Оптимистичная блокировка

- **WHEN** редактируется строка `{ id: 7, name: 'A', version: 3 }`, и у колонок нет `version`
- **THEN** `onSave` получает `row.version === 3`, а в `values` ключа `version` нет

### Requirement: Помощник schemaResolver

Пакет SHALL экспортировать `schemaResolver(schema)`, который превращает любую Standard Schema в
функцию-валидатор с тем же результатом, что и `{ schema }`, чтобы схему можно было сочетать со
своими проверками.

#### Scenario: Схема плюс сетевая проверка

- **WHEN** `validate` — функция, которая сначала вызывает `schemaResolver(schema)(values)`, а при отсутствии ошибок проверяет email на сервере
- **THEN** ошибки схемы и ошибка сервера отображаются одинаково, через `errors`
