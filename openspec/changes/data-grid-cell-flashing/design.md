# Design

## Context

Мотивация — в proposal.md, поведение — в `specs/data-grid-cell-flashing/spec.md`. Здесь — как это
ложится на код и правила репозитория.

Что уже есть и на что дизайн опирается:

- **Нет `React.memo` (ADR 0001).** При новых `data` тело грида перерисовывается, а вместе с ним —
  каждая отрисованная ячейка (`DataGridCell` → `BodyDataCell`, `react/react/src/data-grid/cell.tsx`).
  Значит, ячейка и так видит каждое новое значение; для автоматики не нужен ни канал, ни подписка.
- **Атомы TanStack Store уже используются в core.** `deferred-apply` создаёт атомы через
  `storeReactivityBindings().createWritableAtom` (`core/src/features/deferred-apply/deferred-apply.ts`)
  — обёртка над `createAtom` из `@tanstack/store`, без прямой зависимости. React читает атомы и
  store через `useSelector` из `@tanstack/react-store` (`use-data-grid-selector.ts`).
- **Резолв «грид → колонка»** уже есть для `filtering.faceted`
  (`core/src/column/map-columns/resolve-filtering.ts`), а слои опций сливаются `deepMerge`
  (`react/react/src/utils/deep-merge.ts`): объект поверх объекта по ключам, `true` поверх объекта
  сохраняет объект, `false` заменяет.
- **Разделение CSS** (`openspec/config.yaml`): структурный stylesheet
  `react/react/src/styles/global.css` — позиция, layout, z-index, всё под `.ez-data-grid`; киты —
  цвет, тени, transition, токены `--dg-*` на классе кита. Закреплённая ячейка — `sticky` с
  непрозрачным `--dg-pin-cell-background` и `box-shadow` тени края; resizable `th` получает
  `relative` только если не закреплён.

## Goals / Non-Goals

**Goals:**

- Флэш не трогает состояние таблицы и не будит ничего, кроме флэшащих ячеек.
- Один механизм фаз для автоматики и ручного вызова.
- Кит, в том числе сторонний, получает флэш, написав только цвет.

**Non-Goals:**

- Различение источника изменения (`edit` / `refresh`) — см. D8.
- Статусы сверх четырёх и статус на уровне грида — см. D9.
- Публичный доступ к атому запросов или подписка на флэш снаружи.
- Флэш вне `td` тела: заголовки, футер, итоги, строка создания.

## Decisions

### D1. Флэш — событие, а не состояние таблицы — Durable

Ни запрос ручного флэша, ни фаза ячейки не попадают в `TableState`, `options.state`,
`options.atoms`, `onStateChange`, `table.store.state` и persist. Фаза флэша — локальный `useState`
ячейки.

Причина: флэш длится секунду и описывает момент, а не данные. В store он будил бы подписчиков
селекторов на каждом тике поллинга, уходил бы в `onStateChange` consumer'а, мог бы попасть в URL /
storage и требовал бы чистки устаревших записей. Контролировать его снаружи, как сортировку,
бессмысленно.

_Отвергнуто:_ slice `state.flashing` с отметками времени по `rowId × columnId` — все минусы выше;
это ещё и вариант, который кто-нибудь захочет «упростить» обратно, отсюда Durable.

### D2. Транспорт ручного флэша — внутренний атом TanStack Store — Durable

`cellFlashingFeature` создаёт на инстансе таблицы атом
`createWritableAtom<FlashRequest | null>(null)` через `storeReactivityBindings()`, как
`deferred-apply`. `FlashRequest = { seq, rowIds?, columnIds?, flashDuration?, fadeDuration? }`.
`table.flashCells(params)` записывает в атом новый запрос с `seq + 1`. Атом внутренний: наружу не
экспортируется и в документации не описан; добавить публичный доступ позже — не breaking change.

Ячейка подписывается на атом в эффекте (`atom.subscribe`) и в callback проверяет адрес: `row.id`
входит в `rowIds` (или `rowIds` нет), `column.id` — в `columnIds` (или их нет). Состояние ставят
только адресаты, поэтому перерисовываются только они — то же правило, что в
`data-grid-render-isolation`. Сначала здесь стоял `useSelector` с селектором «`seq`, если адресован
мне», но тогда флэш запускался бы `setState` в эффекте по изменению выбранного значения
(`react-hooks/set-state-in-effect`), а подписка с `setState` в callback — ровно тот случай, для
которого эффекты и нужны.

_Отвергнуто:_

- Свой `Map<rowId|colId, Set<listener>>` / `Set<listener>` с `subscribeCellFlash` — повторяет то,
  что атом и его `subscribe` уже делают и что уже протестировано.
- `flashCells`, ставящий атрибут в DOM сам по `td[data-row-id][data-column-id]` — React
  перезаписывает атрибут на следующем рендере, и это DOM-поиск, который пакет не делает (ADR 0008).

### D3. Ячейка не видит запрос, сделанный до её монтирования

