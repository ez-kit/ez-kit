# PR 4 outcomes — the documentation, and what it measured

**Date:** 2026-09-16
**Branch:** `integration/tanstack-v9`
**Scope:** `apps/docs/**` only. `packages/**` was PR 3's during this work and was not touched.

PR 4 was specified as "62 `.mdx` pages and 54 example components, each of which gains `features`".
It is that, and three other things that only became visible once the examples were written against
the real types and the real build:

- the React adapter has an **undocumented mandatory base set of three features**, and omitting one
  is a render-time `TypeError` that no guard warns about;
- the migration's headline benefit — tree shaking by feature — **did not hold** when measured, and
  the fix landed in core during this PR;
- two of the three "documented APIs that no longer exist" from pr1-outcomes §3.2 were confirmed by
  probe rather than by reading, and one of them is a different defect than the note described.

---

## 1. The `features` convention, and why

**Every example composes its own narrow set with `tableFeatures()`, declared at module scope
directly above the component. `allDataGridFeatures` appears in exactly one place: the section of
the new Feature set page that documents it.**

The alternative — `features={allDataGridFeatures}` everywhere — was considered and rejected. The
examples are the shop window: a reader copies one into their app, and what they copy is what ships.
A docs site whose every example registers the all-in set teaches the anti-pattern and hands every
reader a bundle they did not ask for, which is precisely the failure mode design §1 names when it
says the all-in set is "documented as defeating the point of tree-shaking". Writing the set out in
each file costs five to fifteen lines and shows the model working; nothing else in the docs does.

Consequences worth knowing:

- **A file's set is the union of what its components use.** Several files export three or four
  examples (`row-ordering.tsx`, `filter-chips.tsx`, `pagination-footer.tsx`); they share one
  `features` const rather than one per component. Splitting per component would be more precise and
  much noisier, and the source panel shows the whole file either way.
- **Over-registration is safe, under-registration is not**, so where the scan was ambiguous the set
  errs wide. `registering` a feature a grid does not enable is explicitly correct (design §1), while
  omitting one is a silent no-op at best — see §2 and §4 below.
- **The MDX code blocks follow the same rule**, but only where they present themselves as complete:
  83 blocks in the data-grid docs write both `data={data}` and `columns={columns}`, and all 83 now
  write `features={features}` first. Fragments that already elide `data` and `columns` were left
  alone — adding `features` to `pagination: { mode: 'infinite', … }` would be noise.

### 1.1 The base set is three — after being three, then seven, then eight, then three again

**Every set in the docs opens with `columnVisibilityFeature`, `columnPinningFeature` and
`columnSizingFeature`.** Those three are structural: the grid lays rows out on a CSS column grid, so
it cannot render until it knows each column's width, visibility and pin group. **Everything else is
genuinely optional** — a grid registering only these three renders, with nothing missing.

The number got there by a route worth recording, because the route is the finding.

| stage       |               number | how it was reached                                                                                        | what it missed                                                                                                               |
| ----------- | -------------------: | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| first pass  |                    3 | probed a method list assembled **by reading** the layout utilities                                        | `header-cell.tsx`'s `getCanSort()` / `getCanResize()`, `body.tsx`'s `state.loading` / `state.creating` — every example threw |
| second pass |                    7 | derived the list from a grep of the package, then dropped each candidate and re-probed                    | still reasoned from call sites                                                                                               |
| third pass  |                    8 | asked _which components a plain grid mounts_ — `body.tsx:176` mounts `<LoadMoreFooter />` unconditionally | nothing further, but the premise was wrong                                                                                   |
| `@smoke`    | (would have been 11) | **rendered the examples in a browser**                                                                    | `row.tsx:99` `row.getIsSelected()` for every row, `state.editing.rowId`, `state.deleting.pendingRowId`                       |
| final       |                **3** | PR 3 guarded every one of those reads with `?.`                                                           | —                                                                                                                            |

Three method lessons, in order of how much they cost:

1. **Typechecking an example is not running it.** Every wrong number above typechecked clean. The
   defect class here — a feature's absence being a missing property rather than a type error — is
   invisible to `tsc` by construction, because `TableConfig` declares every option unconditionally.
2. **"I read the feature's own code" lost twice to "what does a plain grid actually mount".**
   `infiniteFeature` and `row.tsx:99` were both missed the same way: I examined the _feature's_ path,
   found it correctly gated, and never asked which components mount regardless. `row.tsx:99` is the
   sharpest case — the selection **cell** is gated by the system column, exactly as I read it, and
   this is a different read on the row element that is not gated at all.
