# Search params sync

Two-way sync between a Valtio store and the URL's query string. Mutating the store updates the URL; navigating (deep link, Back/forward, an external write) updates the store. The proxy stays the **synchronous source of truth**; the URL is a throttled, rehydratable **mirror**.

```bash
pnpm add @ez-kit/valtio-kit valtio
```

Router and validator integrations are optional peers — install only what you use (`react-router`, `next`, `zod`, `qs`).

## Mental model

- **proxy → URL**: a `subscribe` watches the store; changed fields are coalesced into one navigation per tick (throttled, `replace` by default).
- **URL → proxy**: the adapter's reactive read pushes external URL changes back into the store, writing only the diff. Pulls never write the URL, so Back/forward and third-party writes are safe.
- **Loop breaking**: each direction writes only when the value differs in a normalized form (stringified string for `flat`, canonical JSON for `json`). Parsers carry a round-trip contract so the loop terminates.

A single coordinator — `StoreSearchParamsProvider` — is the only component that reads and writes the URL. It merges every connected store's owned keys and preserves foreign keys it doesn't own.

## Two ways to declare fields

### Accessor builder — `withSearchParamsFields`

The simplest form — no transpilation required. Pass your existing proxy and a builder function; each `field()` call maps a state accessor to a parser.

```tsx
import { withSearchParamsFields, paramString, paramNumber } from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

const filters = withSearchParamsFields(
  proxy({ q: '', page: 1 }),
  (field) => [
    field((s) => s.q, paramString()),
    field((s) => s.page, paramNumber()),
  ],
)

filters.q = 'boots' // mutate → URL updates
```

> Module-global proxies are shared across SSR requests — this form is client-first. It renders defaults on the server and hydrates from the URL in an effect (deep-link flash possible). For SSR-correct rendering, use `createSearchParamsStore`.

### Decorator — `withSearchParams` + `@searchParam`

Requires Stage 3 decorators (`experimentalDecorators` **off**) and `Symbol.metadata` support (TypeScript 5.2+, Vite/esbuild with `useDefineForClassFields: true`).

```tsx
import { withSearchParams, searchParam, paramString, paramNumber } from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

class FiltersState {
  @searchParam(paramString()) accessor q = ''
  @searchParam(paramNumber()) accessor page = 1
}

const filters = withSearchParams(proxy(new FiltersState()))
```

### `createSearchParamsStore(factory, options)` — SSR-correct, request-scoped

Fuses the [`createContextStore`](./create-context-store.md) lifecycle with the sync engine: the proxy is created per `<Provider>` and **seeded synchronously from the URL** (`defaultValue` first, then URL overrides), identically on server and client. No flash, no hydration mismatch.

```tsx
import { createSearchParamsStore, flat, paramString, paramNumber } from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

const filtersStore = createSearchParamsStore<{ q: string; page: number }>(
  () => proxy({ q: '', page: 1 }),
  {
    fields: (field) => [field((s) => s.q, paramString()), field((s) => s.page, paramNumber())],
    layout: flat(),
  },
)
```

The `fields` option is a **builder function** — each `field(accessor, parser?, options?)` call declares one synced field:

- `accessor` — `(s) => s.someField` — picks the field from the state type (inferred, no type annotation needed).
- `parser` — optional for primitives, `Date`, and arrays of primitives; auto-resolved from the runtime value. Required for everything else.
- `options` — optional per-field overrides: `{ key, absolute }`.

The factory returns a Valtio `proxy` — keep mutating actions on it and read with `useSnapshot`. Returns the same surface as `createContextStore` — `Provider`, `useStore`, `useSnapshot`, `Item`. Each `Provider` is isolated, so two never collide.

## Parsers

A parser converts one typed field to/from a URL string. They never throw on read — invalid input falls back to the field's default.

| Parser | Type | Notes |
| --- | --- | --- |
| `paramString()` | `string` | identity |
| `paramNumber()` | `number` | finite numbers; non-finite omitted |
| `paramBoolean()` | `boolean` | `1`/`0` |
| `paramEnum(values)` | `T` | rejects values outside the set |
| `paramArray(item)` | `T[]` | delimited list of an inner parser |
| `paramJson()` | `T` | JSON value (objects/arrays) |
| `paramDate()` | `Date` | ISO 8601 string |
| `paramBigInt()` | `bigint` | decimal string |

