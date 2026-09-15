# Design: Migrate the data-grid to TanStack Table v9

**Date:** 2026-09-15
**Status:** Approved (pending spec review)
**Scope:** `packages/data-grid/core`, `packages/data-grid/react/react`, `packages/data-grid/react/{shadcn,heroui}`, `apps/docs`

## Goal

Move the data-grid off `@tanstack/table-core@8` onto `@tanstack/table-core@9`, and take the
public-API changes that v9 forces while the packages are still `0.x`.

This is deliberately **not** a version bump. v9 reworks feature registration, state ownership
and the custom-plugin contract, and doing it before the 1.0 cut is what keeps us from shipping
two majors back to back. Three things we already want fall out of it: our hand-written store
disappears, the `draft` feature stops being an emulation, and tree-shaking becomes measurable
rather than aspirational.

## Facts this design rests on

- `@tanstack/table-core@9.2.4` is `latest` (beta announced 2026-06-08). `@tanstack/react-table`
  is at the same version. Packages ship ESM-only, ES2022 — UMD and CJS builds are gone, which
  suits this ESM-only monorepo.
- Upstream ships machine-readable migration material inside the package:
  `packages/table-core/skills/{migrate-v8-to-v9,core,table-features,custom-features,typescript}`,
  plus `packages/react-table/skills/table-state`. Treat those, and the installed `.d.ts`, as the
  source of truth — not this document's paraphrase.
- v9 state is backed by TanStack Store, which since 0.9 is built on a modified `alien-signals`
  implementation. We never import `alien-signals`; it is Store's internal.
- Measured against this repo at the time of writing:
  - `getState()` — 46 call sites in source (26 core, 20 react), 153 more in tests.
  - custom features — 7 (`Creating`, `DeferredApply`, `Editing`, `Deleting`, `Loading`,
    `Infinite`, `RowOrdering`); all use `getInitialState`, six use `createTable`, exactly one
    (`Editing`) uses `createRow`. None touch `createCell` / `createColumn` / `createHeader`.
  - source size — core 8.3k lines (+6.1k tests), react 13.6k (+10.8k), kits 11.4k.
  - **neither kit imports `@tanstack/table-core` at all.** The engine migration does not reach
    them; they are affected only by renames in our own vocabulary.
  - docs — 62 data-grid `.mdx` pages, 54 example components.
  - `_features` — the v8 **internal** option we register our features through today.

## Decisions

Three forks were settled before this document was written. They are recorded here with their
reasoning because each one reopens something previously considered closed.

### D1. Open composition: the consumer builds the feature set

Rejected alternatives: a fixed superset registered by core (keeps our API untouched but throws
away the entire v9 bundle win), and pre-built profile entry points (real tree-shaking, but
combinatorial and doubles the type/test surface).

Chosen because the kits are not generic over `TRow`, so `TFeatures` reaches core (~23 generic
types) and react (~7) but stops before the component contract and both UI kits — the cost is
far lower here than it would be in a typical grid.

### D2. Column pinning becomes logical `start` / `end`

v9 removed physical `left` / `right` everywhere. AGENTS.md currently records "align is logical,
pinning is physical" as settled; that decision was made against a model that no longer exists,
so it is rewritten rather than re-proposed (see §5).

### D3. Hybrid packaging: core resolves options, react owns the hook

`@ez-kit/data-grid-core` exposes `createTableOptions(config)` — a pure function — plus a thin
`createTable = constructTable(createTableOptions(...))` for non-React use.
`@ez-kit/data-grid-react` calls `useTable`. Core stays honestly framework-agnostic: v9's core
depends only on the `Atom` / `ReadonlyAtom` interfaces, which is exactly why Angular, Solid and
Vue adapters can substitute their own primitives.

---

## 1. Feature composition and the shape of the public API

### Features and config are orthogonal axes

`features` is **what is registered** — compile time, decides bundle content and which APIs
exist at all. `config` is **whether it is on in this instance** — runtime. v9 itself keeps both:
registering `rowSortingFeature` does not enable sorting, which is why `enableSorting: false`
still exists.