3. **A growing requirement list is a smell, not a finding.** Every one of the five features that
   came and went was an unguarded read, not a real dependency. The right response to "this feature
   seems mandatory too" was to look for the missing `?.`, which is what PR 3 did — proactively
   sweeping the rest of the family rather than waiting for the next `@smoke` failure to name it, and
   finding nothing left.

One piece of evidence that this class of defect was known and then lost: `cell.tsx:210` already
guarded `getIsSomeSelected` with `typeof … === 'function'` — the same idea in an older idiom, three
lines above an unguarded `getIsSelected()`. The guard existed; it just did not spread.

### 1.2 Infinite scroll is the one set where a row model is wrong

`pagination.mode: 'infinite'` needs `rowPaginationFeature` (the guard demands it) and must **not**
register `paginatedRowModel` — infinite mode shows every accumulated row, and the model slices them
back to one page. `createTable` warns about this, which is how it was caught: the first mechanical
pass gave the five infinite examples a `paginatedRowModel` along with everything else paginated.
Fixed in all five, each with a comment saying why, and documented on `pagination/infinite-scroll.mdx`
and in the Feature set table.

---

## 2. The tree-shaking promise did not hold, and now does

Design §4 asked for a `tree-shaking.test.ts` case proving that "a grid assembled without
`editingFeature` does not reach editing code". Written, and it failed.

Measured with esbuild against the **built** `packages/data-grid/core/dist/features/index.js`,
unminified, workspace-only resolution:

| imported                      | bundled bytes |
| ----------------------------- | ------------- |
| `tableFeatures`               | 46 360        |
| `rowSortingFeature`           | 46 363        |
| `editingFeature`              | 46 360        |
| `allDataGridFeatures`         | 46 365        |
| whole surface (`import * as`) | 49 696        |

Whichever single name you imported, you got ~93% of everything, and every custom feature's
implementation was present in all of them.

**Cause.** `allDataGridFeatures` was declared on the features entry itself as a top-level
`tableFeatures({ ...stockFeatures, …, editingFeature, … })` call. The argument object _spreads_, and
an object spread may run getters, so esbuild keeps the whole expression and therefore every operand.
It is the same defect the store packages had — a bare `createStoreCache()` at module scope, recorded
in `tree-shaking.test.ts`'s own docblock — one package over, and this time it cancelled the entire
bundle argument for the migration.

