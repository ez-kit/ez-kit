# Design

## Context

Мотивация описана в proposal.md (раздел Why). Здесь только то, что определяет подход.

**Что установлено пробой.** Её запускали через `tsc` на собранных `dist` heroui-кита против
`createDataGrid` / `defineCellType`. Если расширить badge через
`defineCellType<BadgeCellConfig & Size, BadgeColumnConfig & Size>()({ ...cellTypes.badge, view })`
в `createDataGrid({ cellTypes })`, получается следующее:

- `config: { items, size: 'sm' }` проходит;
- `size: 'xl'` даёт ошибку;
- `useItems` вместо `items` проходит;
- `getItem: (r) => …` получает типизированный `r`;
- с **одним** параметром типа `useItems` даёт ошибку `Property 'items' is missing`. Фантомный
  `__config` из `...cellTypes.badge` пересекается с новым, поэтому сузить форму нельзя, можно только
  расширить;
- без переопределения `size` даёт excess property;
- `<DataGrid columns={[…]}>` и `<A.DataGrid columns={[…]}>` с `config: { nope: 1 }`,
  `type: 'nosuch'` и `size: 'xl'` компилируются без ошибок.

**Как устроены docs-примеры.** Кастомные типы лежат в одном kit-agnostic объекте
`apps/docs/shared/data-grid/custom-cell-types.ts` (`customCellTypes`). Каждый кит собирает свой bundle
в `custom-grid-{shadcn,heroui}.tsx` как `{ ...cellTypes, ...customCellTypes }` (shallow-spread).
`CustomDataGrid` лениво выбирает один из них. Колонки примеров строятся **непривязанным**
`createColumns<Row, CustomCellTypes>`, потому что привязанный лежит в лениво загружаемом bundle.
`mergeCellTypes` из публичного API не экспортируется.

**Guard-тесты.** `docs-option-names.test.ts` (ADR 0013) привязывает каждую таблицу к заголовку над
ней и сверяет число имён (`expectedCount`). Новая таблица или сдвиг заголовка над существующей
таблицей ломают тест.

## Goals / Non-Goals

**Goals:**

- Каждое утверждение в новых разделах проверено кодом или пробой, а не выведено из докблока.
- Пример расширенного badge рендерится в обоих китах и при этом сохраняет китовые `editing` /
  `filtering`.

**Non-Goals:**

- Менять типы пакетов: проверку inline-колонок, excess-check слотов в `defineCellType`, экспорт
  `mergeCellTypes`.
- Отдельная страница под авторов китов или под расширение типов.

## Decisions

**1. Всё в существующих страницах, новой страницы нет.**
Расширение типа — продолжение `custom-cell-types.mdx`, а инпуты — продолжение `editing` /
`filtering`. Новая страница потребовала бы ещё одну запись `DocPage` / `PAGE_ENTRIES` и
навигацию, а нового в ней было бы меньше, чем в одном разделе.
Альтернатива — страница «Extending cell types». Отклонена: она дробит тему, которую читатель ищет на
одной странице.

**2. Порядок разделов в `custom-cell-types.mdx`.**
Usage → Declaring a config → (сущ.) регистрация → **Where cell types come from** → **Extending a
built-in type** → More examples → **Type-safety** (переписан) → **For kit authors** → See also.
Раздел для авторов китов стоит последним: прикладному читателю он не нужен, а «Where cell types come
from» уже даёт ему ту же схему с точки зрения приложения.

**3. Пример расширенного badge: `badge` в общем `customCellTypes` плюс мерж по полям в китовых bundle.**
В `customCellTypes` добавляется
`badge: defineCellType<BadgeCellConfig & BadgeSize, BadgeColumnConfig & BadgeSize>()({ view: SizedBadgeView })`,
и в нём только `view`. Каждый `custom-grid-*.tsx` собирает реестр как
`{ ...cellTypes, ...customCellTypes, badge: { ...cellTypes.badge, ...customCellTypes.badge } }`.
Так китовые `editing` / `filtering` сохраняются. Это ровно тот рецепт, который страница показывает
читателю, только записанный в двух bundle.
`CustomCellTypes = typeof baseCellTypes & typeof customCellTypes` даёт колонкам пример расширенного
config без изменений.
Альтернативы:

- (a) отдельный bundle на каждый кит под этот пример: ещё два файла и ленивый переключатель ради
  одного примера;
- (b) prop `<DataGrid cellTypes>`: он мержит по полям, но типов не даёт, а именно типы и нужно
  показать;
- (c) экспортировать `mergeCellTypes`: изменение API. Отклонены.
  Ни один существующий пример на `CustomDataGrid` не использует `badge`, это проверено grep-ом, поэтому
  подмена view ничего не задевает.