This matters for the real usage shape: one powerful shared `<AppDataGrid>` with a wide feature
set, used in a dozen places where half of it is switched off. Folding "enabled" into the static
set would break exactly that.

So `sorting: true | false | { multi: … }` survives unchanged, and the whole scalar-or-object
vocabulary recorded in AGENTS.md is untouched. What changes is that writing `sorting` at all
now requires `rowSortingFeature` in the set.

```ts
// once per application
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  editingFeature,
})

// at each use site, exactly as today
<AppDataGrid sorting={false} editing={{ mode: 'row' }} />
<AppDataGrid sorting={{ multi: { max: 3 } }} editing={false} />
```

### Import surface

Stock TanStack features are **re-exported** from `@ez-kit/data-grid-core/features` rather than
imported by the consumer from `@tanstack/table-core`. One import path, the version stays pinned
by us, and `table-core` stays our dependency instead of becoming the consumer's peer dependency.

Our own seven features are exported from the same entry point and renamed into upstream's
register: `EditingFeature` → `editingFeature`, `DeferredApplyFeature` → `draftFeature`, and so
on for the rest.

`allDataGridFeatures` is exported as our equivalent of `stockFeatures` — for prototypes and doc
examples — documented as defeating the point of tree-shaking.

### Where `TFeatures` is allowed to appear

- **`TableConfig<TFeatures, TRow>` — yes.** A config field exists only when its feature is
  registered. `sorting: false` with the feature registered is legal and means "code present,
  behaviour off". `sorting: {…}` without the feature is a compile error, where today it is a
  silent no-op that nothing catches.
- **`ColumnDef<TRow, TValue>` — no, it keeps two parameters.** Column options are already
  ignored when the table-level feature is off; gating them would push a third generic into the
  most frequently written type in docs and examples, to catch an error the table already caught
  one level up.

### What does not become a feature

`virtualization`, `toolbar`, `messages`, `direction`, `layout` hold no table state and stay in
config exactly as they are.

### Accepted cost

A registered-but-disabled feature still creates its state slice and its APIs on the instance.
The bundle win is counted per feature set, not per config, so a wide shared component pays for
the union of everything it can do. The only remedy is more than one feature set for genuinely
different pages; this is stated in the docs rather than engineered around.

---

## 2. The seven custom features on the v9 plugin API

### Mechanical mapping

| v8 (today)                                                                                     | v9                                                                           |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `getInitialState(state)`                                                                       | unchanged                                                                    |
| `createTable(table)` holding methods in closures                                               | `constructTableAPIs` + `assignTableAPIs` — method assignment only            |
| mutable per-table data in a closure (`AbortController` in `creating` / `editing` / `deleting`) | `initTableInstanceData` + `resetTableInstanceData`                           |
| `createRow(row, table)` closing over `row`                                                     | `assignRowPrototype` + `assignPrototypeAPIs`, reading `this`                 |
| `table.getState().<slice>` / `table.setState(...)` inside a feature                            | read `table.atoms.<slice>.get()`, write the base atom via `functionalUpdate` |
| `TableFeature<RowData>` value                                                                  | object plus a `Plugins` key declaration-merged                               |

v9 requires data and methods to be separated: `constructTableAPIs` is for assignment only, and
anything mutable and per-table belongs in `initTableInstanceData`, with
`resetTableInstanceData` clearing it when internal atoms reset.

### A real defect closes along the way

Every feature today does a global
`declare module '@tanstack/table-core' { interface TableState { editing: EditingState } }`.
That leaks: a consumer who builds their own plain TanStack table in the same project gets
`state.editing` declared and lying. In v9 the slice is declared in `TableState_FeatureMap` under
the feature key and exists only where the feature is registered. Same for `row-actions`, which
currently merges `rowActions` and `pinning` into `TableOptionsResolved` globally — that moves to
`TableOptions_FeatureMap`.

### `draft` (`deferred-apply`) is rethought, not ported

Today the live `sorting` / `columnFilters` / `globalFilter` slices hold what the user is
composing, a private `applied` slice holds what was last emitted, and `create-table.ts` swaps
one for the other on the way out through `toOutward` / `outwardUnchanged` / `syncApplied`.

