# Tasks

Порядок внутри каждой задачи — TDD: сначала тест (красный), потом реализация (зелёный).

Пакеты:

- `Q` = `packages/query/react` (`@ez-kit/query-react`);
- `D` = `apps/docs`.

Между правками — `pnpm verify:affected`. В тестах запросов — свой `QueryClient` на тест с
`retry: false`, чтобы ошибки не ждали ретраев.

## 1. Каркас пакета

- [x] 1.1 Создать пакет `@ez-kit/query-react` в `packages/query/react` через `pnpm pkg:new`
      (расположение `grouped`, группа `query`) и привести к конвенциям репозитория: `"type": "module"`,
      `"sideEffects": false`, `exports` только `.`, `tsup` ESM + `.d.ts` с `external` на `react` и
      `@tanstack/react-query`, `vitest.config.ts` через `vitestPackageConfig`, `engines.node`.
      Проверка: `pnpm --filter @ez-kit/query-react build` создаёт `dist/index.js` и `dist/index.d.ts`.
- [x] 1.2 Зависимости: `peerDependencies` `react >=18.0.0` и `@tanstack/react-query ^5.0.0`;
      `devDependencies` — `@tanstack/react-query` (актуальная 5.x), `react`, `react-dom`, типы React,
      `@testing-library/react`, если пакет-шаблон его не даёт. Правка диапазонов в манифесте и простой
      `pnpm install`, без `pnpm up -r`. Проверка: `pnpm install` без ошибок, lockfile изменился только
      в части нового пакета.
- [x] 1.3 Бюджет `size-limit` для `dist/index.js` (временный, уточняется в 3.3) и скрипты `lint`,
      `typecheck`, `test`, `size` по образцу `zu-store`. Проверка:
      `pnpm --filter @ez-kit/query-react lint typecheck size` зелёные на пустом `src/index.ts`.

## 2. Выбор состояния (D3)

- [x] 2.1 Табличный тест `Q/src/resolve-gate-state.test.ts` на все строки спеки: данные есть при
      `success`, при фоновом `fetching`, при `isPlaceholderData`, при `error` с данными → `'data'`;
      `null` в `data` → `'data'`; `pending` + `fetching` / `paused` → `'loading'`; `pending` + `idle` →
      `'idle'`; `error` без данных → `'error'`. Затем реализовать `Q/src/resolve-gate-state.ts`.
      Проверка: тест зелёный.

## 3. Гейт `<Query>` и провайдер

- [x] 3.1 Тесты рендера `Q/src/query.test.tsx` по сценариям спеки «Гейт принимает опции запроса
      целиком», «Данные есть», «Первая загрузка», «Выключенный запрос», «Ошибка без данных» (включая
      повтор через `q.refetch()` из фолбека) и «По умолчанию loading и idle пусты». Затем реализовать
      `Q/src/query.tsx`. Проверка: тесты зелёные.
- [x] 3.2 Тесты `Q/src/query-provider.test.tsx` по сценариям «Фолбек берётся из prop, затем из
      провайдера» (включая вложенные провайдеры и независимый выбор фолбеков) и «Ошибка без фолбека
      пробрасывается» (ловит `ErrorBoundary`, после сброса границы — `loading`, затем `children`).
      Затем реализовать `Q/src/query-provider.tsx` со слиянием по ключу и мемоизацией (D6).
      Проверка: тесты зелёные.
- [x] 3.3 Тест изоляции `Q/src/rerender-isolation.test.tsx` по требованию «Подписка изолирована
      внутри гейта»: счётчики рендеров родителя и двух гейтов, обновление одного запроса и путь
      «загрузка → данные → фоновое обновление». Без `memo`. Проверка: тест зелёный; затем уточнить
      бюджет `size-limit` по реальному размеру + ~15%, `pnpm --filter @ez-kit/query-react size`
      зелёный.
- [x] 3.4 Type-тесты `Q/src/query.types.test.tsx` по требованию «Типы данных и ошибки выводятся из
      query»: `data` без `undefined`, тип после `select`, тип ошибки из `Register`, `q` —
      `UseQueryResult<TData, TError>`, `@ts-expect-error` на обращение к несуществующему полю.
      Проверка: `pnpm --filter @ez-kit/query-react typecheck test` зелёные.
- [x] 3.5 Публичный API в `Q/src/index.ts`: `Query`, `QueryProvider` и типы их props;
      `resolveGateState` не экспортируется. Docblock'и на английском у экспортов. `Q/README.md`:
      назначение, установка, пример гейта и провайдера, ссылка на документацию. Проверка:
      `pnpm --filter @ez-kit/query-react build lint typecheck` зелёные; `dist/index.d.ts` содержит
      только перечисленные экспорты.

## 4. Документация и примеры

- [x] 4.1 Подключить пакет к docs: `@ez-kit/query-react` и `@tanstack/react-query` в
      `D/package.json`. Проверка: `pnpm --filter @ez-kit/docs typecheck` зелёный.
- [x] 4.2 Примеры в `D/shared/examples/query-react/` на shadcn-компонентах docs-приложения: две
      карточки с независимыми запросами, все состояния гейта с переключателями задержки и ошибки,
      `QueryProvider` с общими фолбеками, проброс ошибки к `ErrorBoundary`, данные под гейтом через
      `useSuspenseQuery`. У каждого примера свой `QueryClient` и фейковый `queryFn` без сети, без
      внутренних комментариев. Проверка: `pnpm docs:dev`, каждый пример на витрине проходит свои
      состояния вручную.
- [x] 4.3 Раздел `D/content/docs/query-react/`: `index.mdx` (зачем и быстрый старт), страница
      состояний и фолбеков с таблицей props `Query` / `QueryProvider`, рецепт «данные под гейтом» с
      ограничениями `useSuspenseQuery` (D4, риски), `ai.mdx`, `meta.json` с `root: true`. Проверка:
      `pnpm docs:build` зелёный, раздел виден в навигации.
- [x] 4.4 Guard-тесты docs: `content/docs/query-react` в `SCANNED_ROOTS`, страницы раздела — в
      `DocPage` / `PAGE_ENTRIES` (`D/test/docs-options/page-type-map.ts`) с классификацией каждой
      таблицы; кейс `@ez-kit/query-react` в `D/test/tree-shaking.test.ts` (`Query`, `QueryProvider`
      тянут только сам пакет). Проверка: `pnpm --filter @ez-kit/docs test` зелёный.

## 5. Релиз и общая проверка

- [x] 5.1 Changeset `minor` только для `@ez-kit/query-react` с описанием первой версии. Проверка:
      `pnpm lint` (включая `check-changesets.mjs` и `check-site-url.mjs`) зелёный.
- [x] 5.2 Полный гейт последовательно: `build`, `lint`, `typecheck`, `test`, `size` (`pnpm run ci`).
      Проверка: все пять шагов зелёные.

## Workflow follow-up

- [x] Оформить ADR для решений D1 (имя и расположение пакета) и D4 (родные имена TanStack и рецепт
      данных под гейтом вместо собственного канала доступа) в `openspec/decisions/` и добавить их
      правила со ссылками в `AGENTS.md` до архивации изменения — [ADR 0021](../../../decisions/0021-query-package-name.md),
      [ADR 0022](../../../decisions/0022-query-gate-native-tanstack.md).
- Первая публикация пакета — локальный `pnpm release`, затем trusted publisher на npmjs.com для
  `release.yml`.
- Архивировать изменение после ревью.