**4. `SizedBadgeView` без китовых примитивов.**
View пишется в `custom-cell-renderers.tsx`, в том же стиле, что и соседние (обычный элемент,
inline-размеры). Kit-agnostic файл не может импортировать `Chip` / `Badge` китов. Значения
(label / variant) берутся через `config.items` и `item`, так же как в китовом view. Комментарии
внутри примера не пишем: source-панель показывает их читателю, поэтому объяснения уходят в MDX.

**5. Рецепт на странице пишется против кита, а не против docs-обвязки.**
Код в MDX — это то, что читатель вставит в свой `src/lib/data-grid.ts`:
`import { allComponents, cellTypes } from '@ez-kit/data-grid-heroui'` и
`badge: defineCellType<…>()({ ...cellTypes.badge, view: MyBadge })`. Для shadcn та же оговорка, что
уже есть на странице: импорт идёт из скопированного `@/components/data-grid/data-grid`.

**6. Type-safety: формулировка.**
«Проверку `cell` делает bundle-овский `createColumns` / `createColumnHelper`. Массив, переданный в
`columns` inline, не проверяется ни по `type`, ни по `config`: `columns` принимает результат, а
второй type-параметр на `TableConfig` сломал бы вывод `TRow` у каждого вызова».
Формулировка не обещает будущей проверки: это отдельное обсуждение.

_Уточнено при реализации._ Старый абзац («рукописный `cell: { type }` не проверяется по id:
`CellType` держит хвост `string & {}`») оказался неверным. Проба показала, что и bundle-овский, и
непривязанный `createColumns<Row>` отвергают `type: 'nosuch'` в объектной и скалярной форме, а также
лишний ключ в config. Хвост `string & {}` живёт в `ColumnCellMeta`, а не во входе builder-а. Поэтому
абзац заменён: тихий fallback на сырое значение описан как следствие **inline**-колонок, а не
рукописного `type`.

**7. Раздел про инпуты: прозой и кодом, без таблицы опций.**
Три пути описываются абзацами с короткими примерами:

- ключ в `cell.config`, общий для `view` / `editing` / `creating` / `filtering` (схема в ASCII или
  списком);
- замыкание в `editing.component`;
- `context` + `useGridContext`.
  Таблицы нет, поэтому `PAGE_ENTRIES` не меняется. Раздел ставится **после** последней таблицы
  страницы, чтобы заголовок над существующими таблицами не сдвинулся. В `filtering/index.mdx` раздел
  короче и ссылается на editing: колоночный `filtering.component` получает `InputComponentProps`, а не
  `FieldState`, и это различие уже описано на custom-cell-types.

**8. Утверждение про перемонтирование формулируется как условие, а не как гарантия.**
«`editing.component` монтируется по идентичности. Компонент, созданный заново при пересборке
колонок, перемонтирует инпут: теряются фокус и набранный текст». Ссылка на `state/rendering.mdx`,
где уже сказано держать колонки на module scope / в `useMemo`.

**9. Исправление `edit:` → `editing:` входит в этот change.**
Оно в тех же файлах, а страница, которую мы переписываем, прямо обещает «click Edit … custom
inputs». После исправления кастомные инпуты появятся в примерах `custom-cell-types`,
`custom-cell-progress` / `currency` / `user` и `column-helper-registered`. Это и есть ожидаемое
поведение.

Долговечных решений (Durable) нет: change документирует существующее поведение и не вводит новых
правил, поэтому ADR не нужен.

## Risks / Trade-offs

- [Кастомные инпуты после `edit:` → `editing:` могут оказаться сломанными: их никогда не
  рендерили] → проверить каждый из пяти инпутов и `StarRatingInput` в браузере на обоих китах
  (режим edit), отдельной задачей.
- [Новый раздел сдвинет заголовок над существующей таблицей, и `docs-option-names` упадёт на
  `expectedCount` / unclassified table] → новые разделы ставятся после таблиц; прогнать
  `pnpm --filter @ez-kit/docs test`.
- [Рецепт в MDX устареет при изменении `defineCellType` / `BadgeColumnConfig`] → код рецепта
  дублирует то, что компилируется в примере (`custom-cell-types.ts`), так что typecheck docs ловит
  расхождение в примере. Текст MDX остаётся непроверяемым, и это осознанный компромисс.
- [Раздел для авторов китов описывает внутренний механизм (`_KitCellTypesMatchRegistry`), который
  может измениться] → описываем назначение (KitCellTypes объявлен, проверка в обе стороны) и не
  копируем код проверки; ссылаемся на исходник кита.
- [Пример показывает badge с размером, которого нет в китовых Chip / Badge] → это демонстрация
  механизма; в MDX прямо сказано, что view пишет приложение.
