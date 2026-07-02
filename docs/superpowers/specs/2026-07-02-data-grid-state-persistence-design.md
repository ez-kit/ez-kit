# Data-Grid State Persistence — Design

**Date:** 2026-07-02
**Package:** `@ez-kit/data-grid-react`
**Roadmap entry:** `apps/docs/components/feature-matrix.data.ts` — "URL / localStorage state persistence" (status `Planned`)
**Status of this doc:** approved concept, pre-implementation

---

## 1. Problem

Consumers want to persist grid state (sort, filters, pagination, column layout) to the
URL or `localStorage` so that a reload preserves the view and links are shareable. Today
this is possible only by hand-wiring every controlled `state.*` slice and every
`on*Change` handler — verbose and error-prone.

The monorepo already ships `@ez-kit/valtio-kit/persist`, a mature storage engine, but it
is built around a **Valtio proxy** as the source of truth. The data-grid's state lives in
**TanStack Table** (controlled via `state` / `initialState` / `onStateChange`), not Valtio,
so that engine is **not** reused here. The grid slices are already JSON-serializable, so
the codec/substrate machinery valtio-kit needs does not apply.

## 2. Philosophy — three layers, "bring your own write"

We own the hard, grid-specific part (reading state out, validating it back in). The
consumer owns the storage side-effect, because real apps have bespoke URL/routing and
serialization logic we should not dictate.

| Layer | What | Ships |
| --- | --- | --- |
| **1 — pure utilities** | `extractState` (grid → object), `parseState` (untrusted value → typed partial) | Now |
| **2 — reactive hook** | `useExtractedState` — subscribes to the store, returns the always-current extracted subset | Now |
| **3 — actual read/write to URL / localStorage** | The storage side-effect, key renaming, versioning/migration | **Deferred** (consumer-owned) |

The selling point is precisely that Layers 1–2 **never touch storage and never mutate the
store**. The chosen verbs (`extract` / `parse`) reflect that — as opposed to
`persist` / `hydrate` / `restore`, which all imply a side-effect we intentionally do not
perform.

## 3. Public API

### 3.1 Types and key sets

```ts
/** Top-level TableState keys this feature can persist. Closed set. */
export const PERSISTABLE_STATE_KEYS = [
  'sorting', 'columnFilters', 'globalFilter', 'pagination', 'rowSelection',
  'columnVisibility', 'columnPinning', 'rowPinning', 'expanded', 'columnSizing',
] as const
export type PersistableStateKey = (typeof PERSISTABLE_STATE_KEYS)[number]

/** Opinionated default: shareable "view" state only. Excludes row-id-coupled, ephemeral slices. */
export const DEFAULT_STATE_KEYS = [
  'sorting', 'columnFilters', 'globalFilter', 'pagination',
  'columnVisibility', 'columnPinning', 'rowPinning', 'columnSizing',
] as const satisfies readonly PersistableStateKey[]

/** The serialized shape: a flat, JSON-safe subset of TableState. */
export type DataGridState = Partial<Pick<TableState, PersistableStateKey>>

export type DataGridStateOptions = {
  /** Allowlist of slices to include. Default: DEFAULT_STATE_KEYS. */
  keys?: readonly PersistableStateKey[]
}
```

### 3.2 Layer 1 — pure utilities

```ts
/**
 * Read the persistable slices out of a grid. Pure, synchronous, framework-agnostic
 * (takes the core `Table`, so it works outside React and against a bare createTable).
 */
export function extractState<TRow extends object>(
  table: Table<TRow>,
  options?: DataGridStateOptions,
): DataGridState

/**
 * Validate + prune an UNTRUSTED, already-decoded value into a typed DataGridState.
 * The consumer owns JSON.parse / URL-decode; this does NOT parse strings.
 * Never throws — unknown/malformed keys are dropped (URL and localStorage are user-editable).
 */
export function parseState(
  stored: unknown,
  options?: DataGridStateOptions,
): DataGridState
```

### 3.3 Layer 2 — reactive hook

```ts
/**
 * Reactive projection of the persistable state. Subscribes to the grid store and
 * returns a referentially stable DataGridState whose identity changes only when one
 * of the included slices changes.
 */
export function useExtractedState<TRow extends object>(
  instance: DataGridInstance<TRow>,
  options?: DataGridStateOptions,
): DataGridState
```

## 4. The serialized shape

`DataGridState` is **a flat subset of TanStack `TableState`** — same keys, same value
shapes, no wrapper, no remap. Consequences:

- **Round-trip correct by construction.** `extract` = pick; `parse` = validate + pick.
  There is no transform layer to drift.
- **Zero-adapter plug-in.** Because the shape *is* `Partial<TableState>`, `parseState`
  output drops straight into `useDataGrid`'s existing `initialState` (or controlled
  `state`) with no translation.
- **Already JSON-safe.** Every slice is a plain array / record / primitive
  (`expanded` is `true | Record<string, boolean>`; `globalFilter` is `unknown`), so
  `JSON.stringify(extractState(table))` just works — no codecs at Layers 1–2.

No `{ version, state }` envelope at Layer 1 — versioning is a Layer-3 wrap the consumer
owns (see §8).

## 5. Slice selection

A single `keys` **allowlist**, defaulting to `DEFAULT_STATE_KEYS` (view state).

