# Proposal

## Why

Потребителям нужна короткая подсказка в фильтре колонки («10 цифр», «например, Acme»), а сейчас
текст в фильтре нельзя задать для отдельной колонки. У всех фильтров один источник:
`messages.filtering.placeholder({ columnId })`. Эта строка служит и видимым placeholder, и
accessible name, поэтому её нельзя просто заменить подсказкой, не сломав имя поля для скринридера.
Вдобавок дефолт собирается из id колонки: пользователь видит `Filter firstName…`, а не заголовок.

## What Changes

- Новая опция колонки `filtering.placeholder?: string`: видимая подсказка фильтра этой колонки.
  Поле из `filtering.fields` получает её автоматически, потому что описывается тем же типом
  `filtering`.
- Accessible name и видимый placeholder фильтра становятся двумя значениями. Имя по-прежнему
  берётся из `messages.filtering.placeholder`. Видимый текст берётся из `filtering.placeholder`, а
  если она не задана, из того же сообщения. Без опции поведение не меняется.
- Подсказка доходит до текстового инпута (с операторами и без), до триггера мультивыбора, до
  компонента фильтра cell-type (новое необязательное `FieldState.placeholder`) и до
  `filtering.component` (новое необязательное `InputComponentProps.placeholder`). Диапазон `between`
  её игнорирует: у него свои подписи from / to.
- Слот `MultiSelectFilter` получает необязательный `label`, отдельный от `placeholder`. Сейчас оба
  кита берут `aria-label` из `placeholder`, так что подсказка без этого стала бы именем поля.
- Модель фильтра (`FilterModel`) отдаёт итоговый `placeholder`, чтобы панель на собственных
  компонентах показывала ту же подсказку, что и фильтр в шапке.
- `FilterPlaceholderContext` получает `label`: строковый заголовок колонки (иначе её id) или
  `header` поля. Дефолтное сообщение становится `Filter ${label}…` вместо `Filter ${columnId}…`.
  Это видимое изменение дефолтного текста. Тип сообщения меняется аддитивно, и собственные словари
  с `({ columnId })` продолжают работать.
- Оба кита передают `placeholder` в текстовый и числовой фильтры cell-type. Дата, select, badge и
  boolean его не показывают: в их контролах нет свободного поля ввода, где он был бы уместен.

## Capabilities

### New Capabilities

- `data-grid-filter-labels`: как фильтр получает accessible name и видимую подсказку: источник
  каждого значения, их разделение, контролы, до которых доходит подсказка, и дефолтное сообщение.

### Modified Capabilities

- `data-grid-filter-model`: модель фильтра отдаёт итоговый `placeholder`.

## Impact

- `@ez-kit/data-grid-core`: `ColumnFilteringConfig`, `ColumnFilteringMeta`, mapper
  `filtering`-меты, `FilterPlaceholderContext`, дефолт `messages.filtering.placeholder`,
  `FieldState`, `InputComponentProps`.
- `@ez-kit/data-grid-react`: `render-filter-input.tsx`, `filter-model.ts`, `MultiSelectFilterProps`,
  test-utils kit.
- Киты shadcn и heroui: `MultiSelectFilter` (aria-label из `label`), `TextCell` / `NumberCell`
  фильтры (forward `placeholder`).
- Документация: страница фильтрации колонок, таблица опций (`docs-option-names.test.ts` проверит
  новое имя), changeset `minor` для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react`.
- Зависит от незакоммиченного change `data-grid-filter-fields`: `FilterTarget.label` и
  `filter-model.ts` появляются там. Реализация идёт после него на той же ветке или после его
  merge.