**Fixed in core during this PR** (by whoever owns core, on my report — `packages/data-grid/core` is
outside PR 4's fence): `allDataGridFeatures` moved to `@ez-kit/data-grid-core/features/all`, a new
`tsup` entry with its own `exports` condition. A `/* @__PURE__ */` annotation was tried first and did
not work — it moved the bundle to 46 504 bytes, the cost of the comments.

Re-measured against the fixed core:

| imported                       | before |      after |
| ------------------------------ | -----: | ---------: |
| `tableFeatures`                | 46 360 |    **994** |
| `rowSortingFeature`            | 46 363 |    **998** |
| a sorting-only set             | 46 402 |  **1 035** |
| that set plus `editingFeature` |      — | **17 219** |
| whole `/features` surface      | 49 696 |     48 086 |

The `editingFeature` row is quoted deliberately beside the flattering ones: 17 kB is what a feature
with a real implementation costs, and the claim is not that features are free — it is that you pay
for one when you register it and not before.

The test case now asserts the promise directly and passes: a control case proving `editingFeature`
does bring `row_getIsEditing` with it, plus two cases proving a sorting-only set reaches neither the
editing implementation nor half the surface. The measurement is `bundledCodeOf` (new helper) rather
than `entryPointsPulledBy`, because every feature lives behind the one `/features` entry point and
"which entry points came along" cannot tell two sets apart.

**PR 6 must change the docs claim it inherits.** `getting-started.mdx` still carries the pre-v9
measurement of the _components_ axis (115 kB vs 152 kB for the shadcn kit). That number is about
`createDataGrid({ components })`, not about `features`, and I did not re-measure it — I added a
paragraph saying the two axes are independent and linking the Feature set page, and left the number
alone rather than invent one. Re-measuring both axes together is worth doing once the kits build.

---

## 3. Documented APIs that no longer exist

pr1-outcomes §3.2 listed four. Each was verified by probe against the built core rather than by
reading, and the results differ from the note in one place.

| site                                                | note said                              | measured                                                                                                                             | done                                                                               |
| --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `editing/creating.mdx` `getRowCount()`              | runtime `TypeError` without pagination | **Confirmed.** `table.getRowCount` is `undefined` on a set without `rowPaginationFeature`, `function` with it.                       | Rewritten to `table.getRowModel().rows.length`, plus a callout naming the trap.    |
| `editing/creating.mdx` `getState()`                 | deleted                                | **Confirmed.** `table.getState` is `undefined` on every set, all-in included.                                                        | `table.store.state.pagination.pageIndex`.                                          |
| `pagination/infinite-scroll.mdx` `appendData(rows)` | survives, "verify the shape"           | **Confirmed unchanged** — `(rows) => table.setOptions(prev => ({ ...prev, data: [...prev.data, ...rows] }))`, same signature.        | Row kept; it now says the method exists only when `infiniteFeature` is registered. |
| `core/README.md:38` `table.setState(…)`             | published npm text, real error         | **Confirmed.** `table.setState` is `undefined`; so is `publishExternalState`. `setOptions`, `reset` and the per-slice setters exist. | **Not fixed — in `packages/`, reported for PR 6.** See §6.                         |

A fifth was found by sweeping rather than from the list: **`table.setState` is named in five more
`.mdx` files** — `state/index.mdx` (twice), `pinning/columns.mdx`, `pinning/index.mdx`,
`columns/visibility.mdx` — always in the phrase "no `initialState`, controlled `state` or
`table.setState` can move it". All five now name the per-slice setter for the slice in question
(`table.setColumnPinning(…)`, `table.setColumnVisibility(…)`), and `advanced/core.mdx` gained a
"Reading and writing state" section saying there is no generic getter or setter at all.

---

## 4. Column pinning: `left`/`right` → `start`/`end`

PR 3 took the example components and `pinning/columns.mdx` while this PR was in flight; PR 4 took
every other `.mdx`. The split is in the git history, not in the files.

What PR 4 changed: `pinning/api.mdx` (the scalar type, `pinning.side`, `pinning.initialSide`,
`initialState.columnPinning` and `state.columnPinning`, the last two from `{ left?, right? }` to
`{ start?, end? }`), `pinning/index.mdx`, `state/index.mdx`, `columns/index.mdx`,
`columns/grouped-headers.mdx`, `selection/index.mdx`, `expanding/sub-content.mdx`,
`row-actions/api.mdx`, `row-actions/index.mdx`.

The paragraph design §5 said to reverse is reversed. `pinning/index.mdx` used to carry a section
headed "Which edge, and why it is physical" arguing that column pinning is deliberately physical and
does not flip under RTL. It now says the opposite, explains that the block axis (row pinning) stays
physical because it does not flip, and carries a `Callout` stating the break plainly — including
that an unrecognised key in `columnPinning` merges to "nothing pinned" rather than throwing, so a
`{ right: [...] }` copied from the old docs fails silently.

Verified by probe: `state.columnPinning` defaults to `{ start: [], end: [] }`, and
`setColumnPinning({ start: ['name'] })` makes `column.getIsPinned()` return `'start'`.

No `.mdx` names a `data-pinned` **value**, so the DOM-contract pages (`theming.mdx`,
`kit-parity.mdx`, `layout/index.mdx`, `advanced/react.mdx`) needed no change, as pr3-recon §6 said.

---

## 5. New page, and the test map

**`content/docs/data-grid/feature-set.mdx`** is new, and sits second in the nav, right after Getting
started — a reader meets `features` in the first example on the site, so the explanation cannot be
further away than that. It covers: the option and that it is required; registered-vs-enabled as two
axes; the base three and why; a config-key → features table for every option; the three failures
that are _silent_ (a missing row model, missing `filterFns`, missing `sortFns`/`aggregationFns`);
`allDataGridFeatures` and its subpath; and that `features` replaces rather than merges across option
layers. Linked from `index.mdx`, `getting-started.mdx`, `advanced/core.mdx`, `advanced/react.mdx`,
`pagination/infinite-scroll.mdx`.

`apps/docs/test/docs-options/`:

- `type-resolver.ts` gained a `DocsProbeFeatures = TableFeatures` probe type and two new argument
  lists, `FEATURES_ROW_TYPE_ARGS` (`<TFeatures, TRow>`) and `FEATURES_TYPE_ARGS` (`<TFeatures>`).
  `TableFeatures` is the widest _and_ fullest instantiation — it declares every feature key
  optionally, so a config type parameterised by it exposes every key, which is the question these
  checks ask.
- `page-type-map.ts`: `UseDataGridConfig` and `SystemColumnDef` take `FEATURES_ROW_TYPE_ARGS`;
  `ReactGlobalFilteringConfig` and `TableState` take `FEATURES_TYPE_ARGS`. **`ColumnDef` did not
  change** — design §1 kept it at two parameters and that held.
- `DocPage.FeatureSet` and its `PAGE_ENTRIES` entry: one option table (the `features` row, checked
  against `UseDataGridConfig`) and one `nonOptionTables` entry for the config-key → features table,
  whose first column names config keys but whose rows document the registration, not the key.

Result: **9 tests, page map intact, 115 pages / 91 option tables**. The one-name-per-page count grew
by exactly the `features` row.

`tree-shaking/bundle.ts` gained `bundledCodeOf`; `entryPointsPulledBy` is unchanged in behaviour and
now shares a private `bundleOf`. No existing case was weakened.

**`apps/docs/test/example-features.test.ts` is new** (17 cases, helper in `test/example-features/`).
It parses each example's real `tableFeatures({ … })` literal and the config keys the same file
writes, and fails when the two disagree — the base seven missing from any set, a config key whose
feature or row model is absent, or `paginatedRowModel` in an infinite-scroll set. It compares string
literals in source, the method `e2e-slots.test.ts` uses for `data-slot` one directory over, and it
exists because every failure it catches is silent: a missing row model gives sort headers that
respond and rows that never move, a missing `filterFns` makes every row match, and none of it is a
type error, because `TableConfig` declares every option unconditionally.

It is a weaker guarantee than rendering. What it cannot see: a set assembled at runtime rather than
written as a literal, a config key reached through a spread, and whether a registered feature
actually behaves. Alongside it I ran a one-off probe that goes further — parse every example's set,
build it from the real exports, construct a table through `createTable`, and call every method and
state read the react render path touches unconditionally. **84 of 84 examples construct and survive
every call.** That probe is not committed: it needs the built core and duplicates what the browser
suite will answer properly.

---

## 6. What PR 5 and PR 6 inherit

### PR 5 (browser)

- Nothing in `apps/docs/e2e/**` was touched. PR 3 took `pinning/columns.spec.ts` and added
  `pinning/rtl-columns.spec.ts` and the example it drives.
- Every example component now constructs its grid from a narrow set. **If an example renders wrong
  in the browser suite, suspect the set before the kit**: a missing row model is silent (the control
  responds, the rows do not move), and a missing `filterFns` makes a filter match everything. The
  sets were derived from each file's own config keys and typecheck clean, but nothing in this PR
  executes them — the browser suite is the first thing that does.
- `apps/docs/test/e2e-slots.test.ts` passes unchanged.

### PR 6 (tail)

1. **`packages/data-grid/core/README.md:38`** — "drive state via `table.setState(...)`". Deleted
   method, published npm text. The replacement is the per-slice setters; there is no generic one.
   While there, check the same README's `allDataGridFeatures` mention: it now lives on
   `@ez-kit/data-grid-core/features/all`, and `react/README.md`, `shadcn/README.md` and
   `heroui/README.md` all name it too.
2. **The base three (§1.1)** — decide whether the React adapter's hard requirement becomes
   `baseGridFeatures`, an unconditional merge, or a guard entry. It is currently documented prose,
   which is the weakest of the four options.
3. **`extractState` cannot be called with a narrow set.**
   `extractState<TFeatures, TRow>(table: ExtractableTable<TFeatures, TRow>)` infers
   `TFeatures = TableFeatures` from the `store` property, so a `DataTable` built from a narrow set is
   a type error (`Property 'cellSelection' is missing…`). `state-persistence.tsx` works around it
   with explicit type arguments. `useExtractedState` does not have the problem.
4. **`getting-started.mdx`'s 115 kB / 152 kB measurement** is pre-v9 and measures the components
   axis only (§2).
5. **AGENTS.md** — design §7's three edits are unchanged, and the pinning entry in "Settled
   data-grid API decisions" now contradicts the docs: it records "column `pinning` is physical
   (`left` / `right`)", which is no longer true anywhere.
6. **The changeset** — `@ez-kit/docs` is the package these docs ship through. Nothing in `apps/docs`
   is published to npm, so a changeset naming it is about the docs deployment, not an API break.

---

## 7. Gates, and what could not be measured

Measured at the end of this PR, from `apps/docs`:

| gate                                                            | result                                                |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `vitest run` (whole docs suite)                                 | **17 of 18 files, 131 tests passing**                 |
| `docs-option-names.test.ts`                                     | **fails** — "packages are not built" (see below)      |
| `tree-shaking.test.ts`                                          | **26 passing**, including the three new feature cases |
| `example-features.test.ts`                                      | **17 passing** (new)                                  |
| every example's set constructed and exercised via `createTable` | **84 / 84**                                           |
| `scripts/verify-manifest-coverage.mjs`                          | clean — 112/112 data-grid, 37/37 form                 |
| `scripts/check-site-url.mjs`                                    | clean                                                 |
| `scripts/check-changesets.mjs`                                  | clean (no changeset written — PR 6 owns it)           |
| `prettier --check`                                              | clean                                                 |
| `tsc --noEmit` over `apps/docs`, against package **sources**    | **0 errors**                                          |

### What `@smoke` said

**298 / 298 passed, exit 0, zero console errors, zero failure directories**, both kits, against the
final tree. That is the run nobody else could give us: `@smoke` is excluded from CI
(`.github/workflows/ci.yml:110`) and is the only check over 89 of the 111 examples.

It took four attempts to get a figure worth reporting, and three of those are the point:

1. **Against PR 2's build** — could not run at all; `@ez-kit/data-grid-react` did not build, so
   there was no docs server.
2. **Against a tree being hot-reloaded under it** — 170 failures at ~170 cases, then stopped
   deliberately. PR 3 was editing the react package mid-run, so the number would have had to be
   retracted. A pass figure from a moving tree is not a weaker figure; it is not a figure.
3. **Against PR 3's guarded build** — 296 passed, exit 0, **and two examples failed their first
   attempt and passed on retry**. Taking the exit code at face value would have shipped a real
   defect (§below).
4. **Final** — 298 / 298 clean.

### The defect the third run caught, which was mine

`production-provider`, both kits: core's development warning fired —
"`filterFns` is not in `features` … no row is ever filtered out" — and then `ClearFiltersButton`
threw on `undefined.length`.

`ProductionProviderExample` composed a narrow set while its options came from `DataGridOptions`, a
`DataGridOptionsProvider` that turns filtering and global filtering on. `features` **replaces**
across option layers rather than merging — which this PR documented on the Feature set page — so the
grid's narrow set won and the provider's filtering options were configured but unregistered.

`example-features.test.ts` could not catch it, and its own docblock said so before it happened: it
compares literals _within one file_, and the config lived in another. So the guard was fixed rather
than the symptom — it now follows a `features` import to its sibling module and checks the borrowed
set against the borrowing file's config. The example fix is the pattern the provider exists for:
`DataGridOptions` exports its set and the grid beneath shares it, so two sets that had to agree
became one.

**Three defect classes, each caught by a different mechanism than the one designed for it:**
`docs-option-names.test.ts` caught an unclassified table added after the last green run; ESLint
caught a dead feature set in `DataGridOptions.tsx` (declared, used only as `typeof features`, never
reaching `defaults`); `@smoke` caught the layer collision above. Each was invisible to the other two.

### What is still unverified

The rest of the browser suite. `@smoke` asserts that every example **renders** and logs no console
error; it does not drive interactions. The 29 kit-agnostic specs — including PR 3's RTL pinning
spec, which has never executed — are PR 5's.

### A note on the two temporary expedients, both removed

While `@ez-kit/data-grid-react` did not build, the docs were typechecked through a temporary
`apps/docs/tsconfig.pr4.json` mapping the three React packages to their `src/index.ts`, and
`type-resolver.ts`'s `TSCONFIG_FILE_NAME` pointed at it so `docs-option-names.test.ts` could run at
all. **Both are reverted** — the file is deleted, the constant is back to `tsconfig.json` — and every
figure above was re-measured through `dist` afterwards. The first honest `dist` run is what found
the unclassified table: no earlier green had covered it, because the table was added after the last
source-resolved run.
