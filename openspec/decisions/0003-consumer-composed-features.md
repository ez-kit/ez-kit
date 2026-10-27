# 0003. The data-grid's features are composed by the consumer

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0014-tree-shaking-guarantees](./0014-tree-shaking-guarantees.md)

## Decision

TanStack Table v9: `features` is **required** on `TableConfig` / `UseDataGridConfig`, with no default. `allDataGridFeatures` lives on `@ez-kit/data-grid-core/features/all` — never move it back onto `./features` (a spread anchors everything; `/* @__PURE__ */` does not help). The kits' prebuilt `DataGrid` binds it in each kit's `data-grid.tsx`, never in `index.ts`, and every `DataGridBundle<KitCellTypes, KitFeatures>` annotation carries the set. Exactly three features are structural (`columnVisibilityFeature`, `columnPinningFeature`, `columnSizingFeature`); keep the scoped `no-unnecessary-condition` disables on the optional-feature guards (`feature-optionality.test.tsx`). Registering a feature does not enable it (`sorting: false` beside `rowSortingFeature` is not a finding). Feature guards are **runtime-only** dev warnings — the compile-time gate was deliberately not delivered; do not restore that claim. Components are typed against the widest `GridFeatures`. There is no `_features` array; plans that mention it are history.

## Context, rationale and rejected alternatives

The data-grid runs on **TanStack Table v9**, where a table has only the features it was handed.
`tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), editingFeature, … })`
— every member re-exported from `@ez-kit/data-grid-core/features`, so `@tanstack/table-core` stays
our dependency rather than the consumer's peer — builds the set once per application, and
`features` is a **required** field of `TableConfig` and of `UseDataGridConfig`. Deliberately with
no default: the only possible default is the all-in set, which is exactly what everyone who never
thought about it would then ship, and the point of composing a set is that a table pays for what
it registers. `allDataGridFeatures` exists for prototypes and doc examples, and naming it is
documented as defeating exactly that.

**`allDataGridFeatures` lives on its own subpath, `@ez-kit/data-grid-core/features/all`, and that
placement is load-bearing — do not move it back onto the main entry.** It is a top-level
`tableFeatures({ …stockFeatures, … })` call, and an object spread may run getters, so a bundler
cannot drop the expression and retains every operand with it. While it sat on `./features`,
importing **any** single name from that entry pulled nearly all of it, which cancelled the thing
the migration is for. It was the same defect the store packages had with a bare
`createStoreCache()`, one package over. Split out, a single feature or a sorting-only set costs a
rounding error, while a set that registers `editingFeature` costs what a feature with a real
implementation behind it weighs. The all-in set still costs what it costs, but that is now a choice
a consumer makes by writing the import, which is what design §1 always said it should be.
`apps/docs/test/tree-shaking.test.ts` holds the measurement, so a regression fails there rather
than in someone's bundle — and the figures live in that test rather than here, because a byte
count written into prose is stale by the next release.

Two things were established while fixing it, both by measurement, and neither should be re-argued.
**`/* @__PURE__ */` is not a weaker fix here — it is not a fix.** Annotating the call, with or
without every `create*RowModel()` inside it, cost the comment bytes and saved nothing. A one-module
probe showed why — esbuild drops an annotated call with a plain object argument and keeps the
identical call when the object **spreads**, because a spread may run getters. So the annotation is
the right tool for a bare `createStoreCache()` and the wrong one for this. **And `size-limit`
cannot see this class of defect at all**: it read the `features` entry at the same size before the
fix and after, because it measures an entry point whole rather than what a partial import drags
along. The test is the guarantee here, not the budget — which is exactly why
`tree-shaking.test.ts` exists beside `size-limit` rather than being folded into it.

**The kits' prebuilt `DataGrid` binds `allDataGridFeatures`, and that is not the rejected default.**
`features` stays required on `@ez-kit/data-grid-react` and on any bundle built without a set. What
changed is the one export that already means "everything": `DataGrid` from a kit root ships all
fourteen component groups, and those components read the features' APIs, so they drag the
implementations in whatever set a call site names. Measured in both kits, the prebuilt grid on a
sorting-only set differs from the same grid with every feature by a few kB — **for eight imports at
every call site** — while the same grid composed through `createDataGrid` with four component
groups is substantially smaller than either. So the set earns its keep where a grid is composed and
nowhere else, and demanding it on the prebuilt bought a rounding error at the cost of every quick
start. Note the all-in set's own cost is what it weighs imported **alone**; it is not what the set
adds on top of `allComponents`.

Three things hold this together and none of them are optional. The binding lives in each kit's
`data-grid.tsx` and must stay there: `createDataGrid` reaches a consumer through `index.ts`'s star
re-export of the adapter, so moving the `features/all` import up one module would make every
composed grid carry every feature, silently. `apps/docs/test/tree-shaking.test.ts` pins that —
`DataGrid` reaches the editing implementation, `createDataGrid` does not. And every one of the four
`DataGridBundle<KitCellTypes, KitFeatures>` annotations in that file has to carry the set: the
second parameter defaults to `undefined`, so `createDataGrid<KitCellTypes>` alone erases the
binding and hands back a bundle that still demands `features` at every call site. A set named at a
call site **replaces** the bound one, which narrows behaviour and returns none of the bytes — the
docs say so rather than implying a saving that is not there.