In v9 this is the externally-owned-atom scenario by design: the feature owns atoms, the consumer
subscribes to applied values, the table reads live ones, and the outward funnel disappears with
our store. Two consequences to honour:

- external atoms take precedence over external `state`, and `table.reset()` resets only
  **internal** base atoms — so resetting draft axes is our feature's job, not the table's;
- writes must go to the owning atom; writing `baseAtoms.<slice>` for an externally owned slice
  goes nowhere.

Whether the implementation uses two atom sets or one plus a derived atom is fixed during PR 1
against the installed types, not from documentation.

### Risk to audit explicitly

Prototype-bound methods break under destructuring, spreading, `Object.keys` and
`JSON.stringify`. `editing.getIsEditing` is our own such method. Every place in the react
package where a row/cell/column method is passed as a bare callback has to be audited — this
class of breakage is invisible to the type checker and shows up at runtime.

---

## 3. State ownership

### One owner per slice

1. **Internal — the default.** Today we own _all_ state (our store plus fully-controlled
   TanStack mode), which is what produced both the store and the funnel. After migration the
   table owns its slices and we read them.
2. **Consumer-controlled** where the `state` prop was passed: `state.<slice>` plus
   `on<Slice>Change`. The prop's shape does not change; upstream syncs external `state` into the
   internal base atom, so this path is fully supported.
3. **Owned by our `draft` feature** for the three deferred axes, via atoms.

### Deleted rather than ported

- `core/src/store/**` in full, along with the `silent` / `notify` protocol.
- In `create-table.ts`: the `onStateChange` funnel, `toOutward`, `outwardUnchanged`,
  `syncApplied`, and the hand-rolled per-feature `onChange` dispatch (now `on<Slice>Change`).
- From `DataTable`: `subscribe`, `getSnapshot`, `getInitialSnapshot`, `notifyStateSubscribers`,
  `syncControlledState` — five public methods that existed only to marry our store to
  `useSyncExternalStore`.
- In `use-data-grid.ts`: the render-time silent write, `pendingNotifyRef`, and the layout effect
  that wakes bailed-out subscribers (~lines 1180–1215).

### Two items verified against installed types during PR 1

- **SSR snapshot.** `getInitialSnapshot` is frozen at construction on purpose: a server render
  must return the same tree on every call. If `useTable` / `Subscribe` give no equivalent
  guarantee, we keep a thin wrapper of our own for this and only this; if they do, it is deleted
  with the rest.
- **`setData` / `appendData`.** Today these call `setOptions` and then fake a snapshot
  reference change to wake broad subscribers. In v9 `data` is a reactive adapter input and the
  fake write goes away; `appendData` stays ours (it belongs to `infinite`) but is rebuilt on the
  adapter's input path.

---

## 4. React layer and package boundaries

### The new boundary

Our ~700 lines of resolution logic in `create-table.ts` become the pure
`createTableOptions(config) → v9 TableOptions`, with two consumers: `useTable` inside
`useDataGrid`, and the thin `createTable` in core that keeps the headless path described in
`prepare-table.ts` (a headless test, or a consumer driving the compound components by hand)
working unchanged.

### The root hook selects nothing

`useDataGrid` deliberately does not subscribe to the store today
(`use-data-grid.ts:1319`); subscriptions are narrow and live in leaves. v9 documents this as its
own large-table pattern: `useTable(options, () => null)` opts the parent out of state re-renders
entirely, and reactive reads go into `table.Subscribe` where the UI needs them. `table.Subscribe`
with `source={table.atoms.<slice>}` subscribes to one atom and selects a value from it — which is
precisely what `use-data-grid-selector`, `use-extracted-state` and `state/extract-state.ts` do by
hand today, and why they collapse.

### The second store goes too

`grid-context` keeps its own `createStore` for the `context` option. After this work no
hand-written store remains in the repository — it becomes an atom. `prepareDataGridTable` slims
down but stays: seeding `grid` and `gridContext` so no compound component has to guard the
property is still its job.

### Dependencies and budgets

