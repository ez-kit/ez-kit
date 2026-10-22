# Design

## Context

Мотивация описана в proposal.md, требования — в `specs/data-grid-filter-labels` и
`specs/data-grid-filter-model`.

Текущее устройство (с учётом незакоммиченного `data-grid-filter-fields`):

```
column.filtering / field.filtering
        |
        v  resolve-filtering.ts (core, общий для колонок и полей)
ColumnFilteringMeta
        |
        v  resolveFilter(target, { messages, ... })   filter-model.ts
FilterModel  ------------------------------------------>  своя панель (useFilters)
        |
        v  render-filter-input.tsx
fieldName = messages.filtering.placeholder({ columnId: target.id })
        |-- FilterTextInput     placeholder + aria-label
        |-- MultiSelectFilter   placeholder (оба кита берут из него aria-label)
        |-- cell-type component <VisuallyHiddenLabel htmlFor> + FieldState (без placeholder)
        |-- filtering.component InputComponentProps (без placeholder и без имени)
        `-- BetweenInput        messages.filtering.from / to
```

`FilterTarget.label` уже содержит то, что нужно для дефолта: строковый заголовок колонки (иначе
её id) или `header` поля.

## Goals / Non-Goals

**Goals:**

- Одна точка вычисления подсказки, которую читают и встроенные контролы, и модель.
- Accessible name никогда не берётся из авторской подсказки.

**Non-Goals:**

- Подсказка, зависящая от оператора (`Starts with…`): `operator` в контексте сообщения не
  добавляется, пока его никто не попросил.
- Placeholder в editing / creating формах. `FieldState.placeholder` появляется, но заполняет его
  только фильтр.
- Подсказка для date, select, badge, boolean и `between`.

## Decisions

**Подсказка вычисляется в модели, а не в рендерере.** `resolveFilter` уже получает `messages` и
цель, поэтому он считает `name = messages.filtering.placeholder({ columnId: target.id, label:
target.label })` и `placeholder = filteringMeta?.placeholder ?? name`. `render-filter-input.tsx`
берёт `model.placeholder` для видимого текста, а свой `fieldName` использует как имя. Без этого
пришлось бы держать правило фолбэка в двух местах, и кастомная панель на модели могла бы
разойтись с шапкой. Это ровно то, от чего модель и защищает. Имя (`name`) в модель не выносится:
спека его не требует, а модель и так отдаёт `label`.

**`placeholder` в `ColumnFilteringMeta` проходит как есть.** Это `setIfDefined(meta, 'placeholder',
…)` в `resolve-filtering.ts`, рядом с `debounce` и `items`. Ключ называется как опция, по правилу
«поле meta = имя опции». Поля получают его без отдельной работы, потому что
`FilterFieldDef.filtering` — это `Omit<ColumnFilteringConfig, 'faceted'>`, а резолвер общий.

**`MultiSelectFilterProps.label?: string` вместо того, чтобы не передавать подсказку в мультивыбор.**
Оба кита ставят `aria-label={placeholder ?? 'Filter'}`. Если передать туда подсказку, она станет
именем. Отказаться от подсказки в мультивыборе — значит потерять самый заметный контрол после
текстового. Новый необязательный пропс аддитивен: внешний кит, который его не читает, просто
сохраняет нынешнее поведение. Киты меняются на `aria-label={label ?? placeholder ?? 'Filter'}`.
Название `label` выбрано вместо `aria-label`, потому что так же называется поле в `FieldState` и в
модели фильтра.

**Имя триггера мультивыбора — имя фильтра плюс видимый текст.** Одно имя фильтра на кнопке с
текстом «Любой статус» нарушает WCAG 2.5.3 (Label in Name): голосом её по видимой надписи не
выбрать. Поэтому shadcn называет кнопку `«<label>, <текст>»`, а если текст совпадает с `label`,
просто `label`. Это же правило возвращает выбранным значениям контекст колонки: вместо «Open, Done»
получается «Filter Status…, Open, Done». В HeroUI ничего добавлять не нужно: React Aria Select сам
собирает имя из значения и `aria-label` («Any status Filter Status…»). Порядок другой, но
требование то же, и чинить чужой порядок мы не стали. Альтернатива «только `label`, ограничение в
docs» отвергнута по той же 2.5.3.

**`FieldState.placeholder?` и `InputComponentProps.placeholder?` — необязательные.** Оба типа
публичные и реализуются потребителями. Обязательное поле сломало бы каждый собственный
компонент. `FieldState` общий с editing / creating, а там поле просто отсутствует.

**Какие компоненты кита показывают подсказку.** Текстовый и числовой фильтр в обоих китах
(`TextCellInput`, `NumberCellInput` в shadcn; `TextCellInput`, `NumberFilterInput` в heroui). У
даты сегментированное поле (heroui) или пикер, у select / boolean выпадающий список со своим
`messages.cells.all`: свободного поля ввода для подсказки там нет.

**Дефолтное сообщение — `Filter ${label}…`.** `FilterPlaceholderContext` получает `label: string`
рядом с `columnId`. Это аддитивно для словарей, которые сообщение _реализуют_ (функция с
`({ columnId })` остаётся совместимой по типу), и для тех, кто _вызывает_ его в коде грида. Внешний
вызывающий код, если он есть, должен будет передать `label`. Такой код нигде, кроме
`render-filter-input.tsx`, не найден.

## Risks / Trade-offs

- [Меняется видимый дефолт `Filter firstName…` → `Filter First name…`, а с ним и accessible name]
  → e2e и юнит-тесты, которые ищут фильтр по старому тексту, придётся обновить. Это и есть
  исправление, а не регрессия. Changeset упоминает изменение текста.
- [Внешний кит не знает про `MultiSelectFilterProps.label`, и подсказка становится его
  aria-label] → в документации к слоту сказано, что имя надо брать из `label`. Оба наших кита
  обновляются в этом же change.
- [Кит, который не передаёт `FieldState.placeholder`, молча не покажет подсказку] → на странице
  опции перечислены контролы, которые её показывают.
- [Изменение зависит от незакоммиченного `data-grid-filter-fields`] → реализация идёт после него.
  Если тот change переименует `FilterTarget.label` или модель, этот design нужно сверить заново.
