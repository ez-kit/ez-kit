# Proposal

## Why

Когда компонент выводит данные нескольких запросов TanStack Query, хуки `useQuery` обычно
вызываются в общем родителе:

```tsx
function Dashboard() {
	const devices = useQuery(deviceQueries.list())
	const stats = useQuery(statsQueries.summary())
	return <><DevicesCard … /><StatsCard … /></>
}
```

Любое изменение одного запроса (старт загрузки, приход данных, фоновое обновление) перерисовывает
родителя и вместе с ним соседнюю карточку. Это лечится выносом каждого запроса в отдельный
компонент-обёртку, но такие обёртки существуют только ради изоляции подписки: файлов становится
больше, имена расползаются. Кроме того, каждый такой компонент заново пишет одну и ту же ветку
«загрузка / ошибка / данные» и сужает `data` с `TData | undefined` до `TData` вручную.

В ez-kit пока нет пакета для TanStack Query. Начинаем с самой маленькой полезной единицы:
декларативного гейта запроса.

## What Changes

- **Новый пакет `@ez-kit/query-react`** — headless-обёртка над `@tanstack/react-query` v5:
  без разметки и стилей, peer-зависимости — `react` и `@tanstack/react-query`. Имя следует схеме
  `<фича>-react`, как `data-grid-react` и `form-react`; адаптеры для других фреймворков в будущем —
  `query-vue` и т.д., `query-core` — только если появится общий код.
- **`<Query query={…}>{(data, q) => …}</Query>`** — компонент, который сам вызывает `useQuery` и
  рендерит одно из: `children` (данные есть), `loading`, `idle` (запрос выключен) или `error`
  (ошибка, данных нет). Подписан на запрос только сам `<Query>`: родитель и соседи не
  перерисовываются.
  - `query` — объект опций (результат `queryOptions(...)`), все типы выводятся из него, `select`
    передаётся внутри него.
  - `children(data, q)` получает `data: TData` (без `undefined`) и результат `useQuery` как есть.
  - `error(error, q)` — та же форма, что у `children`; поля TanStack не переименовываются
    (`q.refetch`, `q.isFetching`, `q.failureCount`).
- **`<QueryProvider loading idle error>`** — фолбеки по умолчанию для всех `<Query>` ниже по
  дереву; prop на `<Query>` их переопределяет.
- **Ошибка без фолбека не теряется**: если `error` не задан ни на `<Query>`, ни в провайдере,
  ошибка пробрасывается к ближайшему `ErrorBoundary`. `loading` и `idle` без фолбека рендерят
  `null`.
- **Документация**: раздел `/docs/query-react` с живыми примерами на shadcn и рецептом «данные под
  гейтом» — потомки читают те же данные через родной `useSuspenseQuery(options)` без собственного
  API пакета.
- **Не входит**: контекстный доступ к данным (`Query.useData`, `createQueryScope`), Suspense-вариант
  гейта, несколько запросов в одном гейте (`useQueries`), `<Mutation>`, `empty`-фолбек,
  переименование родных полей TanStack.

## Capabilities

### New Capabilities

- `query-gate`: как `<Query>` выбирает, что рендерить, по состоянию запроса TanStack Query
  (данные, первая загрузка, выключенный запрос, ошибка с данными и без), откуда берёт фолбеки
  (prop → `QueryProvider` → значение по умолчанию), что передаёт в `children` и `error`, и какую
  изоляцию ре-рендеров гарантирует.

### Modified Capabilities

## Impact

- **Новый код**: `packages/query/react/` (`@ez-kit/query-react`): `Query`, `QueryProvider`, типы
  props. Сборка `tsup` (ESM + `.d.ts`), тесты Vitest в jsdom, бюджет `size-limit`.
- **Новая зависимость**: `@tanstack/react-query` ^5 — peer пакета и devDependency пакета и docs.
  До этого изменения в репозитории TanStack Query не использовался.
- **Docs-приложение**: раздел `apps/docs/content/docs/query-react/`, примеры в
  `apps/docs/shared/examples/query-react/`, `QueryClientProvider` для примеров, зависимость
  `@ez-kit/query-react` в `apps/docs/package.json`; новый корень в `SCANNED_ROOTS`
  (`docs-option-names.test.ts`) и кейс в `tree-shaking.test.ts`.
- **Релиз**: changeset `minor` для `@ez-kit/query-react` (первая версия). Первая публикация нового
  пакета — локальный `pnpm release`, затем настройка trusted publisher на npmjs.com.
- **Затронутые существующие API**: нет.
