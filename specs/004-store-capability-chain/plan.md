# Store capability chain — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: используй `superpowers:subagent-driven-development` (рекомендуется) или `superpowers:executing-plans`, чтобы выполнять план по шагам. Шаги отмечены чекбоксами (`- [ ]`).

**Goal:** заменить два способа расширения стора (`options.plugins` + фабричные обёртки) одним — цепочкой `withA(withB(withC(proxy(…))))`, которая одновременно даёт корректные типы и сохраняет жизненный цикл плагина.

**Architecture:** контракт `StorePlugin` в `@ez-kit/store-core` не меняется — меняется только способ регистрации. Обёртка навешивает плагин на сам инстанс через `attachCapability`, а оба места подключения (Provider в `createContextStore` и `instance-cache`) читают список с инстанса через `capabilitiesOf`. Тип расширяется возвращаемым типом обёртки, поэтому `store.history` и (позже) `store.$url` типизированы без кастов и без дженериковой свёртки по массиву плагинов.

**Tech Stack:** TypeScript 5 (strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), React 19, Valtio 2.3, Zustand 5, Vitest + jsdom, pnpm + Turborepo, changesets.

**Spec:** раздел «Проектные решения» ниже.

---

## Проектные решения (спец)

Зафиксировано в обсуждении, менять только явным решением:

1. **Единственный шов расширения — фабричная цепочка.** `options.plugins` у `createContextStore` и `plugins` у `CachedStoreOptions` удаляются полностью. Совместимости не оставляем (пакеты 0.x, слом описываем в changeset как minor).
2. **Порядок setup'ов — по порядку навешивания, изнутри наружу.** `withPersist(withHistory(proxy(…)))` → сначала `history.setup`, потом `persist.setup`.
3. **`StorePlugin` / `PluginContext` / `PluginCleanup` не меняются.** Плагины по-прежнему получают `{ services, id, isServer }` и возвращают cleanup.
4. **История живёт в фабричной позиции и называется `withHistory`** — симметрично `withHistory(initializer)` в zu-store.
5. **Поле `history` — enumerable, значение обёрнуто в `ref()`.** `Snapshot<T>` разворачивает `$$valtioSnapshot`, поэтому `snap.history` — тот же объект, а `deepClone(obj, getRefSet)` его не клонирует: в `pasts` попадает указатель, рекурсии нет. API-объект получает `toJSON(): undefined`, чтобы не течь в `JSON.stringify`.
6. **Стеки истории — в отдельном valtio-прокси внутри API-объекта**, а не в основном сторе: запись в историю не будит подписчиков основного прокси.
7. **Логика стеков — общая, в `@ez-kit/store-core/history`.** Менеджеро-специфичны только «прочитать состояние», «записать состояние» и «когда записывать».
8. **Список способностей хранится на инстансе под `Symbol.for('ez-kit/capabilities')`, non-enumerable.** Если тест покажет конфликт с подписками valtio — переезжает в `WeakMap` (на типы это не влияет).
9. **История записывает любое изменение состояния, кем бы оно ни было сделано** — включая внешний проброс `controlled value`. Undo в контролируемый ключ дёргает `onValueChange`, родитель пушит значение обратно, состояние сходится. Единственное исключение — **первый батч** (синхронные записи первого рендера, включая начальный проброс `value`): он становится базовой линией, потому что история должна начинаться с состояния, которое пользователь впервые увидел, а не с фантомного «до применения `value`».
10. **Гидрация persist приходит поздним батчем и по умолчанию является шагом истории.** Рецепт для связки persist + history — `defaultPaused: true` плюс `resume()` по `useHydrated`; он документируется и покрывается тестом. Общее понятие готовности инстанса (`markReady` / `whenReady` в store-core), которое сделало бы это поведением по умолчанию, сознательно не строим до первого реального применения.
11. **Записанные состояния не содержат ключ `history`.** `adapter.read()` снимает снапшот и вырезает собственный ключ, `adapter.write()` его не трогает. Иначе каждый элемент `pasts` тащил бы ссылку на сам API истории, а `defaultPasts`, которые пишет прикладной код, пришлось бы подделывать. Типы это уже отражают: `withHistory<T>(target: T)` принимает опции, параметризованные `T` — то есть типом **до** расширения.
12. **`withPersist` в этом плане не меняет тип** (возвращает `T`): `$url` / `$persist` по-прежнему достаются через `urlHandle()` / `persistHandle()`. Типизация ручек persist требует переноса создания биндингов в фабричную фазу и вынесена в отдельную задачу (Task 9), которая делается только после зелёного основного рефакторинга.

## Global Constraints

- Node `>=22` (`.nvmrc` 22.18.0). Пакетный менеджер — pnpm, все команды через `pnpm --filter`.
- Каждый пакет: `lint` с `--max-warnings=0`, `typecheck`, `test`, `size`. Бюджеты size-limit: `va-store` dist/index.js ≤ 6.5 KB, `store-core` dist/index.js ≤ 1 KB, dist/cache/index.js ≤ 3 KB, `zu-store` dist/index.js ≤ 5 KB. Новые сабпути получают собственный бюджет.
- Импорты типов — только `import type`. `import/order` алфавитный и сгруппированный.
- Публичный API пакета экспортируется исключительно из `src/index.ts` (и объявленных сабпутей в `exports` package.json).
- Коммиты — Conventional Commits; ломающие изменения помечаются `!` и описываются в changeset как **minor** (правило репозитория для 0.x).
- Запуск тестов одного пакета: `pnpm --filter @ez-kit/<pkg> test`. Не использовать `cd … && …`.

## Карта файлов

**Создаём:**

| Файл                                                  | Ответственность                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/store-core/src/capability.ts`               | `attachCapability` / `capabilitiesOf` — реестр способностей на инстансе |
| `packages/store-core/src/capability.test.ts`          | тесты реестра                                                           |
| `packages/store-core/src/history/stack.ts`            | `createHistoryStack` — менеджеро-независимый движок стеков              |
| `packages/store-core/src/history/types.ts`            | `HistoryOptions`, `HistorySnapshot`, `HistoryApi`, `HistoryAdapter`     |
| `packages/store-core/src/history/index.ts`            | публичный вход сабпути `@ez-kit/store-core/history`                     |
| `packages/store-core/src/history/stack.test.ts`       | тесты движка (чистые, без React и без менеджера)                        |
| `packages/va-store/src/history/with-history.ts`       | `withHistory` — обёртка над valtio-прокси                               |
| `packages/va-store/src/history/use-history.ts`        | хук `useHistory(store)`                                                 |
| `packages/va-store/src/history/with-history.test.tsx` | тесты обёртки: запись, undo/redo/goto, ref, snapshot                    |
| `packages/va-store/src/history/interop.test.tsx`      | тесты связки history + persist + controlled + cache                     |
| `packages/va-store/src/persist/with-persist.ts`       | `withPersist` — обёртка, регистрирующая существующий `persist()`        |

**Меняем:**

| Файл                                                           | Что                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/store-core/src/index.ts`                             | экспорт `attachCapability` / `capabilitiesOf`                         |
| `packages/store-core/src/cache/instance-cache.ts:113-114`      | источник плагинов — `capabilitiesOf(instance)`                        |
| `packages/store-core/src/cache/types.ts:28-45`                 | убрать `CreateOptions.plugins` и `CachedStoreOptions.plugins`         |
| `packages/store-core/src/cache/create-cache-react.tsx:234,270` | убрать проброс `plugins`                                              |
| `packages/store-core/package.json`                             | сабпуть `./history` в `exports` + `size-limit`                        |
| `packages/va-store/src/create-context-store/index.tsx:137-153` | `usePlugins` читает `capabilitiesOf(store)`; убрать `options.plugins` |
| `packages/va-store/src/persist/index.ts`                       | экспорт `withPersist`                                                 |
| `packages/va-store/src/index.ts`                               | экспорт `withHistory`, `useHistory` и их типов                        |
| `packages/va-store/package.json`                               | сабпуть `./history` в `exports` + `size-limit`                        |
| `packages/zu-store/src/middlewares/with-history/index.ts`      | перевод на общий движок (Task 10)                                     |