**Exactly three features are structural, and the line between "structural" and "defect" is
executable.** `columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` are
mandatory for the React adapter whatever else a grid registers — the shell lays out a column grid,
so it needs visibility, pin groups and widths to lay one out with, and omitting any of them is a
**render-time `TypeError`**. That is not a limitation waiting to be lifted; it is what a grid is
made of, and every docs example opens its set with the three.

Eleven features were once mandatory this way. The other eight — `columnResizingFeature`,
`rowSortingFeature`, `loadingFeature`, `creatingFeature`, `infiniteFeature`, `rowSelectionFeature`,
`editingFeature`, `deletingFeature` — were **defects**, unconditional reads on the default render
path, and they are fixed: a grid without `rowSortingFeature` renders and does not sort. Do not
"tidy up" the scoped `no-unnecessary-condition` disables on the guards that made that true. They
read as unnecessary only because the widest instantiation says the check cannot fail; it can, and
did — `getCanSort`, `state.creating.isOpen` and `state.infinite.isFetchingNextPage` each threw.
`feature-optionality.test.tsx` renders a grid missing each optional feature and asserts the three
structural ones still throw, so deleting a guard turns a lint error into a test failure rather than
into silence — and the structural boundary is checked rather than asserted. Neither a core guard
nor an exported `baseGridFeatures` is pending: this is the settled answer.

**Registering a feature does not switch it on, and configuring one does not register it.** The two
are orthogonal axes. `features` is compile time — what is in the bundle and which APIs exist at
all. The config (`sorting: false`, `editing: { mode: 'row' }`) is runtime — whether this instance
uses them. That is upstream's own model, which is why `enableSorting: false` still exists beside a
registered `rowSortingFeature`, and it is what keeps one wide shared `<AppDataGrid>` usable at a
dozen call sites with half of it switched off. So **`sorting: false` beside a registered
`rowSortingFeature` is not a contradiction and is not a finding.** The whole scalar-or-object
config vocabulary recorded below is untouched by the migration; what changed is that writing
`sorting` at all now requires `rowSortingFeature` in the set. The accepted cost is that a
registered-but-disabled feature still creates its state slice and its APIs, so a wide shared
component pays for the union of everything it can do; the remedy is more than one feature set, and
it is stated in the docs rather than engineered around.

**The grid's own feature guards are RUNTIME-ONLY.** `sorting: {…}` with `rowSortingFeature` left
out of the set **type-checks clean** and yields a grid with no sorting slice, no sorting API and no
behaviour — a silent no-op. The only thing that catches it is the development-mode
`REQUIRED_FEATURE` / `CONDITIONAL_REQUIRED_FEATURES` warning in
`packages/data-grid/core/src/create-table/create-table-options.ts`, and nothing stands behind that.
The v9 migration's design promised a compile-time gate here; it was **not delivered, deliberately**.
The gate is buildable — `tableFeatures()` returns what it was given, so `typeof features` carries
the registered keys and `TableConfig` could intersect a conditional block per feature — but it
costs the named `TS2561` diagnostic the guard catalogue is built around, and
`apps/docs/test/docs-option-names.test.ts` resolves documented names with
`ts.TypeChecker.getPropertiesOfType()`, which cannot see through a conditional intersection, so its
430-name coverage would go with it. Two core docblocks (`core/src/types.ts` on
`TableConfig.features`, `create-table-options.ts` on `REQUIRED_FEATURE`) state this in full and
explicitly retract an earlier revision that claimed the opposite. **That retraction is the current
state, not a regression** — do not "restore" the compile-time claim, and size any attempt at the
real gate against that docs test.

**A component read is not gated on the feature being registered either.** Everything below
`<DataGrid>` — the component contract, both UI kits, `ActionsCellProps` and its siblings — is typed
against `GridFeatures`, which is the widest instantiation (`type GridFeatures = TableFeatures`,
`react/react/src/types.ts`). That is what stops `TFeatures` reaching the component contract and the
kits, which are not generic over `TRow` either, and it is the reason the migration's cost was
bearable at all. The price is that a component calling into a feature's API compiles whether or not
the grid it renders in registered that feature; core's development-mode warning above is, again,
the only thing that catches it.

**There is no `_features` array to append to.** Under v8 a feature was registered by adding it to a
`_features` array built inside `createTable`. That is gone. Registration is now the `features`
option, and `table._features` survives in v9 as a _different_ thing — a read-only member of the
constructed table instance, `Partial<CoreFeatures> & TFeatures`, resolved from that option — so an
instruction to "add it to `_features`" is doubly stale. Plan documents under
`docs/superpowers/plans/` predate the migration and are records of work as it was done; read their
`_features` instructions as history, not as the mechanism.
