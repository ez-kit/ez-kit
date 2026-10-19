# Tasks

## 1. Core: типы и опции

- [x] 1.1 Добавить в `core/src/column/types.ts` типы `ItemsSourceParams`, `ItemsSourceResult<TItem>`, `ItemsSource<TItem>` и closed set `ItemStatus` (const object + union) с docblock'ами: хук стабилен, params-объект расширится `search` / `values` / `filters`, кэш держит потребитель; проверить: `pnpm --filter @ez-kit/data-grid-core typecheck` зелёный
- [x] 1.2 Сделать `SelectCellConfig` / `BadgeCellConfig` объединением «`items` или `useItems`» с необязательным `getItem(row)`, типизированным по `TRow` колонки (D8); проверить type-тестами: конфиг без обоих полей не компилируется, `useItems` у `badge` требует `BadgeItem`, `getItem` получает тип строки
- [x] 1.3 Добавить необязательные `useItems` в `ColumnFilteringConfig`, `ColumnEditingConfig`, `ColumnCreatingConfig` (поля из `filtering.fields` получают его через тот же тип) и пронести их и `getItem` в мету (`ColumnFilteringMeta`, `ColumnCellMeta`, мета editing / creating) в row-erased виде; проверить юнит-тестом mapper'а, что каждая опция доходит до своей меты, а без опций ключей нет
- [x] 1.4 Добавить dev-предупреждение «`items` и `useItems` на одном уровне» в mapper (называет колонку и уровень, приоритет у `useItems`) и предупреждение «`faceted` + `manual: true`» в `createTableOptions` рядом с `REQUIRED_FACETED_FEATURES`; проверить юнит-тестами сценарии «items и useItems в фильтре» и «Предупреждение при manual»
- [x] 1.5 Добавить необязательные `itemStatus` / `item` в `CellViewCtx` и `itemsLoading` / `itemsError` в `FieldState` с docblock'ами (D3); проверить: `pnpm --filter @ez-kit/data-grid-core test typecheck lint` зелёные

## 2. React: store источников и runner'ы

- [x] 2.1 Реализовать store источников на инстанс грида (ключ `columnId` + владелец + версия хука, refcount подписчиков, снимок, уведомление только при изменении) и разрешение владельца по цепочке `creating → editing → base`, `filtering → base` (D1); проверить юнит-тестами store: refcount, отсутствие лишних уведомлений, форма создания делит ключ с редактором
- [x] 2.2 Реализовать `ItemsSourceHost` и `SourceRunner` внутри `DataGridRoot` и хук `useItemsSource(columnId, slot)` на `useSyncExternalStore`; проверить тестами сценарии «Сотня ячеек — один вызов», «Скрытая колонка не запрашивает справочник», «Открытый фильтр запускает хук» и что хук внутри runner'а видит `useDataGridState`
- [x] 2.3 Перемонтировать runner при смене ссылки на хук и выводить одно dev-предупреждение на колонку (D2); проверить тестом сценарий «Колонки создаются в теле компонента»
- [x] 2.4 Экспортировать `useItemsSource` и новые типы из `@ez-kit/data-grid-react` (и `./kit`, если там нужен доступ китам); добавить кейс в `apps/docs/test/tree-shaking.test.ts`, что импорт без `useItems` не тянет новый код дальше нужного; проверить: `pnpm --filter @ez-kit/docs test -- tree-shaking` зелёный

## 3. React: ячейки, редактор, форма создания

- [x] 3.1 Реализовать `resolveItem(value, sources)` с порядком D4 (база → `getItem` → faceted-индекс → pending / error / missing) и покрыть юнит-тестами сценарии «Подпись видна до ответа справочника», «Справочник важнее строки», «Только getItem», «Ожидание справочника», «Ошибка справочника», «Значения нет в справочнике»
- [x] 3.2 В `cell.tsx` передавать view-компоненту копию `config` с разрешённым `items` без `useItems` / `getItem`, плюс `itemStatus` и `item` (D3); проверить интеграционным тестом сценарий «Справочник с бэка без пересоздания колонок» и что статический `items` даёт прежний рендер
- [x] 3.3 То же для `creating-row.tsx` и `auto-form.tsx` с `itemsLoading` / `itemsError` в `FieldState`; проверить тестами сценарии «Создание наследует редактор», «Архивное значение в редакторе с активными вариантами» и «Ошибка в редакторе»