**Удаляем:**

| Файл                                                          | Почему                                         |
| ------------------------------------------------------------- | ---------------------------------------------- |
| `packages/va-store/src/create-context-store/plugins.test.tsx` | заменяется на `capabilities.test.tsx` (Task 5) |

**Мигрируем (38 мест `plugins:` в коде/тестах/примерах + 13 в MDX):** тесты persist (`plugin.test.tsx`, `cached-store.test.tsx`, `storage/storage-store.test.tsx`, `url/next.test.tsx`, `url/react-router.test.tsx`), примеры `apps/docs/shared/examples/va-store/persist-*.tsx` и `cache-persist-combined.tsx`, страницы `apps/docs/content/docs/va-store/**`.

---

### Task 1: Реестр способностей в store-core

**Files:**

- Create: `packages/store-core/src/capability.ts`
- Test: `packages/store-core/src/capability.test.ts`
- Modify: `packages/store-core/src/index.ts`

**Interfaces:**

- Consumes: `StorePlugin` из `./plugin`.
- Produces: `attachCapability<T extends object>(target: T, plugin: StorePlugin<T>): void`, `capabilitiesOf<T extends object>(target: T): readonly StorePlugin<T>[]`.

- [ ] **Step 1: Написать падающий тест**

```ts
// packages/store-core/src/capability.test.ts
import { describe, expect, it } from 'vitest'

import { attachCapability, capabilitiesOf } from './capability'

import type { StorePlugin } from './plugin'

const noop: StorePlugin<object>['setup'] = () => undefined

describe('capability registry', () => {
	it('returns an empty list for a bare object', () => {
		expect(capabilitiesOf({})).toEqual([])
	})

	it('keeps attachment order (innermost wrapper first)', () => {
		const target = {}
		attachCapability(target, { name: 'history', setup: noop })
		attachCapability(target, { name: 'persist', setup: noop })

		expect(capabilitiesOf(target).map((plugin) => plugin.name)).toEqual(['history', 'persist'])
	})

	it('hides the registry from enumeration, spreading and JSON', () => {
		const target: Record<string, unknown> = { count: 0 }
		attachCapability(target, { name: 'history', setup: noop })

		expect(Object.keys(target)).toEqual(['count'])
		expect({ ...target }).toEqual({ count: 0 })
		expect(JSON.parse(JSON.stringify(target))).toEqual({ count: 0 })
	})

	it('does not inherit capabilities through the prototype chain', () => {
		const parent = {}
		attachCapability(parent, { name: 'history', setup: noop })

		expect(capabilitiesOf(Object.create(parent) as object)).toEqual([])
	})

	it('rejects two plugins with the same name on one instance', () => {
		const target = {}
		attachCapability(target, { name: 'persist', setup: noop })

		expect(() => {
			attachCapability(target, { name: 'persist', setup: noop })
		}).toThrow(/persist/)
	})
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `pnpm --filter @ez-kit/store-core test`
Expected: FAIL — `Cannot find module './capability'`.

- [ ] **Step 3: Реализовать**

```ts
// packages/store-core/src/capability.ts
import type { StorePlugin } from './plugin'

/**
 * Key under which an instance carries the capabilities attached to it by `with*` factory wrappers.
 * `Symbol.for` so two copies of the package in one process still see one registry.
 */
const CAPABILITIES = Symbol.for('ez-kit/capabilities')

type WithCapabilities<T> = T & { [CAPABILITIES]?: StorePlugin<T>[] }

/**
 * Register a plugin on the instance itself. Called by a `with*` wrapper at construction time — before
 * the instance is subscribed to — so the mount-time seam (`createContextStore`'s Provider, the instance
 * cache) can discover it without a parallel config channel.
 *
 * The list is non-enumerable and own-only: it never reaches snapshots, spreads or `JSON.stringify`.
 */
export function attachCapability<T extends object>(target: T, plugin: StorePlugin<T>): void {
	const host = target as WithCapabilities<T>
	const own = Object.prototype.hasOwnProperty.call(target, CAPABILITIES)

	if (!own) {
		Object.defineProperty(target, CAPABILITIES, {
			value: [] as StorePlugin<T>[],
			enumerable: false,
			configurable: true,
			writable: false,
		})
	}

	const list = host[CAPABILITIES] as StorePlugin<T>[]

	if (list.some((existing) => existing.name === plugin.name)) {
		throw new Error(
			`[store-core] capability "${plugin.name}" is already attached to this store. ` +
				`Wrap the store in with${plugin.name} only once.`,
		)
	}

	list.push(plugin)
}