`@tanstack/react-table` and `@tanstack/react-store` enter the react package. Per AGENTS.md every
`size-limit` entry ignores its own package's runtime dependencies, so both are added to the
`ignore` list of every entry, and the numbers are re-measured after the first green build rather
than guessed. `@tanstack/react-virtual` is unaffected.

### This is where the migration becomes measurable

`apps/docs/test/tree-shaking.test.ts` records the complete set of reachable entry points per
named import. New cases are added proving the v9 promise directly: a grid assembled without
`editingFeature` does not reach editing code. That test is impossible to write today, because
`_features` makes every feature reachable always. The recent tree-shaking work is extended here,
not redone.

---

## 5. Pinning and the kits

### Scope is narrow

The physics live in one place: `react/react/src/utils/pin-styles.ts` writes `--dg-pin-left` /
`--dg-pin-right` from `column.getStart(Left)` / `column.getAfter(Right)`. Everything else
(`cell.tsx`, `header-cell.tsx`, `footer-cell.tsx`, `creating-row.tsx`, `ordering.ts`) only
compares `getIsPinned()`, so those are literal changes, not logic changes.

### Renamed

- `ColumnPinSide.Left/Right` → `Start/End`, with `pinning: 'left' | 'right'` and
  `pinning.initialSide`;
- `--dg-pin-left` / `--dg-pin-right` → `--dg-pin-start` / `--dg-pin-end`, with rules moving from
  `left` / `right` to `inset-inline-start` / `inset-inline-end`;
- the shadow variables in both kits, by the same rule;
- `columnSizingInfo` → `columnResizing`, `onColumnSizingInfoChange` → `onColumnResizingChange`,
  and `columnSizingFeature` is registered before `columnResizingFeature` (which cannot stand
  alone);
- `sortingFn` → `sortFn` in every spelling.

### Not renamed

**Row pinning.** It is a vertical axis, `data-pinned="top" | "bottom"`; v9 does not touch its
vocabulary and a vertical axis has no logical names. After this work column pinning is logical
and row pinning is `top` / `bottom`, and that is two different axes rather than an
inconsistency — recorded in AGENTS.md so the next audit does not "unify" them.

### The AGENTS.md rule, rewritten

From "align is logical, pinning is physical" to: _a logical vocabulary wherever the axis flips
under RTL — `align`, `Toolbar.start/end`, column pinning; a physical one only where RTL does not
apply (`top` / `bottom`)_. This stops being an exception to upstream.

### Consumer cost, stated plainly

`styles.css` and `components/ui/**` are the shadcn registry payload: `npx shadcn add` copies
them verbatim into a consumer's project. Anyone who already copied gets different variable names
on update. Acceptable at `0.x`, but it goes into the changeset in those words, not hidden behind
"migrated to TanStack v9".

### RTL coverage becomes mandatory

`direction` exists and `layout/sticky.spec.ts` covers sticky, but there is no RTL case over
pinned columns — and this section changes RTL behaviour by design. An e2e case for pinning under
RTL, for both kits, is part of the work; without it the semantic change is covered by nothing.

---

## 6. Tests, CI, docs, release

### Our own tests work for us

`docs-option-names.test.ts` resolves 430 documented option names against the real exported types
and will name every stale page with `file:line`. Two adjustments:

- `page-type-map.ts` binds pages to governing types, and `TableConfig<TRow>` becomes
  `TableConfig<TFeatures, TRow>` — the recorded type args need updating (the mechanism already
  exists; `zu-store` and `va-store` live there with different argument shapes);
- the test needs **built** packages, so it stays red inside the integration branch until core
  builds.

### Docs volume is real

62 `.mdx` pages and 54 example components, each of which constructs a table and therefore each of
which gains `features`. This is design work, not `sed`: the examples are the shop window for the
new composition and will determine how users write it.

### CI inside the integration branch

`verify` already runs on PRs into `integration/**` (`ci.yml` triggers on
`[develop, main, 'integration/**']`). The browser suite runs only on PRs into `develop`, so e2e
would stay silent throughout and land as an avalanche on the final PR. For the duration of this
work, `integration/tanstack-v9` is added to the `e2e` trigger and removed again in the last PR —
otherwise we repeat #233, which merged with both kits red.

