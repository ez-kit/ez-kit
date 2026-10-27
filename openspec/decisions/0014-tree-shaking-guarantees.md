# 0014. Tree-shaking guarantees and the compound namespace

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0003-consumer-composed-features](./0003-consumer-composed-features.md)

## Decision

**What a partial import drags in is pinned per export** by `apps/docs/test/tree-shaking.test.ts` (esbuild over the built `dist`, the complete entry-point set per case). `data-grid-react`'s compound is one `/* @__PURE__ */ Object.assign(DataGridRoot, { … })` with a **flat** literal — never a spread, never back to assignments. Every member is also a named `DataGrid*` export, and `DataGridRoot` is compound-free. Rejected: moving the compound to a subpath, a getter namespace, `createDataGrid` rendering the bare root. Every guarantee here is an esbuild guarantee. The heroui footer is a React Aria collection section (`RacTableFooter`), not a portal.

## Context, rationale and rejected alternatives

**What a partial import drags in is pinned per export** — `apps/docs/test/tree-shaking.test.ts`
(helper in `apps/docs/test/tree-shaking/`) bundles a package's **built** entry with esbuild, once
per case, and asserts the **complete** set of `@ez-kit/*` entry points the named imports reach.
`sideEffects: false` and ESM output are necessary for tree shaking and nowhere near sufficient: one
top-level call or property read a bundler cannot prove pure anchors everything behind it, and
nothing in the build says so. Both store packages did exactly that — their default cache was a bare
`createStoreCache()` plus a destructure — so importing only `createContextStore` carried the whole
`store-core/cache` graph for a cache the app never mounted. `size-limit` could not
see it: it measures each entry point whole, not what a partial import pulls along.

Each case records the full set rather than a forbidden list, so anything _newly_ reached fails —
a forbidden list only catches the regressions someone already thought of. A module's own path is
not nameable (shared code lands in hash-named chunks), so each one is folded onto the entry point
it sits under, which is the specifier a reader would have to write to import it. The sets are read
against a whole-surface `import *`, without which a bundle that resolved nothing would satisfy
every case. To add one, name the export and run the test — the failure prints the set to record,
and a name the entry does not export fails the bundle outright.

**`@ez-kit/data-grid-react`'s `./index` used not to tree-shake at all, and the fix is one
annotated call — do not undo its shape.** Measured on the built `dist` with esbuild, importing one
const object (`{ useDataGridTable }`) cost as much as `{ DataGrid }` and nearly as much as a
whole-surface `import *` — i.e. any partial import of that entry paid for almost all of it. The
cause was the compound namespace's own assembly: 29 impure top-level property assignments
(`DataGrid.Toolbar = Toolbar;` …) at the end of `data-grid/data-grid.tsx`, which esbuild cannot
drop, and which therefore anchored all 29 components and everything they reached. Same defect
class as the `tableFeatures({ …spread })` and bare `createStoreCache()` cases above.

It is now one `/* @__PURE__ */ Object.assign(DataGridRoot, { Toolbar, Table: DataGridTable, … })`
with a **flat** object literal. Measured after, a hook or a layout import costs a fraction of the
surface while `{ DataGrid }` is unchanged. The figures live in
`apps/docs/test/tree-shaking.test.ts`, not here: a byte count in prose is stale by the next
release, and the test is what fails when it moves.

**This was an esbuild defect and nobody else's — probed, not assumed, and the scope matters.**
Rollup already dropped the namespace on the assignment form, and so did Turbopack, measured
through a real `next build` of a one-page app importing one name (with `FilterPanel`'s `data-slot`
literal absent and present). Both are byte-identical after the change. Webpack was **not** probed:
Next 16 no
longer ships a runnable terser plugin and webpack is not otherwise installed in this repo, so
that one is open.

Two consequences. The fix is worth real bytes to a consumer bundling with esbuild — a library
wrapping this package with `tsup`, most obviously — and worth nothing to one on Rollup, Vite's
production build or Next; it also cannot cost any of them anything, which is why it shipped
anyway rather than being argued about. And **every tree-shaking guarantee in this repo is an
esbuild guarantee**, because `apps/docs/test/tree-shaking/bundle.ts` bundles with esbuild: a case
passing there says a partial import is clean under esbuild's purity analysis, which is the
strictest of the three and therefore a reasonable proxy, but it is a proxy and not a proof for
the bundler a given consumer runs.

**This is not a contradiction of the `/* @__PURE__ */` note above — it is the other side of the
same line, and that note states which side each case falls on.** The probe recorded there found
that esbuild drops an annotated call whose argument is a plain object and keeps the identical call
when the object **spreads**, because a spread may run getters. `tableFeatures({ …stockFeatures })`
spreads; this literal does not. So: never add a `...someGroup` to it, and never go back to
assignments — either silently restores the defect, and the annotation then costs only its comment
bytes. `apps/docs/test/tree-shaking.test.ts` fails on both, by asking whether `FilterPanel`'s
`data-slot` literal survives a bundle of `{ useDataGridTable }`; entry-point sets cannot see this
class of defect, because both imports reach the same two entry points before and after.