/** Plugins attached to `target`, in attachment order (innermost wrapper first). */
export function capabilitiesOf<T extends object>(target: T): readonly StorePlugin<T>[] {
	if (!Object.prototype.hasOwnProperty.call(target, CAPABILITIES)) return []
	return (target as WithCapabilities<T>)[CAPABILITIES] as readonly StorePlugin<T>[]
}
```

- [ ] **Step 4: Экспортировать из корня пакета**

В `packages/store-core/src/index.ts` добавить рядом с экспортом плагина:

```ts
export { attachCapability, capabilitiesOf } from './capability'
```

- [ ] **Step 5: Прогнать тесты и проверки**

Run: `pnpm --filter @ez-kit/store-core test`
Expected: PASS, 5 новых тестов.
Run: `pnpm --filter @ez-kit/store-core lint`
Run: `pnpm --filter @ez-kit/store-core typecheck`

- [ ] **Step 6: Коммит**

```bash
git add packages/store-core/src/capability.ts packages/store-core/src/capability.test.ts packages/store-core/src/index.ts
git commit -m "feat(store-core): add the instance capability registry"
```

---

### Task 2: instance-cache читает способности с инстанса

**Files:**

- Modify: `packages/store-core/src/cache/instance-cache.ts:113-114`
- Modify: `packages/store-core/src/cache/types.ts:28-33`
- Test: `packages/store-core/src/cache/instance-cache.test.ts`

**Interfaces:**

- Consumes: `capabilitiesOf` (Task 1).
- Produces: `CreateOptions<T> = { gcTime: number; context: PluginContext }` — поле `plugins` удалено.

- [ ] **Step 1: Переписать существующие тесты плагинов на способности**

В `instance-cache.test.ts` заменить каждый вызов вида `cache.getOrCreate(id, create, { gcTime, plugins: [p], context })` на `{ gcTime, context }`, где сама фабрика `create` навешивает способность:

```ts
const create = () => {
	const instance = { count: 0 }
	attachCapability(instance, plugin)
	return instance
}
```

И добавить тест на то, что при попадании в кэш setup не перезапускается:

```ts
it('runs capability setup on miss only, never on a hit', () => {
	const setup = vi.fn(() => undefined)
	const create = (): { count: number } => {
		const instance = { count: 0 }
		attachCapability(instance, { name: 'probe', setup })
		return instance
	}

	const cache = createInstanceCache()
	const first = cache.getOrCreate(storeId, create, { gcTime: 0, context })
	const second = cache.getOrCreate(storeId, create, { gcTime: 0, context })

	expect(second).toBe(first)
	expect(setup).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm --filter @ez-kit/store-core test`
Expected: FAIL — `plugins` обязателен в `CreateOptions`, setup не вызывается.

- [ ] **Step 3: Реализовать**

`packages/store-core/src/cache/types.ts` — убрать поле:

```ts
/** Options passed to `getOrCreate` controlling lifetime and the plugin context for the new instance. */
export type CreateOptions = {
	gcTime: number
	context: PluginContext
}
```

`packages/store-core/src/cache/instance-cache.ts` — читать список с созданного инстанса:

```ts
const instance = create()
const cleanups: PluginCleanup[] = capabilitiesOf(instance).map((plugin) => plugin.setup(instance, opts.context))
```

Убрать импорт `StorePlugin`, если он больше не нужен; `CreateOptions` перестаёт быть дженериком — поправить все его упоминания.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm --filter @ez-kit/store-core test`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add packages/store-core/src/cache
git commit -m "refactor(store-core)!: read cached-instance plugins off the instance"
```

---

### Task 3: убрать `plugins` из React-слоя кэша

**Files:**

- Modify: `packages/store-core/src/cache/create-cache-react.tsx:234,270`
- Modify: `packages/store-core/src/cache/types.ts:34-45`
- Test: `packages/store-core/src/cache/create-cache-react.test.tsx`

**Interfaces:**

- Produces: `CachedStoreOptions = { name: string; gcTime?: number }` — поле `plugins` удалено.

- [ ] **Step 1: Переписать тесты**

В `create-cache-react.test.tsx` убрать `plugins` из всех `createCachedStore(factory, { … })` и навесить способность внутри фабрики через `attachCapability`. Добавить тест серверной ветки:

```ts
it('skips capability setup during server rendering', () => {
	const setup = vi.fn(() => undefined)
	// ... factory attaches { name: 'probe', setup }
	renderToString(<group.Provider id="a">{null}</group.Provider>)
	expect(setup).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm --filter @ez-kit/store-core test`

- [ ] **Step 3: Реализовать**

Удалить строку `const plugins = options.plugins ?? []` и убрать `plugins` из вызова:

```ts
return cache.getOrCreate(storeId, () => factory({ defaultValue }), { gcTime, context })
```

Серверная ветка (`typeof window === 'undefined'` → `factory({ defaultValue })` без кэша) остаётся ровно как была: способности навешиваются, setup'ы не запускаются.

- [ ] **Step 4: Прогнать тесты + сборку**

Run: `pnpm --filter @ez-kit/store-core test`
Run: `pnpm --filter @ez-kit/store-core build`
Run: `pnpm --filter @ez-kit/store-core size`

- [ ] **Step 5: Коммит**

```bash
git add packages/store-core/src/cache
git commit -m "refactor(store-core)!: drop the plugins option from CachedStoreOptions"
```

---

### Task 4: `createContextStore` читает способности

**Files:**

- Modify: `packages/va-store/src/create-context-store/index.tsx:137-153`
- Create: `packages/va-store/src/create-context-store/capabilities.test.tsx`
- Delete: `packages/va-store/src/create-context-store/plugins.test.tsx`

**Interfaces:**

- Consumes: `capabilitiesOf` (Task 1).
- Produces: `CreateContextStoreOptions<TState> = { name?: string; controlled?: ControlledConfig<TState> }` — поле `plugins` удалено.

- [ ] **Step 1: Перенести тесты**

Скопировать `plugins.test.tsx` в `capabilities.test.tsx`, заменив передачу плагинов через опции на навешивание в фабрике:

```tsx
const store = createContextStore(() => {
	const state = proxy({ count: 0 })
	attachCapability(state, { name: 'probe', setup })
	return state
})
```

Плюс два новых теста:

```tsx
it('runs setups in attachment order, innermost first', () => {
	const calls: string[] = []
	const store = createContextStore(() => {
		const state = proxy({ count: 0 })
		attachCapability(state, { name: 'inner', setup: () => void calls.push('inner') })
		attachCapability(state, { name: 'outer', setup: () => void calls.push('outer') })
		return state
	})

	render(<store.Provider>{null}</store.Provider>)
	expect(calls).toEqual(['inner', 'outer'])
})

it('runs cleanups on unmount, in reverse order', () => {
	// ожидание: ['outer', 'inner']
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm --filter @ez-kit/va-store test capabilities`

- [ ] **Step 3: Реализовать**

В `createContextStore` удалить `const plugins = options.plugins ?? []` и поле `plugins` из `CreateContextStoreOptions`; `usePlugins` переименовать в `useCapabilities` и читать список с инстанса:

```tsx
function useCapabilities(store: TState, services: PluginContext['services']): void {
	useEffect(() => {
		const capabilities = capabilitiesOf(store)
		if (capabilities.length === 0) return
		const context: PluginContext = { services, id: storeId, isServer: IS_SERVER }
		const cleanups: PluginCleanup[] = capabilities.map((plugin) => plugin.setup(store, context))
		return () => {
			for (const cleanup of cleanups.reverse()) {
				if (cleanup) cleanup()
			}
		}
	}, [store, services])
}
```

Обрати внимание: `cleanups.reverse()` мутирует массив — он локальный и используется один раз, но если lint на это ругается, писать `[...cleanups].reverse()`.

- [ ] **Step 4: Прогнать тесты, удалить старый файл**

Run: `pnpm --filter @ez-kit/va-store test`
Expected: тесты persist пока падают — они ещё передают `plugins:` в опции. Это чинится в Task 5; не чинить здесь ничего другого.

```bash
git rm packages/va-store/src/create-context-store/plugins.test.tsx
```

- [ ] **Step 5: Коммит**

```bash
git add packages/va-store/src/create-context-store
git commit -m "refactor(va-store)!: discover store capabilities on the instance"
```

---

### Task 5: `withPersist` и миграция всех вызовов

**Files:**

- Create: `packages/va-store/src/persist/with-persist.ts`
- Modify: `packages/va-store/src/persist/index.ts`
- Modify: тесты persist — `plugin.test.tsx`, `cached-store.test.tsx`, `storage/storage-store.test.tsx`, `url/next.test.tsx`, `url/react-router.test.tsx`
- Modify: примеры `apps/docs/shared/examples/va-store/persist-*.tsx`, `cache-persist-combined.tsx`

**Interfaces:**

- Consumes: `persist(options)` (без изменений), `attachCapability` (Task 1).
- Produces: `withPersist<T extends object>(target: T, options?: PersistPluginOptions<T>): T`.

- [ ] **Step 1: Написать падающий тест**

```ts
// packages/va-store/src/persist/with-persist.test.ts
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { capabilitiesOf } from '@ez-kit/store-core'

import { withPersist } from './with-persist'

describe('withPersist', () => {
	it('returns the same proxy identity', () => {
		const state = proxy({ q: '' })
		expect(withPersist(state, {})).toBe(state)
	})

	it('registers exactly one persist capability', () => {
		const state = withPersist(proxy({ q: '' }), {})
		expect(capabilitiesOf(state).map((plugin) => plugin.name)).toEqual(['persist'])
	})

	it('keeps the proxy free of extra enumerable keys', () => {
		const state = withPersist(proxy({ q: '' }), {})
		expect(Object.keys(state)).toEqual(['q'])
	})
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `pnpm --filter @ez-kit/va-store test with-persist`

- [ ] **Step 3: Реализовать**

```ts
// packages/va-store/src/persist/with-persist.ts
import { attachCapability } from '@ez-kit/store-core'

import { persist, type PersistPluginOptions } from './plugin'

/**
 * Factory-position front for the persist plugin: registers it on the proxy so `createContextStore`'s
 * Provider (or the instance cache) connects it at mount. The plugin itself is unchanged — this only
 * moves *where* it is declared, so persist sits in the same `with*` chain as every other capability.
 *
 * The `$url` / `$persist` control handles are still attached by the plugin's `setup`, so keep reading
 * them through `urlHandle()` / `persistHandle()` rather than off the returned type.
 */
export function withPersist<T extends object>(target: T, options: PersistPluginOptions<T> = {}): T {
	attachCapability(target, persist<T>(options))
	return target
}
```

Экспортировать из `packages/va-store/src/persist/index.ts`:

```ts
export { persist, type PersistPluginOptions, useHydrated } from './plugin'
export { withPersist } from './with-persist'
```

`persist()` остаётся экспортированным — он нужен внутри `withPersist` и как escape hatch для авторов адаптеров; в документации фигурирует только `withPersist`.

- [ ] **Step 4: Мигрировать все вызовы**

Каждое место вида

```tsx
const store = createContextStore(() => proxy({ q: '' }), { plugins: [persist({ fields: (f) => ({ q: f.url() }) })] })
```

становится

```tsx
const store = createContextStore(() => withPersist(proxy({ q: '' }), { fields: (f) => ({ q: f.url() }) }))
```

Пройти по списку: 38 вхождений `plugins:` в тестах и примерах. Найти их заново перед началом:

```bash
grep -rn "plugins:" packages/va-store/src apps/docs/shared/examples/va-store
```

- [ ] **Step 5: Прогнать весь пакет**

Run: `pnpm --filter @ez-kit/va-store test`
Expected: PASS — все 182 существующих теста плюс новые. Ни один тест persist не должен потребовать правки логики, только формы вызова: если поведение изменилось, это регрессия, а не ожидаемое следствие.
Run: `pnpm --filter @ez-kit/va-store lint`
Run: `pnpm --filter @ez-kit/va-store typecheck`

- [ ] **Step 6: Коммит**

```bash
git add packages/va-store/src apps/docs/shared/examples/va-store
git commit -m "feat(va-store)!: declare persist through withPersist in the factory chain"
```

---

### Task 6: общий движок стеков истории

**Files:**

- Create: `packages/store-core/src/history/types.ts`, `packages/store-core/src/history/stack.ts`, `packages/store-core/src/history/index.ts`
- Test: `packages/store-core/src/history/stack.test.ts`
- Modify: `packages/store-core/package.json` (сабпуть `./history`, `size-limit` 2 KB), `packages/store-core/tsup.config.ts`

**Interfaces:**

- Produces:

```ts
export type HistoryOptions<T, TMeta = unknown> = {
	limit?: number
	defaultPaused?: boolean
	defaultPasts?: T[]
	defaultFutures?: T[]
	shouldRecord?: (prev: T, next: T, meta?: TMeta) => boolean
}

export type HistorySnapshot<T> = {
	pasts: readonly T[]
	futures: readonly T[]
	limit: number
	isPaused: boolean
}

export type HistoryAdapter<T> = {
	read: () => T
	write: (state: T) => void
	onStateChange: (snapshot: HistorySnapshot<T>) => void
}

export type HistoryApi<T, TMeta = unknown> = {
	record: (prev: T, next: T, meta?: TMeta) => void
	undo: () => void
	redo: () => void
	goto: (index: number) => void
	clear: () => void
	pause: () => void
	resume: () => void
	skip: (fn: () => void) => void
	readonly isPaused: boolean
}

export function createHistoryStack<T, TMeta = unknown>(
	adapter: HistoryAdapter<T>,
	options?: HistoryOptions<T, TMeta>,
): HistoryApi<T, TMeta>
```

- [ ] **Step 1: Написать падающие тесты**

```ts
// packages/store-core/src/history/stack.test.ts
import { describe, expect, it, vi } from 'vitest'

import { createHistoryStack } from './stack'

import type { HistoryAdapter, HistorySnapshot } from './types'

type State = { count: number }

function harness(initial: State = { count: 0 }) {
	let current = initial
	const snapshots: HistorySnapshot<State>[] = []
	const adapter: HistoryAdapter<State> = {
		read: () => current,
		write: (state) => {
			current = state
		},
		onStateChange: (snapshot) => snapshots.push(snapshot),
	}
	return {
		adapter,
		snapshots,
		get current() {
			return current
		},
		set current(next: State) {
			current = next
		},
	}
}

describe('createHistoryStack', () => {
	it('records a past entry and clears futures', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})

		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		expect(h.snapshots.at(-1)?.pasts).toEqual([{ count: 0 }])
		expect(h.snapshots.at(-1)?.futures).toEqual([])
	})

	it('undo writes the previous state back and moves the current one into futures', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		history.undo()

		expect(h.current).toEqual({ count: 0 })
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 1 }])
		expect(h.snapshots.at(-1)?.pasts).toEqual([])
	})

	it('is a no-op when there is nothing to undo or redo', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		const before = h.snapshots.length

		history.undo()
		history.redo()

		expect(h.current).toEqual({ count: 0 })
		expect(h.snapshots.length).toBe(before)
	})

	it('trims the pasts stack from the front once limit is exceeded', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, { limit: 2 })

		history.record({ count: 0 }, { count: 1 })
		history.record({ count: 1 }, { count: 2 })
		history.record({ count: 2 }, { count: 3 })

		expect(h.snapshots.at(-1)?.pasts).toEqual([{ count: 1 }, { count: 2 }])
	})

	it('trims defaultPasts beyond limit from the front', () => {
		const h = harness()
		createHistoryStack(h.adapter, { limit: 1, defaultPasts: [{ count: 7 }, { count: 8 }] })

		expect(h.snapshots.at(-1)?.pasts).toEqual([{ count: 8 }])
	})

	it('does not record while paused, and the state still changes', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, { defaultPaused: true })

		history.record({ count: 0 }, { count: 1 })

		expect(h.snapshots.at(-1)?.pasts ?? []).toEqual([])
	})

	it('skip is re-entrant and restores the outer paused value', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, { defaultPaused: true })

		history.skip(() => {
			history.skip(() => {})
			expect(history.isPaused).toBe(true)
		})

		expect(history.isPaused).toBe(true)
	})

	it('skips a write when shouldRecord returns false but still lets it through', () => {
		const h = harness()
		const shouldRecord = vi.fn(() => false)
		const history = createHistoryStack<State, string>(h.adapter, { shouldRecord })

		history.record({ count: 0 }, { count: 1 }, 'typing')

		expect(shouldRecord).toHaveBeenCalledWith({ count: 0 }, { count: 1 }, 'typing')
		expect(h.snapshots.at(-1)?.pasts ?? []).toEqual([])
	})

	it('goto jumps to an absolute timeline position with a single write', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		history.record({ count: 1 }, { count: 2 })
		h.current = { count: 2 }
		const writes = h.snapshots.length

		history.goto(0)

		expect(h.current).toEqual({ count: 0 })
		expect(h.snapshots.length).toBe(writes + 1)
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 1 }, { count: 2 }])
	})

	it('clamps an out-of-range goto index instead of throwing', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		history.goto(-5)
		expect(h.current).toEqual({ count: 0 })

		history.goto(99)
		expect(h.current).toEqual({ count: 1 })
	})

	it('clear empties both stacks without touching the state', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		history.clear()

		expect(h.current).toEqual({ count: 1 })
		expect(h.snapshots.at(-1)?.pasts).toEqual([])
		expect(h.snapshots.at(-1)?.futures).toEqual([])
	})

	it('does not record the write it performs itself during undo', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }
		// эмулируем менеджер, который зовёт record из подписки на любую запись
		h.adapter.write = (state) => {
			h.current = state
			history.record({ count: 1 }, state)
		}

		history.undo()

		expect(h.snapshots.at(-1)?.pasts).toEqual([])
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 1 }])
	})
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm --filter @ez-kit/store-core test history`
Expected: FAIL — `Cannot find module './stack'`.

- [ ] **Step 3: Реализовать движок**

```ts
// packages/store-core/src/history/stack.ts
import type { HistoryAdapter, HistoryApi, HistoryOptions, HistorySnapshot } from './types'

const DEFAULT_LIMIT = 100

/** Keep at most `limit` entries, dropping the OLDEST — the front of the stack. */
function trim<T>(stack: T[], limit: number): T[] {
	return stack.length > limit ? stack.slice(stack.length - limit) : stack
}

export function createHistoryStack<T, TMeta = unknown>(
	adapter: HistoryAdapter<T>,
	options: HistoryOptions<T, TMeta> = {},
): HistoryApi<T, TMeta> {
	const limit = options.limit ?? DEFAULT_LIMIT
	const shouldRecord = options.shouldRecord

	let pasts = trim([...(options.defaultPasts ?? [])], limit)
	let futures = trim([...(options.defaultFutures ?? [])], limit)
	let isPaused = options.defaultPaused ?? false

	function publish(): void {
		const next: HistorySnapshot<T> = { pasts: [...pasts], futures: [...futures], limit, isPaused }
		adapter.onStateChange(next)
	}

	/** Run `fn` with recording suppressed; re-entrant, so nested calls restore the OUTER value. */
	function skip(fn: () => void): void {
		const prior = isPaused
		isPaused = true
		try {
			fn()
		} finally {
			isPaused = prior
		}
	}

	/** Write `state` back without the resulting notification landing in the stacks. */
	function restore(state: T): void {
		skip(() => {
			adapter.write(state)
		})
	}

	const api: HistoryApi<T, TMeta> = {
		record(prev, next, meta) {
			if (isPaused) return
			if (shouldRecord && !shouldRecord(prev, next, meta)) return

			pasts = trim([...pasts, prev], limit)
			futures = []
			publish()
		},

		undo() {
			const prev = pasts.at(-1)
			if (prev === undefined) return

			const current = adapter.read()
			pasts = pasts.slice(0, -1)
			futures = trim([current, ...futures], limit)
			restore(prev)
			publish()
		},

		redo() {
			const next = futures.at(0)
			if (next === undefined) return

			const current = adapter.read()
			futures = futures.slice(1)
			pasts = trim([...pasts, current], limit)
			restore(next)
			publish()
		},

		/**
		 * Jump to absolute position `index` on the linear timeline `[...pasts, current, ...futures]`.
		 * Position `pasts.length` is the current state. Out-of-range indices are clamped rather than
		 * rejected. Issues exactly one `write` and one `onStateChange`, whatever the distance.
		 */
		goto(index) {
			const timeline = [...pasts, adapter.read(), ...futures]
			const target = Math.min(Math.max(index, 0), timeline.length - 1)
			if (target === pasts.length) return

			const state = timeline[target] as T
			pasts = trim(timeline.slice(0, target), limit)
			futures = trim(timeline.slice(target + 1), limit)
			restore(state)
			publish()
		},

		clear() {
			pasts = []
			futures = []
			publish()
		},

		pause() {
			if (isPaused) return
			isPaused = true
			publish()
		},

		resume() {
			if (!isPaused) return
			isPaused = false
			publish()
		},

		skip,

		get isPaused() {
			return isPaused
		},
	}

	publish()
	return api
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm --filter @ez-kit/store-core test history`
Expected: PASS, 13 тестов.

- [ ] **Step 5: Объявить сабпуть**

`packages/store-core/package.json`:

```json
"./history": { "types": "./dist/history/index.d.ts", "import": "./dist/history/index.js" }
```

и запись в `size-limit` с бюджетом `2 KB`. Добавить вход в `tsup.config.ts`.

Run: `pnpm --filter @ez-kit/store-core build`
Run: `pnpm --filter @ez-kit/store-core size`

- [ ] **Step 6: Коммит**

```bash
git add packages/store-core
git commit -m "feat(store-core): add the manager-agnostic history stack"
```

---

### Task 7: `withHistory` для va-store

**Files:**

- Create: `packages/va-store/src/history/with-history.ts`, `packages/va-store/src/history/use-history.ts`, `packages/va-store/src/history/index.ts`
- Test: `packages/va-store/src/history/with-history.test.tsx`
- Modify: `packages/va-store/src/index.ts`, `packages/va-store/package.json`

**Interfaces:**

- Consumes: `createHistoryStack`, `HistoryOptions` (Task 6); `attachCapability` (Task 1).
- Produces:

```ts
export type ValtioOp =
	| readonly ['set', readonly (string | symbol)[], unknown, unknown]
	| readonly ['delete', readonly (string | symbol)[], unknown]

export type ValtioHistoryOptions<T extends object> = HistoryOptions<T, readonly ValtioOp[]> & {
	/** Record one entry per operation instead of one per microtask batch. Defaults to `false`. */
	sync?: boolean
}

export type StoreHistory<T extends object> = HistoryApi<T, readonly ValtioOp[]> & {
	/** Live stacks, as their own proxy — subscribe with `useSnapshot` or `useHistory`. */
	state: HistorySnapshot<T>
	toJSON: () => undefined
}

export function withHistory<T extends object>(
	target: T,
	options?: ValtioHistoryOptions<T>,
): T & { history: StoreHistory<T> }

export function useHistory<T extends object>(
	store: T & { history: StoreHistory<T> },
): StoreHistory<T> & HistorySnapshot<T> & { canUndo: boolean; canRedo: boolean }
```

`ValtioOp` объявляем сами: valtio экспортирует этот тип как `INTERNAL_Op`, завязываться на него в публичной сигнатуре нельзя.

- [ ] **Step 1: Написать падающие тесты**

```tsx
// packages/va-store/src/history/with-history.test.tsx
import { render, screen } from '@testing-library/react'
import { proxy, snapshot } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createContextStore } from '../create-context-store'

import { withHistory } from './with-history'

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('withHistory', () => {
	it('returns the same proxy identity', () => {
		const state = proxy({ count: 0 })
		expect(withHistory(state)).toBe(state)
	})

	it('exposes history through the snapshot as the same object (ref)', () => {
		const state = withHistory(proxy({ count: 0 }))
		expect(snapshot(state).history).toBe(state.history)
	})

	it('keeps history out of JSON', () => {
		const state = withHistory(proxy({ count: 0 }))
		expect(JSON.parse(JSON.stringify(snapshot(state)))).toEqual({ count: 0 })
	})

	it('records one entry per microtask batch by default', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		state.count = 2
		await flush()

		expect(state.history.state.pasts).toHaveLength(1)
	})

	it('records one entry per operation with sync: true', async () => {
		const state = withHistory(proxy({ count: 0 }), { sync: true })
		state.count = 1
		state.count = 2
		await flush()

		expect(state.history.state.pasts).toHaveLength(2)
	})

	it('records the user state without its own history key', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()

		expect(state.history.state.pasts).toEqual([{ count: 0 }])
	})

	it('undo restores the previous state without recording itself', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()

		state.history.undo()
		await flush()

		expect(state.count).toBe(0)
		expect(state.history.state.pasts).toHaveLength(0)
		expect(state.history.state.futures).toHaveLength(1)
	})

	it('redo replays the undone state', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.count = 1
		await flush()
		state.history.undo()
		await flush()

		state.history.redo()
		await flush()

		expect(state.count).toBe(1)
		expect(state.history.state.futures).toHaveLength(0)
	})

	it('restores nested objects as live proxies, not frozen snapshots', async () => {
		const state = withHistory(proxy({ nested: { a: 1 } }))
		state.nested = { a: 2 }
		await flush()

		state.history.undo()
		await flush()

		expect(state.nested.a).toBe(1)
		expect(() => {
			state.nested.a = 3
		}).not.toThrow()
	})

	it('deletes keys that the restored state does not have', async () => {
		const state = withHistory(proxy<{ a: number; b?: number }>({ a: 1 }))
		state.b = 2
		await flush()

		state.history.undo()
		await flush()

		expect('b' in state).toBe(false)
	})

	it('does not record mutations made inside skip', async () => {
		const state = withHistory(proxy({ count: 0 }))
		state.history.skip(() => {
			state.count = 5
		})
		await flush()

		expect(state.count).toBe(5)
		expect(state.history.state.pasts).toHaveLength(0)
	})

	it('passes valtio ops to shouldRecord so a path can be excluded', async () => {
		const state = withHistory(proxy({ count: 0, hovered: false }), {
			shouldRecord: (_prev, _next, ops) => !ops?.every((op) => op[1][0] === 'hovered'),
		})

		state.hovered = true
		await flush()
		expect(state.history.state.pasts).toHaveLength(0)

		state.count = 1
		await flush()
		expect(state.history.state.pasts).toHaveLength(1)
	})

	it('treats the first render batch as the baseline, not as an entry', async () => {
		const store = createContextStore((init: { defaultValue: { count: number } }) =>
			withHistory(proxy({ count: init.defaultValue.count })),
		)

		// захватываем сам инстанс, а стек читаем ПОСЛЕ микротаска, когда valtio уже уведомил
		let instance: (typeof store extends { useStore: () => infer S } ? S : never) | undefined
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		render(
			<store.Provider
				defaultValue={{ count: 0 }}
				value={{ count: 7 }}
			>
				<store.Subscribe>{({ snap }) => <span>{snap.count}</span>}</store.Subscribe>
				<Probe />
			</store.Provider>,
		)
		await flush()

		expect(screen.getByText('7')).toBeDefined()
		// начальный проброс controlled `value` не должен быть шагом истории
		expect(instance?.history.state.pasts).toHaveLength(0)
	})
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm --filter @ez-kit/va-store test with-history`

- [ ] **Step 3: Реализовать**

Опорные точки реализации:

```ts
import { deepClone } from 'valtio/utils'
import { proxy, ref, snapshot, subscribe } from 'valtio'
```

- адаптер: `read: () => omitHistoryKey(snapshot(target)) as T` (решение 11 — записанные состояния без собственного ключа), `write: (state) => applyState(target, deepClone(state))`, где `applyState` никогда не трогает ключ `history`, `onStateChange: (next) => Object.assign(stacks, next)`, где `stacks = proxy({ pasts: [], futures: [], limit, isPaused })`;
- `applyState` присваивает ключи и **удаляет** те, которых нет в восстанавливаемом состоянии;
- подписка: `subscribe(target, (ops) => { const next = snapshot(target) as T; if (isBaselinePending) { last = next; isBaselinePending = false; return } api.record(last, next, ops); last = next }, options.sync ?? false)`;
- `isBaselinePending` стартует `true` — первый батч (синхронные записи первого рендера, включая начальный проброс `controlled`) становится базовой линией;
- API кладём в прокси как `ref`, поле называется `history`, у объекта есть `toJSON: () => undefined`;
- сервер: если `typeof window === 'undefined'` — не подписываться вовсе, API остаётся инертным.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm --filter @ez-kit/va-store test with-history`
Expected: PASS.

- [ ] **Step 5: Хук `useHistory` + экспорты + сабпуть**

`useHistory(store)` = `useSnapshot(store.history.state)` плюс `canUndo` / `canRedo` и методы из `store.history`. Экспортировать `withHistory`, `useHistory` и типы из `packages/va-store/src/index.ts`; сабпуть `./history` в `package.json` с бюджетом `2 KB`.

Run: `pnpm --filter @ez-kit/va-store build`
Run: `pnpm --filter @ez-kit/va-store size`

- [ ] **Step 6: Коммит**

```bash
git add packages/va-store/src/history packages/va-store/src/index.ts packages/va-store/package.json
git commit -m "feat(va-store): add withHistory on the shared history stack"
```

---

### Task 8: связки — history × persist × controlled × cache

**Files:**

- Create: `packages/va-store/src/history/interop.test.tsx`

Это отдельная задача, потому что здесь ловятся дефекты, которых не видно в тестах одной фичи.

- [ ] **Step 1: Написать тесты связок**

Переиспользуй тестовую обвязку persist из `packages/va-store/src/persist/plugin.test.tsx` (`PersistProvider` + `fakePersistAdapter` из `src/persist/testing/fake-persist-adapter.ts`) — не изобретай свою.

```tsx
// packages/va-store/src/history/interop.test.tsx
import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'

import { attachCapability } from '@ez-kit/store-core'

import { createContextStore } from '../create-context-store'
import { useHydrated } from '../persist/plugin'
import { withPersist } from '../persist/with-persist'
import { createStoreCache } from '../store-cache'

import { withHistory } from './with-history'

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('history interop', () => {
	it('records persist hydration as a step by default', async () => {
		// адаптер отдаёт q='seeded' — гидрация приходит отдельным (асинхронным) батчем,
		// поэтому под правило «первый батч = базовая линия» она НЕ попадает
		const store = createContextStore(() =>
			withPersist(withHistory(proxy({ q: '' })), { fields: (f) => ({ q: f.url() }) }),
		)
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		render(
			<TestPersistProvider initialUrl='?q=seeded'>
				<store.Provider>
					<Probe />
				</store.Provider>
			</TestPersistProvider>,
		)
		await act(flush)

		expect(instance.q).toBe('seeded')
		expect(instance.history.state.pasts).toEqual([{ q: '' }])
	})

	it('keeps hydration out of history with defaultPaused + resume on hydrated', async () => {
		const store = createContextStore(() =>
			withPersist(withHistory(proxy({ q: '' }), { defaultPaused: true }), { fields: (f) => ({ q: f.url() }) }),
		)
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			const hydrated = useHydrated(instance)
			useEffect(() => {
				if (hydrated) instance.history.resume()
			}, [hydrated, instance])
			return null
		}

		render(
			<TestPersistProvider initialUrl='?q=seeded'>
				<store.Provider>
					<Probe />
				</store.Provider>
			</TestPersistProvider>,
		)
		await act(flush)

		expect(instance.q).toBe('seeded')
		expect(instance.history.state.pasts).toHaveLength(0)

		await act(async () => {
			instance.q = 'typed'
			await flush()
		})

		expect(instance.history.state.pasts).toEqual([{ q: 'seeded' }])
	})

	it('commits an undo back into persist', async () => {
		// ... тот же сетап; меняем q, ждём, undo()
		await act(async () => {
			instance.q = 'typed'
			await flush()
		})
		await act(async () => {
			instance.history.undo()
			await flush()
		})

		expect(instance.q).toBe('seeded')
		expect(currentUrl()).toContain('q=seeded')
	})

	it('runs capability setups innermost first', () => {
		const calls: string[] = []
		const store = createContextStore(() => {
			const state = proxy({ q: '' })
			attachCapability(state, { name: 'inner', setup: () => void calls.push('inner') })
			attachCapability(state, { name: 'outer', setup: () => void calls.push('outer') })
			return state
		})

		render(<store.Provider>{null}</store.Provider>)

		expect(calls).toEqual(['inner', 'outer'])
	})

	it('records an externally pushed controlled value and converges after undo', async () => {
		const store = createContextStore(() => withHistory(proxy({ q: '' })))
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		const onValueChange = vi.fn()
		const view = render(
			<store.Provider
				value={{ q: 'a' }}
				onValueChange={onValueChange}
			>
				<Probe />
			</store.Provider>,
		)
		await act(flush)

		// первый кадр — базовая линия, не шаг
		expect(instance.history.state.pasts).toHaveLength(0)

		view.rerender(
			<store.Provider
				value={{ q: 'b' }}
				onValueChange={onValueChange}
			>
				<Probe />
			</store.Provider>,
		)
		await act(flush)

		expect(instance.q).toBe('b')
		expect(instance.history.state.pasts).toHaveLength(1)

		await act(async () => {
			instance.history.undo()
			await flush()
		})

		// undo пишет в контролируемый ключ → стор просит владельца вернуться к 'a'
		expect(instance.q).toBe('a')
		expect(onValueChange).toHaveBeenLastCalledWith({ q: 'a' })
	})

	it('keeps history across a remount inside gcTime and drops it after', async () => {
		vi.useFakeTimers()
		const cache = createStoreCache({ gcTime: 1000 })
		const group = cache.createCachedStore(() => withHistory(proxy({ count: 0 })), { name: 'counter' })
		// смонтировать, записать шаг, размонтировать, смонтировать снова в пределах gcTime
		// → pasts.length === 1; прокрутить таймеры за gcTime и смонтировать снова → pasts.length === 0
		vi.useRealTimers()
	})

	it('stops recording after the Provider unmounts', async () => {
		const store = createContextStore(() => withHistory(proxy({ count: 0 })))
		let instance!: ReturnType<typeof store.useStore>
		function Probe(): null {
			instance = store.useStore()
			return null
		}

		const view = render(
			<store.Provider>
				<Probe />
			</store.Provider>,
		)
		await act(flush)
		view.unmount()

		instance.count = 1
		await flush()

		// подписка живёт на самом прокси, поэтому запись продолжится — фиксируем ОЖИДАЕМОЕ поведение
		// явно, чтобы оно не менялось молча: осиротевший прокси не наблюдается никем и уходит в GC.
		expect(instance.history.state.pasts).toHaveLength(1)
	})
})
```

Тесты с `// ...` дописать целиком по образцу соседних — сетап `TestPersistProvider` / `currentUrl` взять из `packages/va-store/src/persist/url/react-router.test.tsx`.

- [ ] **Step 2: Прогнать и зафиксировать**

Run: `pnpm --filter @ez-kit/va-store test interop`
Любое расхождение с ожиданиями выше — сначала в отчёт, потом решение; молча подгонять ожидание под поведение нельзя.

- [ ] **Step 3: Коммит**

```bash
git add packages/va-store/src/history/interop.test.tsx
git commit -m "test(va-store): cover history interop with persist, controlled and the cache"
```

---

### Task 9: типизированные ручки persist (отдельно, после зелёного основного рефакторинга)

**Files:**

- Modify: `packages/va-store/src/persist/plugin.tsx:120-155`, `packages/va-store/src/persist/with-persist.ts`, `packages/va-store/src/persist/handle.ts`

Цель: `withPersist` возвращает `T & { $url: UrlHandle; $persist: PersistHandle }`, чтобы ручки были типизированы наравне с `history`.

Для этого создание биндингов надо разделить: конструирование (нужен только прокси и спеки полей — можно в фабричной фазе) и подключение к движкам (нужны сервисы — остаётся в `setup`). Сейчас всё происходит в `setup`, а `attachHandles` вызывается на строке 149.

Побочный эффект, который надо проверить тестом: биндинги начнут захватывать «нетронутые» значения полей **раньше** — до первого проброса `controlled value`, который сейчас происходит в первом рендере после фабрики. Комментарий в `plugin.tsx` прямо говорит, что биндинги обязаны видеть pristine-дефолты; фабричная фаза даёт более честный pristine, но это изменение поведения, и его надо зафиксировать тестом до и после.

Задачу **не начинать**, пока Task 1–8 не зелёные и не смерджены.

---

### Task 10: перевести zu-store `withHistory` на общий движок

**Files:**

- Modify: `packages/zu-store/src/middlewares/with-history/index.ts`, `packages/zu-store/src/middlewares/with-history/types.ts`

Поведение не меняется — меняется только то, откуда берутся стеки. `HistoryOptions` / `HistoryState` переезжают в `@ez-kit/store-core/history`, zu-store биндит `TMeta = HistoryActionTag`; мидлвара остаётся мидлварой, `store.history` остаётся zustand sub-store, `onStateChange` пишет в него.

Критерий приёмки: **все 119 существующих тестов zu-store проходят без правок**. Любая правка существующего теста — сигнал, что поведение поехало.

```bash
git commit -m "refactor(zu-store): build withHistory on the shared history stack"
```

---

### Task 11: документация и changesets

**Files:**

- Modify: `apps/docs/content/docs/va-store/**` (13 вхождений `plugins:`), `apps/docs/content/docs/va-store/meta.json`, `packages/va-store/README.md`, `packages/store-core/README.md`
- Create: `apps/docs/content/docs/va-store/history.mdx`, `apps/docs/content/docs/va-store/capabilities.mdx`
- Delete: `packages/va-store/docs/*.md`, `packages/zu-store/docs/*.md` (протухли: описывают `Item` вместо `Subscribe`; канон — README + сайт)
- Create: `.changeset/*.md`

- [ ] **Step 1: Переписать страницы persist на `withPersist`**

```bash
grep -rn "plugins:" apps/docs/content/docs/va-store
```

- [ ] **Step 2: Новая страница «Capabilities»** — один шов, цепочка `withA(withB(proxy(…)))`, порядок setup'ов, что делать автору своей способности (`attachCapability` + `StorePlugin`).

- [ ] **Step 3: Новая страница «History»** — `withHistory`, таблица опций (`limit`, `defaultPaused`, `defaultPasts`, `defaultFutures`, `shouldRecord`, `sync`), `useHistory`, честный раздел про стоимость: deep clone на запись, `ref`-значения и классы по времени не путешествуют, рецепт с `defaultPaused` + `useHydrated`.

- [ ] **Step 4: Обновить `meta.json`, README обоих пакетов и таблицу паритета в `packages/store-core/README.md`.**

- [ ] **Step 5: Changesets** — `@ez-kit/store-core`, `@ez-kit/va-store`, `@ez-kit/zu-store`, все **minor**, в summary явно перечислить сломы: удаление `options.plugins`, удаление `CachedStoreOptions.plugins`, переход persist на `withPersist`.

- [ ] **Step 6: Полная проверка и коммит**

```bash
pnpm run ci
git add -A
git commit -m "docs(stores): document the capability chain and withHistory"
```

---

## Пограничные случаи — сводный чек-лист

Отмечать по мере закрытия; каждый пункт должен быть закрыт **тестом**, а не рассуждением.

- [ ] Способность навешена дважды (`withHistory(withHistory(…))`) → внятная ошибка, а не два рекордера (Task 1).
- [ ] Способности не наследуются по прототипу (Task 1).
- [ ] Реестр не виден в `Object.keys`, спреде, `JSON.stringify` (Task 1).
- [ ] Попадание в кэш не перезапускает setup (Task 2).
- [ ] Серверный рендер: способности навешены, setup'ы не запускаются (Task 3).
- [ ] Cleanup'ы на размонтировании идут в обратном порядке (Task 4).
- [ ] `withPersist` сохраняет идентичность прокси и не добавляет enumerable-ключей (Task 5).
- [ ] `limit`, `defaultPasts`, `defaultFutures` режутся спереди (Task 6).
- [ ] `goto` кламкается и делает ровно один write (Task 6).
- [ ] `skip` реентерабелен (Task 6).
- [ ] Собственная запись движка при undo не попадает обратно в стек (Task 6).
- [ ] `snapshot(state).history` — тот же объект (`ref`), не readonly-копия (Task 7).
- [ ] `history` не течёт в `JSON.stringify` (Task 7).
- [ ] Записанные в `pasts` состояния не содержат ключ `history`, и `applyState` его не трогает (Task 7).
- [ ] Вложенные объекты после undo остаются живыми прокси, а не замороженными снапшотами (Task 7).
- [ ] Ключи, которых нет в восстанавливаемом состоянии, удаляются (Task 7).
- [ ] Первый батч (синхронные записи первого рендера + начальный `controlled value`) — базовая линия, не шаг (Task 7).
- [ ] `sync: true` даёт шаг на операцию, по умолчанию — шаг на микротаск-батч (Task 7).
- [ ] Внешняя смена `controlled value` — шаг истории; undo по нему дёргает `onValueChange`, и состояние сходится (Task 8).
- [ ] Гидрация persist по умолчанию **является** шагом; рецепт `defaultPaused: true` + `resume()` по `useHydrated` даёт пустой стек до гидрации (Task 8).
- [ ] Undo после гидрации коммитит в persist (Task 8).
- [ ] История переживает размонтирование в пределах `gcTime` кэша и обнуляется после (Task 8).
- [ ] Поведение осиротевшего прокси после размонтирования зафиксировано тестом явно: подписка живёт на самом прокси, поэтому запись продолжается, а сам прокси вместе с историей уходит в GC — важно, чтобы это не поменялось молча (Task 8).
- [ ] `Map` / `Set` / `ref`-значения в состоянии: задокументировано, что по времени они не путешествуют, и есть тест, что undo на них не падает (Task 7).

## Открытые вопросы

Все закрыты, оставлено для истории решений:

1. ~~Внешний проброс `controlled value` — шаг истории или нет?~~ **Решено: шаг.** Пишем любое изменение состояния, кроме первого батча (см. решения 9–10). Суппресс потребовал бы флага, не доживающего до микротаск-колбэка valtio; «пишем всё» — путь без дополнительного кода, и он согласован с контролируемым круговоротом через `onValueChange`.
2. ~~Task 9 (типизированные `$url` / `$persist`)~~ **Решено: делаем, но позже** — отдельным PR после зелёного Task 1–8, потому что он сдвигает момент захвата pristine-дефолтов биндингами.
3. ~~Шов способностей в zu-store~~ **Решено: не здесь** — вместе с #212 (вынос persist в общий слой).

## Порядок и точки остановки

Task 1 → 2 → 3 (store-core, самодостаточно, тесты store-core зелёные) → 4 → 5 (va-store переезжает на новый шов, все 182 теста зелёные) → **остановка и ревью** → 6 → 7 → 8 (история) → **остановка и ревью** → 9 / 10 / 11.

Между Task 5 и Task 6 репозиторий обязан быть полностью зелёным: `pnpm run ci`. Если нет — не идти дальше.