- Allowlist is the safe opt-in model — protects URL length and prevents accidentally
  persisting ephemeral, row-id-coupled slices.
- Default **excludes `rowSelection` and `expanded`**: both key off row ids that may not
  survive a data reload and are usually session-ephemeral, not shareable view state.
  Consumers opt in explicitly via `keys`.
- `PERSISTABLE_STATE_KEYS` is exported as the "everything" convenience tuple.
- Rejected: per-slice boolean object and include+exclude pairs (YAGNI; a single array
  covers every real case).

## 6. Consumption patterns

### Restore once on mount (recommended)

`initialState` already flows through `useDataGrid` → `...restConfig` → `createTable`
(`packages/data-grid/core/src/create-table/create-table.ts:185`), verified by an existing
passing test (`use-data-grid.test.tsx:106`).

```ts
const decoded = JSON.parse(localStorage.getItem('grid') ?? 'null')
const grid = useDataGrid({ data, columns, initialState: parseState(decoded) })
```

### Save on change (Layer 3 = consumer's side-effect)

```ts
const grid = useDataGrid({ data, columns, sorting: true, filtering: true })
const state = useExtractedState(grid, { keys: ['sorting', 'columnFilters', 'pagination'] })
useEffect(() => {
  localStorage.setItem('grid', JSON.stringify(state))
}, [state])
```

The URL variant is identical — swap the effect body for `setSearchParams`.

### Fully controlled (advanced)

```ts
const [state, setState] = useState(() => parseState(decoded))
useDataGrid({
  data, columns, state,
  onStateChange: (u) => setState((p) => (typeof u === 'function' ? u(p as TableState) : u)),
})
```

## 7. Implementation notes

- **`extractState` takes the core `Table<TRow>`, not the React instance** — keeps Layer 1
  framework-agnostic and unit-testable against a bare `createTable(...)`. The hook bridges
  `DataGridInstance` → its `table` / `store`.
- **`useExtractedState` must memoize its output.** `extractState` allocates a fresh object
  each call, so it cannot be passed naively as `getSnapshot` to `useSyncExternalStore`
  (React throws "getSnapshot should be cached" / loops — the exact contract documented in
  `use-data-grid-selector.ts:8-27`). The hook caches the last output and the last included
  per-slice references; on each read it returns the cached object when every included
  `state[key]` is referentially equal (TanStack keeps stable per-field references until
  mutated), otherwise rebuilds. The repo already exports `shallow`
  (`index.ts:56`) for the compare.
- **Store surface reused:** `instance.store.subscribe` / `getSnapshot` / `getServerSnapshot`
  (`store/table-store.ts`), same wiring as `useDataGridSelector`.
- **SSR:** the hook routes through `getServerSnapshot()` so server and first client render
  agree. `parseState` is pure and SSR-safe; reading `localStorage` on the server is the
  consumer's concern (Layer 3).
- **`parseState` is the single validation choke point** for untrusted input: defensively
  picks known keys from the allowlist, drops anything malformed, never throws.
- **Placement:** root export of `@ez-kit/data-grid-react` (`src/index.ts`) — it is three
  functions plus types. Promote to a `/persist` (or `/state`) subpath only if it grows.

## 8. Explicitly deferred (Layer 3, consumer-owned)

- Actual URL / `localStorage` / `sessionStorage` read+write.
- Short-key renaming (`sorting` → `s`) for compact URLs.
- Versioning / migration of stored payloads (`{ v, state }` envelope + `migrate`).
- Column-id pruning of stale `sorting` / pinning / sizing references after columns change.
  Dropped from scope: TanStack silently ignores unknown column ids at render, so there is
  no real breakage; revisit only if demand appears.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Unmemoized hook breaks `useSyncExternalStore` | Memoized output is the first unit test (see §7). |
| Users assume `parseState` writes / applies | Docs lead with the full round-trip and state "you own the write". |
| Users assume URL auto-syncs | Docs state Layer 3 is deliberately deferred + show the 6-line recipe. |
| Serializing volatile slices (loading/editing) into the URL | `DEFAULT_STATE_KEYS` is a curated allowlist; volatile slices are not in `PERSISTABLE_STATE_KEYS`. |
| Non-JSON custom `globalFilter` won't round-trip | Documented: only JSON-safe global filters survive. |
| Controlled `state` + `initialState` both supplied | Documented as mutually exclusive restore strategies; controlled `state` wins per `use-data-grid.ts` sync. |

## 10. Testing strategy

- **Layer 1:** `extractState` picks exactly the allowlisted slices; default excludes
  selection/expanded; `parseState` drops unknown/malformed keys and never throws on
  garbage (`null`, `42`, `{ sorting: 'nope' }`, foreign keys); `parseState(extractState(t))`
  round-trips to an equal object.
- **Layer 2:** `useExtractedState` returns a referentially stable object across unrelated
  re-renders; identity changes when an included slice changes; excluded slices do not
  trigger a new identity; SSR path uses `getServerSnapshot`.
- **Integration:** `parseState(decoded)` → `initialState` seeds a grid whose visible
  sort/filter/page match; save-on-change effect writes the expected JSON.

## 11. Out of scope

Everything under §8. No changes to the valtio-kit persist engine. No new package; utilities
live in `@ez-kit/data-grid-react`.