В атоме лежит последний запрос, а не поток событий. `subscribe` атома сообщает только об
изменениях и не отдаёт текущее значение при подписке, поэтому ячейка, смонтированная после
`flashCells`, этот вызов не получает — отдельная «база» не нужна. Тест «ячейка после вызова не
флэшит» держит это свойство: если `@tanstack/store` начнёт отдавать текущее значение при подписке,
он упадёт.

### D4. Автоматика сравнивает в эффекте ячейки, не через атом

`useCellFlash(cell)` держит в `useRef` последнее значение `cell.getValue()`. В `useEffect` после
коммита: если `meta.flashing` задан, значение «изменилось» (D5) и редактор ячейки не открыт —
`trigger(meta.flashing)`; затем ref обновляется — **всегда**, в том числе при открытом редакторе,
поэтому отмена правки после обновления данных не флэшит. Первый эффект только записывает ref.

Эффект, а не тело рендера: двойной рендер StrictMode и прерванные concurrent-рендеры дали бы ложные
срабатывания или потерянные значения. Цена — одна дополнительная перерисовка на каждую
**изменившуюся** ячейку (смена фазы).

`trigger(durations)`: очистить таймеры, `setPhase('flash')`, таймер на `flashDuration` →
`setPhase('fade')`, таймер на `fadeDuration` → `setPhase(undefined)`. Повторный `trigger`
перезапускает цикл. Cleanup эффекта чистит таймеры.

Хук вызывается в ветке данных `BodyDataCell`, не в `SystemCell`; для placeholder-ячейки
группировки (`cell.getIsPlaceholder()`) он не делает ничего. Без зарегистрированной фичи атома нет
— хук не подписывается и не флэшит.

### D5. Равенство: `equals` колонки, иначе `Object.is` и `Date` по времени

`meta.flashing.equals(prev, next)`, если задан; иначе `Object.is`, кроме пары `Date`, которая
равна при равных `getTime()`. Без глубокого сравнения по умолчанию: оно скрыто дорогое на больших
объектах и неочевидно для `Map` / class-инстансов. Что объекты из `accessorFn` без `equals` флэшат
на каждом тике — документируется на странице.

_Отвергнуто:_ сравнивать отображаемый текст — у кастомного рендерера текста может не быть.

### D6. Резолв опции в `ColumnMeta.flashing`

`map-columns` резолвит `ColumnMeta.flashing: { flashDuration, fadeDuration, equals? } | undefined`
по образцу `faceted`: колонка `false` → `undefined`; колонка не задана и грид выключен →
`undefined`; иначе — дефолты (500 / 1000) < объект грида < объект колонки, `true` ничего не
переопределяет. Системные колонки — всегда `undefined`. Грид-уровневый `flashing` попадает в
`map-columns` так же, как `filtering.faceted`.

Длительности ручного флэша, от низшего приоритета к высшему: дефолты < объект грида <
`meta.flashing` колонки (если автоматика колонки включена) < параметры вызова `flashCells`.

Dev-предупреждения (`warnOnce`) — в `createTable` / резолве: `flashing` задан без
зарегистрированной фичи (грид — через `REQUIRED_FEATURE`, колонка — через
`CONDITIONAL_REQUIRED_FEATURES`, тем же текстом, что остальные фичи); флэш включён, а id строк —
индексы (`getRowId` не задан, и у первой строки нет `id`; по умолчанию грид берёт `row.id`, так что
отсутствие одного `getRowId` ещё не проблема).

Грид-уровневый `FlashingConfig` наследует `FeatureToggle`, как опции остальных фич:
`{ enabled: false, … }` выключает флэш, сохраняя настройки в слое `defaults`.

### D7. Оверлей `::after`: позиция в структурном слое, вид в ките — Durable

Структурный `global.css`:

```css
& [data-slot='td'][data-flash]:not([data-pinned]) {
	@apply relative;
}
& [data-slot='td'][data-flash]::after {
	content: '';
	@apply pointer-events-none absolute inset-0;
}
```

Кит (`styles.css` shadcn и heroui), токен `--dg-flash-background` на классе кита:

```css
& [data-slot='td'][data-flash]::after {
	background-color: var(--dg-flash-background);
	opacity: 1;
}
& [data-slot='td'][data-flash='fade']::after {
	opacity: 0;
	transition: opacity var(--dg-flash-fade-duration) ease-out;
}
@media (prefers-reduced-motion: reduce) {
	& [data-slot='td'][data-flash='fade']::after {
		transition: none;
	}
}
```

React-пакет ставит `data-flash` и `--dg-flash-fade-duration` (значение, не авторский стиль — тот
же приём, что pin offsets) через chrome ячейки, рядом с `data-pinned` / `data-align`.

Почему оверлей: закреплённая ячейка красится непрозрачным `--dg-pin-cell-background` и уже носит
`box-shadow`, так что смена `background-color` сделала бы её прозрачной на время флэша, а inset
`box-shadow` столкнулся бы с тенью края. `relative` только для незакреплённых — тот же прецедент,
что у resizable `th`: `relative` отменил бы `sticky`. Позиция — в структурном слое, чтобы сторонний
кит не повторял её и не ломал закрепление.