## 4. React: модель фильтра и faceted

- [x] 4.1 Передавать снимки источников в `FilterTarget` из `render-filter-input.tsx`, `filter-panel.tsx` и `useColumnFilters` и отдавать `itemsLoading` / `itemsError` в модели (D7); проверить тестами в `filter-model.test.tsx` сценарии «Варианты из хука», «Список ещё грузится», «Фильтр со своим списком», «Колонка без базы», «Поле склада из справочника»
- [x] 4.2 Переписать слияние счётчиков в `resolveFilterItems`: `count` источника важнее faceted, при наличии источника счётчиков отсутствующее значение получает `0` (D6); проверить тестами сценарии «Серверные счётчики не перезаписываются», «Faceted дополняет варианты без счётчика», «Значение без строк при faceted», «Без faceted счётчика нет», и обновить существующие тесты, которые ждали `undefined`
- [x] 4.3 Строить индекс `value → getItem(row)` по faceted rows колонки (D5) и использовать его для faceted-вариантов и подписей чипов; проверить тестами сценарии «Фильтр с названиями без справочника» и «Чип выбранного faceted-значения»
- [x] 4.4 Передавать `isLoading` / `error` в `MultiSelectFilter` и обновить test-utils кита; проверить тестом сценарий «Фильтр во время загрузки»; проверить: `pnpm --filter @ez-kit/data-grid-react test typecheck lint` зелёные

## 5. Киты

- [x] 5.1 shadcn: `SelectCellView` / `BadgeCellView` рисуют скелетон при `pending` и сырое значение при `error` / `missing`; `SelectCellInput` показывает загрузку и ошибку по `itemsLoading` / `itemsError`; `MultiSelectFilter` показывает загрузку, ошибку и `0` у счётчика; файлы `components/ui/**` не трогать; проверить тестами кита и `pnpm --filter @ez-kit/data-grid-shadcn test typecheck lint`
- [x] 5.2 heroui: то же для `SelectCell`, `BadgeCell` и `MultiSelectFilter`; проверить тестами кита и `pnpm --filter @ez-kit/data-grid-heroui test typecheck lint`
- [x] 5.3 Добавить новые `data-slot` скелетона и состояний в стили обоих китов только через существующие правила (слоты под классом кита); проверить: `apps/docs/test/e2e-slots.test.ts` зелёный

## 6. Документация

- [x] 6.1 Написать страницу об асинхронных списках (`useItems`, наследование, подписи из базы, `getItem`, статусы, интеграция с TanStack Query через фабрику `queryOptions`, серверные счётчики через `count`, что придёт следующей фичей) и добавить её в `meta.json` нужного раздела; примеры без внутренних комментариев в исходнике
- [x] 6.2 Добавить строки `useItems` / `getItem` в таблицы опций (`columns/cell-types.mdx`, `filtering/index.mdx`, `filtering/multi-value.mdx`, `filtering/fields.mdx` и страницы editing / creating, где есть таблицы опций), обновить счётчики имён в `page-type-map.ts` и запись новой страницы; проверить: `pnpm --filter @ez-kit/docs test -- docs-option-names` зелёный
- [x] 6.3 Добавить docs-пример с хуком, имитирующим задержку бэка (без зависимости от TanStack Query в рантайме примера), зарегистрировать в `manifest.json` и `registry.ts`; проверить, что пример рендерится в обоих китах на `pnpm docs:dev` и что `scripts/verify-manifest-coverage.mjs` проходит
- [x] 6.4 Добавить e2e-спеку: ячейка показывает pending, затем подпись; фильтр показывает загрузку, затем варианты; проверить прогоном спеки в обоих китах
- [x] 6.5 Написать changeset `minor` для `@ez-kit/data-grid-core` и `@ez-kit/data-grid-react` (новые опции, аддитивные поля контракта компонентов, исправления счётчиков: источник важнее faceted, `0` вместо `undefined`); проверить: `node scripts/check-changesets.mjs` зелёный

## 7. Интеграционная проверка

- [x] 7.1 Прогнать `pnpm verify:affected`, затем последовательно `build`, `lint`, `typecheck`, `test`, `size`; если `size` у `@ez-kit/data-grid-react` красный, обновить бюджет по правилу «реальный размер + ~15%» и записать замер в changeset; проверить, что всё зелёное
