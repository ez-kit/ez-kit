# Spec Delta

## Purpose

Определяет, откуда фильтр колонки или поля берёт accessible name и видимую подсказку, и
гарантирует, что подсказка, заданная автором, никогда не подменяет имя поля для вспомогательных
технологий.

## ADDED Requirements

### Requirement: Подсказка фильтра задаётся на колонке

Колонка MUST принимать `filtering.placeholder` — строку, которую её фильтр показывает как видимую
подсказку. Поле из `filtering.fields` MUST принимать ту же опцию в своём `filtering` и показывать её
так же, как колонка.

#### Scenario: Текстовый фильтр колонки показывает подсказку

- **WHEN** колонка `inn` объявлена с `filtering: { placeholder: '10 цифр' }`
- **THEN** её текстовый фильтр показывает placeholder `10 цифр`

#### Scenario: Поле показывает подсказку

- **WHEN** грид объявлен с `filtering: { manual: true, fields: [{ id: 'warehouse', header: 'Склад', filtering: { placeholder: 'Код склада' } }] }`
- **THEN** текстовый фильтр поля `warehouse` показывает placeholder `Код склада`

### Requirement: Без подсказки placeholder равен имени фильтра

Если колонка или поле не задаёт `filtering.placeholder`, видимый placeholder фильтра MUST совпадать
с его accessible name, то есть с результатом `messages.filtering.placeholder`.

#### Scenario: Колонка без подсказки

- **WHEN** колонка `email` с заголовком `Email` не задаёт `filtering.placeholder`, а словарь
  дефолтный
- **THEN** её текстовый фильтр показывает placeholder `Filter Email…` и имеет accessible name
  `Filter Email…`

### Requirement: Подсказка не становится именем фильтра

Accessible name текстового инпута и компонента фильтра cell-type MUST всегда браться из
`messages.filtering.placeholder`, независимо от `filtering.placeholder`. Имя триггера мультивыбора
MUST содержать это имя фильтра и его видимый текст (подсказку или сводку выбранного), чтобы
видимая надпись входила в имя (WCAG 2.5.3); одна подсказка без имени фильтра именем MUST не быть.

#### Scenario: Текстовый фильтр с подсказкой

- **WHEN** колонка `inn` с заголовком `ИНН` объявлена с `filtering: { placeholder: '10 цифр' }`,
  а словарь дефолтный
- **THEN** её текстовый фильтр показывает placeholder `10 цифр` и имеет accessible name
  `Filter ИНН…`

#### Scenario: Мультивыбор с подсказкой

- **WHEN** колонка `status` с заголовком `Status` и операторами `in` / `notIn` объявлена с
  `filtering: { placeholder: 'Любой статус' }`
- **THEN** триггер мультивыбора показывает `Любой статус`, пока ничего не выбрано, а его
  accessible name содержит и `Filter Status…`, и `Любой статус`

#### Scenario: Мультивыбор с выбранными значениями

- **WHEN** у колонки `status` с заголовком `Status` выбрано значение `Open`
- **THEN** accessible name триггера содержит и `Filter Status…`, и `Open`

### Requirement: Подсказка доходит до собственных компонентов фильтра

Итоговая подсказка (`filtering.placeholder`, а без неё имя фильтра) MUST передаваться как
`placeholder` компоненту фильтра cell-type и компоненту `filtering.component`. Диапазонный фильтр
`between` MUST её не использовать и MUST сохранять свои подписи границ.

#### Scenario: filtering.component получает подсказку

- **WHEN** колонка объявлена с `filtering: { component: MyInput, placeholder: 'Например, Acme' }`
- **THEN** `MyInput` получает `placeholder: 'Например, Acme'`

#### Scenario: Компонент cell-type получает подсказку

- **WHEN** колонка `amount` с `cell: 'number'` объявлена с `filtering: { placeholder: 'Сумма' }`
- **THEN** компонент фильтра типа `number` получает `placeholder: 'Сумма'`, и оба кита показывают
  его в числовом поле

#### Scenario: between игнорирует подсказку

- **WHEN** колонка `amount` объявлена с `filtering: { placeholder: 'Сумма', operators: true }`, и
  выбран оператор `between`
- **THEN** границы диапазона показывают подписи из `messages.filtering.from` / `to`

### Requirement: Дефолтное имя фильтра называет заголовок

Функция `messages.filtering.placeholder` MUST получать `label` вместе с `columnId`: строковый
заголовок колонки, а если его нет, id колонки; для поля — его `header`. Дефолтный английский
словарь MUST строить имя как `Filter <label>…`. Словарь, который читает только `columnId`, MUST
продолжать работать.

#### Scenario: Заголовок колонки в дефолтном имени

- **WHEN** колонка `firstName` с заголовком `First name` рендерит фильтр при дефолтном словаре
- **THEN** имя фильтра `Filter First name…`

#### Scenario: Колонка с нестроковым заголовком

- **WHEN** колонка `firstName` с заголовком-функцией рендерит фильтр при дефолтном словаре
- **THEN** имя фильтра `Filter firstName…`

#### Scenario: Собственный словарь на columnId

- **WHEN** грид получает `messages: { filtering: { placeholder: ({ columnId }) => 'Фильтр по ' + columnId } }`
- **THEN** фильтр колонки `email` называется `Фильтр по email`