Durable, потому что shadcn `styles.css` — payload registry (ADR 0002): у `shadcn add` нет
uninstall, и смена механизма — изменение публичного контракта.

_Отвергнуто:_ `background-color` на `td` (пин), inset `box-shadow` (конфликт с тенью пина),
`element.animate()` из React-пакета (авторство стиля в пакете без стилей).

### D8. Источник изменения не различается; форма опции оставляет место

Успешная инлайн-правка уходит в `onSave`, consumer пишет `data`, и новое значение приходит тем же
путём, что обновление по сокету, — ячейка отличить их не может. Сейчас флэшит всё. Опция —
`boolean | object`, так что `{ edit?: boolean; refresh?: boolean }` добавляются позже без breaking
change. Обсуждённый механизм на будущее: успешный commit фичи editing кладёт метку «для
`rowId × columnId` ожидается X»; ячейка, увидев изменение с этим значением, классифицирует его как
правку и снимает метку; метка истекает по таймауту или на следующем обновлении строки.

### D9. Статус флэша: цвет, а не решение «флэшить ли»

`FlashStatus = 'default' | 'success' | 'warning' | 'error'` — закрытый набор. Источник статуса:

```
 значение изменилось?  -- нет --> флэша нет (status не вызывается)
          | да
          v
 ручной: params.status ?? 'default'
 авто:   meta.flashing.status?.(previous, next, row) ?? 'default'
          |
          v
 <td data-flash="flash" data-flash-status="success">
```

- Мигать или нет решает только равенство (D5); `status` выбирает цвет. `undefined` из функции —
  `default`, а не «не флэшить»: у каждой функции одна обязанность.
- `status` есть только у колонки (`ColumnFlashingConfig.status`), не у грида: одна функция на все
  колонки почти никогда не подходит, а цена-вверх-хорошо и время-ответа-вверх-плохо — разные правила.
  Встроенного правила «больше → success» нет по той же причине.
- Аргументы: `previous`, `next` — значения колонки, `row` — исходные данные строки (`row.original`),
  как у `cellClassName`. Типы берутся из колонки (`ColumnFlashingConfig<TRow, TValue>`), так что
  `next > previous` компилируется на числовой колонке; `Row` TanStack отвергнут — он бы потянул
  generic фич в тип опции колонки ради одного `getIsGrouped()`.
- Ручной флэш не вызывает функцию колонки: у вызова нет пары «было → стало». Без `params.status`
  ручной флэш — `default`.
- Статус приходит с каждым срабатыванием и перезапускает флэш вместе с фазой (`trigger(durations,
status)`), так что повторное изменение может сменить цвет.
- `data-flash-status` ставится на всё время флэша, `default` включительно, — явный контракт для
  сторонних китов; снимается вместе с `data-flash`.
- Имя красного статуса — `error` (MUI, Ant Design, Chakra), не `danger` / `destructive`; heroui
  красит его своим `--color-danger`.

Киты: токены `--dg-flash-success-background`, `--dg-flash-warning-background`,
`--dg-flash-error-background` на классе кита рядом с `--dg-flash-background` (он же — `default`),
правило `[data-flash-status='success']::after { background-color: var(--dg-flash-success-background) }`
и т.д. heroui берёт основу из `--color-success` / `--color-warning` / `--color-danger`. В теме shadcn
success и warning нет — кит задаёт свои значения прямо в токенах (error — от `--destructive`);
consumer переопределяет токен на классе кита. Механизм оверлея (D7) не меняется.

_Отвергнуто:_ открытый набор строк (`string`) — расползаются типы и документация, а свой цвет и так
задаётся токеном; `status` на гриде; встроенное правило «рост → success».

## Risks / Trade-offs

- [Колонка `accessorFn`, строящая новый объект, флэшит на каждом тике] → документировать `equals`;
  пример на странице.
- [С индексными id после сортировки флэшит «чужое»] → dev-предупреждение; на странице — `getRowId`
  как обязательная часть рецепта.
- [Флэш на тысячах ячеек каждые 100 мс — тысячи таймеров и перерисовок] → флэшат только отрисованные
  изменившиеся ячейки (виртуализация ограничивает их число); `flashCells()` без адреса будит все
  отрисованные — это то, о чём просили. Замер в примере docs при реализации; если узко —
  отдельный change.
- [Атом хранит последний запрос] → D3 и тест «ячейка после вызова не флэшит».
- [heroui сознательно без transition на закреплённых ячейках] → затухание анимирует оверлей, не
  саму ячейку; визуальная проверка закреплённой колонки в heroui.
- [`::after` на `td` уже где-то занят] → при реализации проверить оба кита и структурный слой;
  сейчас `::after` используется только на `th[data-draft-sorting]`.

## Migration Plan

Аддитивно: без опции и без вызова `flashCells` грид рендерится как раньше; фича опциональна и не
попадает в бандл, который её не импортирует (`tree-shaking.test.ts`). Changeset minor на
`@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/docs`. Перед архивом — ADR для D1,
D2, D7 и их правила в `AGENTS.md`.