### Changesets trap

The packages are at `0.5.0` / `0.6.0`. A changeset of type `major` against a `0.x` version
publishes **1.0.0** — the migration would accidentally declare the release that is planned as a
separate milestone. Every breaking change in this work is marked `minor`; `major` stays reserved
for the deliberate 1.0 cut. `@ez-kit/data-grid-shadcn` never appears in a changeset (it is
`private` and in `ignore`); kit-visible changes ship through `@ez-kit/data-grid-react` and
`@ez-kit/docs`.

### Also in the blast radius

`e2e-slots.test.ts` (if slots are added or renamed), the 153 tests calling `getState()`,
`tree-shaking.test.ts` (§4), and the shadcn registry payload via `registry:build`.

---

## 7. Sequencing

### Accepted constraint

`verify` is monorepo-wide: any PR after which the repository does not build is red, and v8 → v9
does not slice vertically. Intermediate PRs inside `integration/tanstack-v9` will be red on
`verify`, and that is accepted — review there is for diff readability, and the gate sits on the
final PR into `develop`. Each intermediate PR carries its own local criterion instead.

| PR                 | Target                 | Content                                                                                                                             | Criterion                                                                   |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **0. Preparation** | `develop`, still on v8 | extract `createTableOptions` as a pure function (`createTable` becomes a wrapper)                                                   | full `verify`                                                               |
| **1. Core engine** | `integration/…`        | bump to 9.2.4, `tableFeatures`, row-model slots, seven features on the plugin API, atoms, delete `core/src/store/**` and the funnel | `--filter data-grid-core`                                                   |
| **2. React**       | `integration/…`        | `useTable`, delete the binding layer and the second store, narrow selector                                                          | `--filter data-grid-react`; **`verify` goes green here for the first time** |
| **3. Pinning**     | `integration/…`        | `start` / `end` through core, react, both kits, CSS variables, registry                                                             | `verify`                                                                    |
| **4. Docs**        | `integration/…`        | 62 pages + 54 examples, `docs-option-names` map, new `tree-shaking` cases                                                           | `verify`                                                                    |
| **5. Browser**     | `integration/…`        | e2e including new RTL pinning cases; temporary `e2e` trigger on the integration branch                                              | `e2e`, both kits                                                            |
| **6. Tail**        | `integration/…`        | AGENTS.md (rewritten settled decisions), READMEs, `minor` changesets, recomputed `size-limit`, remove the temporary e2e trigger     | `verify`                                                                    |
| **Final**          | → `develop`            | one merge                                                                                                                           | full gate + `e2e`                                                           |

Two items originally planned for PR 0 were dropped after verification against the codebase:
there is **no** destructuring, spreading or bare-callback passing of row/cell/column methods
anywhere (the only `...cell` match, `create-column-helper.ts:199`, spreads our plain column-def
config, not a cell instance), and the indeterminate header checkbox is already written in the
v9-correct form (`header-cell.tsx:145`, covered by `data-grid.test.tsx:92-103`). Characterization
coverage for the draft funnel also already exists — `deferred-apply.test.ts`, "emission gating".

PR 0 stands apart and comes first: it is worth doing on its own terms, passes the normal gate,
and removes a meaningful share of noise from the migration PRs.

## AGENTS.md changes this work requires

1. Rewrite the pinning entry in "Settled data-grid API decisions" per §5.
2. Record that features are composed by the consumer and that config gates behaviour, not
   presence (§1) — otherwise the next audit reads `sorting: false` beside a registered feature as
   a contradiction.
3. Replace the `_features` framing wherever the architecture notes assume v8 internals.

## Definition of done

- Both kits render every documented example on v9, with `verify` and `e2e` green on the final PR.
- No hand-written store remains in the repository.
- `tree-shaking.test.ts` proves at least one feature is genuinely excluded by omitting it from
  the set.
- `docs-option-names.test.ts` passes with the full 62-page map intact.
- Pinning works under both LTR and RTL in both kits, covered by e2e.
- No package reaches `1.0.0` as a side effect of this work.