Each satisfies a round-trip contract — `parse(stringify(v))` deep-equals `v` — which lets the engine break the proxy⇄URL loop by comparing stringified forms. Supply an `equals` on a custom parser if `Object.is` isn't right for your type.

**Auto-resolution**: when you omit the parser in `field((s) => s.x)`, the engine resolves it from the runtime value — `string` → `paramString()`, `number` → `paramNumber()`, `boolean` → `paramBoolean()`, `bigint` → `paramBigInt()`, `Date` → `paramDate()`, `Array` → `paramArray(item)` (item parser resolved recursively). Pass an explicit parser for anything else.

### Custom parser shape — `Param<T>`

```ts
import type { Param } from '@ez-kit/valtio-kit/search-params'

const myParam: Param<MyType> = {
  stringify: (value) => /* string */,
  parse: (raw, defaultValue) => /* MyType */,
  equals: (a, b) => /* boolean */,  // optional, defaults to Object.is
}
```

### Zod validation — `zodParam(schema)`

```ts
import { zodParam } from '@ez-kit/valtio-kit/search-params/validators/zod'
import { z } from 'zod'

const rating = zodParam(z.coerce.number().int().min(1).max(5))
```

Parsing **is** validation; a failed parse gracefully falls back to the default.

## Layouts

A layout maps the persisted fields onto URL keys. Pass one as `layout`; default is `flat()`.

- **`flat()`** — one key per field (`?q=boots&page=2`). The only mode where arbitrary components can read individual params via `useSearchParams().get('q')`. Accepts `{ prefix }`.
- **`json(key)`** — packs every field into one canonical-JSON param. Compact and collision-free for multiple stores; stable key ordering keeps the equality guard reliable.
- **`qs()`** — (opt-in subpath, requires `qs`) serializes arrays/nesting into readable keys like `tags[]=sale`.

```ts
import { json } from '@ez-kit/valtio-kit/search-params'
import { qs } from '@ez-kit/valtio-kit/search-params/encoders/qs'

layout: json('state') // ?state={"view":"grid"}
layout: qs() // ?tags[]=sale
```

`flat()` is for single-param interop; `json()`/`qs()` trade that for compactness and multi-store isolation.

## History control

URL writes default to `history: 'replace'` so high-frequency fields don't spam history. Override per write with the `$searchParams` control on the proxy:

```ts
store.$searchParams.push(() => (store.step = 'review')) // stack a Back-button-able entry
store.$searchParams.replace(() => (store.step = 'profile')) // don't stack
```

Other options: `history` (per-store default), `throttleMs` (write frequency), `clearOnDefault` (omit a param when it equals the field default — on by default).

## Router adapters

The core is router-agnostic. An adapter exposes the reactive read and the writer as hooks; the coordinator does all merging.

```tsx
import { reactRouterAdapter } from '@ez-kit/valtio-kit/search-params/routers/react-router'
import { nextAdapter } from '@ez-kit/valtio-kit/search-params/routers/next'

<StoreSearchParamsProvider adapter={reactRouterAdapter}>{children}</StoreSearchParamsProvider>
```

- **react-router** — v6/v7 (`BrowserRouter` / data routers).
- **Next.js** — App Router writes go through `router.replace`/`push`; client-held Valtio state survives the RSC refetch.

### Writing an adapter

```ts
import type { RouterAdapter } from '@ez-kit/valtio-kit/search-params'

const myAdapter: RouterAdapter = {
  useSearchParams: () => /* reactive URLSearchParams */,
  useUpdater: () => (next, { history }) => {/* navigate, push|replace */},
  getSnapshot: () => /* non-reactive URLSearchParams for the throttled flush */,
}
```

## Caveats

- **`withSearchParamsFields` / `withSearchParams` on the server** renders defaults and hydrates in an effect — accept a deep-link flash, or switch to `createSearchParamsStore`. Never hydrate a module proxy on the server.
- **Non-canonical custom parsers** can loop — honor the round-trip contract (or supply `equals`).
- **`json`/`qs` break single-param interop** — use `flat()` when other components need individual keys.
- **Decorator form** requires Stage 3 decorators (`experimentalDecorators` off) and `Symbol.metadata`. If your toolchain doesn't support it, use the accessor builder form instead.
- **Next App Router** lacks true shallow routing; `nextAdapter` re-runs server components on write. Client Valtio state survives the refetch.