**Read the `{ DataGrid }` row honestly: it did not get cheaper and must not.** That name is the
whole compound namespace, so it costs what everything costs. What got cheaper is every import that
never asked for it. In particular **this changed nothing for a grid composed out of `DataGrid.X`
members** — a consumer who writes three still pays for 29, because writing one reaches the const
that carries all of them.

Three alternatives were measured and **rejected**; re-proposing one needs a new measurement, not a
new argument.

- **Named component exports plus `DataGrid.X` as sugar on its own subpath**, mirroring
  `features/all`. This was the prescribed fix here until it was measured against the annotation:
  it lands on the **same** bundle, to the byte, while costing a major and every existing
  `DataGrid.X` across docs, examples and shadcn registry payload. What made it
  expensive is the word **subpath**: the compound _moving_. Adding the names **beside** it is a
  different change, it is not rejected, and it now ships — see below.
- **A getter namespace** (`Object.defineProperties(DataGrid, { Toolbar: { get: () => Toolbar } … })`)
  — measured **worse than doing nothing**. A top-level call that names the component anchors it
  whatever form the call takes.
- **Making `createDataGrid` render the bare root** instead of the compound, so a bound grid stops
  dragging the namespace. This is the only one that reaches composed grids, and it is worth a few
  per cent of a composed grid (measured on `createDataGrid` with four shadcn component groups and a
  sorting-only feature set). It costs `<DataGrid.Toolbar>` on every kit-bound grid,
  because `Object.assign(BoundDataGrid, DataGrid)` in `create-data-grid.tsx` is what puts the
  namespace there — and that wholesale copy exists precisely because a hand-written list had
  silently fallen five members behind. Bad trade; not taken.

**Every compound member is also exported by name, and that is additive rather than the rejected
alternative above.** `DataGrid.X` stays exactly where it is; `DataGridToolbar`, `DataGridTable`,
`DataGridFooter`, … are the same values under the names the `DataGrid*Props` types already used,
and `DataGridRoot` is the compound-free root. Measured on the built `dist` with esbuild, `DataGrid`
costs the whole namespace whatever a call site renders, while a grid composed from the ten
components it renders — table, body, row, cell, the header trio, toolbar, pagination, footer —
costs a fraction of that; adding the block cost the whole surface only the `export` lines
themselves. **Read that saving as the components' share, not the whole grid's**: `DataGridRoot`
renders `children ?? core.Layout ?? <DataGridTable/>`, so every grid reaches the table chain
through the root whichever door it used, and the shared floor (context, `useDataGridTable`) is paid
once either way — the gap between a composed grid and the compound is therefore much smaller than
the gap between the components alone. **The prefix is deliberate and the compound's keys stay
short** — `Body`, `Row`, `Cell`,
`Header` are too general for a package root that also exports `createColumns` and `createDataGrid`,
which is the same conclusion `@heroui/react` reached for its own table (`TableBody` beside
`Table.Body`). Note their `Object.assign` carries no `/* @__PURE__ */`, so their named exports buy
types and ergonomics but no bytes; ours buys bytes because the annotation and the flat literal are
already there. This also settles a split the package had — `DataGridRow` and `DataGridCell` were
prefixed, `Body` and `Header` were not.

The heroui kit is where this was found. Its `table-adapters.tsx` used to split `<DataGrid.Footer>`
out of HeroUI's React Aria collection with `child.type === DataGrid.Footer`, and that one key read
anchored all 29 components into the kit's `./core` entry, which cost that entry several times its
own weight until the check named `DataGridFooter` instead. Every other reference to the adapter in
either kit is an `import type`, which is erased, so that was the only one. The split itself is gone
now — see the footer note below — which made the entry smaller again, but the rule it proved stands
and
`apps/docs/test/tree-shaking.test.ts` pins it, along with the named exports and `DataGridRoot`
staying clear of the compound.

**The heroui kit renders the footer as a collection section, not through a portal.** React Aria's
`TableFooter` arrived in react-aria-components 1.18 and HeroUI made that package a peer (`^1.21.1`)
in 3.2.3, so `Tfoot` is now `RacTableFooter` imported from `react-aria-components` directly —
HeroUI does not re-export it, because their own `Table.Footer` is a `<div>` _outside_ the table for
pagination. Before 1.18 a `<tfoot>` was not a node the collection recognised and was silently
dropped, so the kit lifted the footer out of the children before the collection saw them, portalled
it back into the real `<table>`, and flipped `Tr` / `Td` into a plain-DOM mode through a context
while it rendered. Four parts, all removed together. The footer's cells are now ordinary collection
cells, which is also why they became focusable. `react-aria-components` is a peer of the kit from
here on; the shadcn kit is untouched, its table is plain DOM.

So **`createDataGrid` and both kit roots still carry everything**, and that is left standing rather
than pending. A kit root is "everything" by construction — its `data-grid.tsx` calls
`createDataGrid({ components: allComponents, features: allDataGridFeatures })` at the top level —
and a consumer who wants less already has the composed path: `@ez-kit/data-grid-shadcn/core`,
`/sorting`, … plus `createDataGrid`, which is the composed case above.
