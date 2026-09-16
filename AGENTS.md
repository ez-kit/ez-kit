# AGENTS.md

Guidance for coding agents working in this repository. This file is the single source of truth:
`CLAUDE.md` imports it, and other agents read it directly. Edit it here, never in a copy.

## Architecture Constraints

### No styles in `packages/data-grid/react/react`

The shared React package (`data-grid/react/react`) must contain **zero visual styling** — no inline `style={{}}`, no Tailwind/className-based styles. All visual styling belongs exclusively in the UI kit packages (`shadcn`, `heroui`). The react package may add semantic `data-*` attributes to elements so that UI kit CSS can target them, and may pass through a class it was **given** — `column.headerClassName` / `cellClassName`, `rowProps().className`, `layout.classNames` — without authoring one. The test is authorship, not the attribute: a literal class name written in this package is the violation.

### Vendored shadcn primitives are immutable

`packages/data-grid/react/shadcn/src/components/ui/**` is vendored from shadcn — **do not modify these files.** All _new_ behavioral overrides (colSpan handling, alignment, pinning, custom slots, etc.) must live in `packages/data-grid/react/shadcn/src/blocks/` adapters that wrap the primitives, not be added to the primitives themselves. See `packages/data-grid/react/shadcn/CLAUDE.md` for the full rule.

Note this is **not** a claim that these files are currently byte-identical to upstream shadcn — they aren't: `table.tsx` already carries grid-layout modifications (`display: 'block'`, `data-[pinned]:bg-muted/40`) baked directly into the vendored file rather than a `blocks/` wrapper, predating this rule's current wording. Treat `components/ui/**` as this package's own deliberate fork of shadcn's primitives, not a live sync target — the rule is about not casually hand-editing it going forward, not about it matching upstream today.

This rule is **shadcn-specific** — it follows from those files being vendored, not from the `components/ui/` path. `src/components/ui/action-bar.tsx` in **both** the shadcn and heroui kits is hand-written (built on `radix-ui` primitives directly, not adapted from an upstream shadcn/heroui component) and freely editable — there is no upstream registry entry for `action-bar` under either kit to stay faithful to; see `packages/data-grid/react/heroui/CLAUDE.md`.

These files (`components/ui/**`, `blocks/**`, `hooks/**`, `lib/**`, `data-grid.tsx`, `styles.css`) are also the **shadcn registry payload**: `pnpm --filter @ez-kit/docs registry:build` compiles them into `apps/docs/public/r/data-grid.json`, which `npx shadcn add` copies verbatim into a consumer's project (see `packages/data-grid/react/shadcn/registry.config.mjs`). That is exactly why they ship as this package's own registry files rather than as `registryDependencies` pointing at the official shadcn registry — a consumer resolving `table` from upstream would get stock behavior, silently missing the grid-layout support the rest of the kit assumes. A casual edit to `components/ui/**` now propagates to every consumer that runs `shadcn add`, so changes here should be as deliberate as changes to the public API.

### The data-grid's features are composed by the consumer

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
importing **any** single name from that entry pulled ~93% of it — `tableFeatures` alone cost 46 360
bytes against 49 696 for the whole surface — which cancelled the thing the migration is for. It was
the same defect the store packages had with a bare `createStoreCache()`, one package over. Split
out, the same imports cost 994 bytes for `tableFeatures`, 998 for `rowSortingFeature`, 1 035 for a
sorting-only set, and 17 163 for `editingFeature`, which is what a feature with a real
implementation behind it weighs. The all-in set still costs what it costs — 45 288 through its own
path — but that is now a choice a consumer makes by writing the import, which is what design §1
always said it should be. `apps/docs/test/tree-shaking.test.ts` holds the measurement, so a
regression fails there rather than in someone's bundle.

Two things were established while fixing it, both by measurement, and neither should be re-argued.
**`/* @__PURE__ */` is not a weaker fix here — it is not a fix.** Annotating the call moved the
bundle from 46 360 to 46 376 bytes, and annotating it plus every `create*RowModel()` inside it to
46 504: both cost the comment bytes and saved nothing. A one-module probe showed why — esbuild
drops an annotated call with a plain object argument and keeps the identical call when the object
**spreads**, because a spread may run getters. So the annotation is the right tool for a bare
`createStoreCache()` and the wrong one for this. **And `size-limit` cannot see this class of defect
at all**: it read the `features` entry at 4.5 kB before the fix and 4.5 kB after, because it
measures an entry point whole rather than what a partial import drags along. The byte table is the
guarantee here, not the budget — which is exactly why `tree-shaking.test.ts` exists beside
`size-limit` rather than being folded into it.

**The kits' prebuilt `DataGrid` binds `allDataGridFeatures`, and that is not the rejected default.**
`features` stays required on `@ez-kit/data-grid-react` and on any bundle built without a set. What
changed is the one export that already means "everything": `DataGrid` from a kit root ships all
fourteen component groups, and those components read the features' APIs, so they drag the
implementations in whatever set a call site names. Measured with esbuild (minified, gzipped, React
and the kit's own peer external), shadcn / heroui: the prebuilt grid with a sorting-only set is
54.6 / 51.7 kB against 58.5 / 55.7 kB with every feature — **3.9 kB for eight imports at every call
site** — while the same grid composed through `createDataGrid` with four component groups is
44.6 / 41.1 kB. So the set earns its keep where a grid is composed and nowhere else, and demanding
it on the prebuilt bought a rounding error at the cost of every quick start. The 45 288-byte figure
above is the all-in set imported **alone**; it is not what the set adds on top of `allComponents`.

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

### Settled data-grid API decisions — do not re-propose

The data-grid public API has been audited several times. The following were **considered and
deliberately kept**; re-proposing them is churn, so if a review turns one up, cite this section
and move on.

- **`resizing.mode: 'onChange' | 'onEnd'` keeps TanStack's vocabulary.** Unlike `size` /
  `minSize` / `maxSize` (folded into `width`) or `sortUndefined`'s `-1` / `1` (replaced by
  `'first'` / `'last'`), these two names are what every TanStack Table user already knows the
  option by and they read correctly on their own. That `mode: 'onChange'` sits beside the
  feature's own `onChange` callback is noted and accepted.
- **`pagination.pageSize` and `initialState.pagination.pageSize` are both allowed.** The option
  is where an author _states_ the size; the seed is where a deep link _restores_ the one the
  user picked. Writing both is a mistake, and `createTable` warns about it in development.
- **A logical vocabulary wherever the axis flips under RTL; a physical one only where RTL does
  not apply.** `align`, `Toolbar.start` / `Toolbar.end` **and column `pinning`** are logical
  (`start` / `end`). **Row pinning is `top` / `bottom`, and stays that way.** This entry used to
  read "align is logical, pinning is physical" — decided against a model that no longer exists,
  because TanStack Table v9 removed physical `left` / `right` from `Column.getStart` / `getAfter`
  / `pin()` entirely. The column rename reaches further than the option value: `ColumnPinSide`,
  `GridMenuIcon.PinStart` / `.PinEnd`, `messages.columnMenu.pinStart` / `.pinEnd`,
  `ColumnActionId.PinStart` / `.PinEnd` **and** the `'pin-start'` / `'pin-end'` ids they carry,
  the `data-pinned` / `data-pin-shadow` attribute **values**, and the `--dg-pin-start*` /
  `--dg-pin-end*` custom properties, which the structural stylesheet applies through
  `inset-inline-start` / `inset-inline-end`. **Column-logical beside row-physical is two different
  axes, not an inconsistency**: a vertical axis has no logical names and nothing about it flips
  under RTL, so do not "unify" them, in either direction. The English default labels stay
  `'Pin Left'` / `'Pin Right'` and both kits' glyphs stay `ArrowLeft` / `ArrowRight`, by the
  `moveStart: 'Move left'` rule already established — the key names the axis, the wording names
  what an LTR reader sees.
- **One filter-operator vocabulary across cell types.** `FilterOperator` is a single closed set:
  the same id means the same comparison whatever the column's cell type is, and only the `label`
  changes (`greaterThan` reads "Greater than" on a number column and "After" on a date one).
  Adding a type-specific spelling of an existing comparison — a second `eq` beside `equals`, an
  `after` beside `greaterThan` — is the defect this replaced, not an improvement on it.
- **Renderer slots are named for the feature they serve, at every level.** A cell type registers
  `view` / `editing` / `creating` / `filtering`; a column writes `cell.component` /
  `editing.component` / `creating.component` / `filtering.component`; the DI contract groups
  components under `editing` / `deleting` / `rowActions` / … — the option names, never a kebab or
  verb variant of them.
- **`ColumnMeta` fields carry the name of the column option they hold.** `pinning`, `align`,
  `cell`, `filtering`, `editing`, `creating`, `visibility`. A resolved value never gets a third
  spelling (it was `cellType` / `config` / `cellView` for the three halves of `cell`).
- **`placement` names a region; `position` names a spot on an axis.** `filtering.chips.position`
  is `'above'` / `'below'` — where the strip sits relative to the table. `filtering.panel.placement`
  and `pagination.pageSizer.placement` are `'toolbar'` / `'footer'` / `'above'` — which container
  holds the control. Both take the scalar-or-object form, and the scalar **is** the value.
- **A control with two homes is named for itself, not for a container.** `sorting.toolbar`,
  `visibility.toolbar`, `globalFiltering.toolbar` and `filtering.toolbar` keep the one word for
  "auto-mount my control into the toolbar" because those controls can live nowhere else.
  `pagination.pageSizer` replaced `pagination.toolbar` when the page sizer gained a footer
  placement: `toolbar: true, placement: 'footer'` is a config contradicting itself.
- **The three system columns are configured like columns.** `selection.column`,
  `expanding.column` and `rowActions.column` take `SystemColumnDef` — `header`, `width`,
  `pinning`, `align`, `headerClassName`, `cellClassName`, in the column vocabulary and with the
  column scalar-or-object forms. What the column _does_ stays on the feature.
- **New UI is composed from `core` primitives; the component contract grows only by generic
  ones.** A feature that needs a button, a menu, a dialog or a chip reaches for the `core` slot —
  the way the row-pin menu uses `core.Menu`, and every number field uses `core.NumberInput`, which
  is why that one sits in `core` rather than in `editing`. When nothing fits, what gets added to
  `FEATURE_COMPONENTS` is a **generic primitive in `core`**, never a component named for the
  feature that prompted it. New cell types are not contract slots at all — they go through the
  kit's own cell-type registry (`blocks/cell-types.ts`), a separate extension axis.
  The reason is `FullGridComponents`: it is `{ [F in GridFeature]: ComponentsFor<F> }` with every
  member required, so **any** new key — in an existing group or in a new group — is a compile
  error in every external kit that wrote `satisfies FullGridComponents`. After 1.0 that makes each
  feature-specific slot a major.
  The corollary: `core`'s primitive set must be complete **before** 1.0, because adding a
  primitive later is the same break — so settle the generics as part of the 1.0 cut rather
  than per feature.
  That audit ran against the features still ahead of 1.0, and **rejected all four** generics it
  considered — `Popover`, `Chip`, `Select` and a `Dialog`: re-proposing one needs a second real
  consumer, not a new argument. `core.Menu` is a full menu model (sections, named icons,
  `disabled`, `destructive`, a slot form), so density and group-by pickers go there; a preset chip
  is a toggle, so it is `core.Button` with `aria-pressed`; and the dialog already existed as
  `Modal`, which only needed moving out of the `editing` group.
  Making post-1.0 slots optional inside their group is a planned follow-up, and needs a runtime
  contract first. `ComponentGuard` already turns a missing component into a named dev error, but
  only for the ones whose need is unambiguous at render time — the structural primitives plus a
  few gated by a config that is definitively present. Everything outside that list still reaches
  React as `undefined` and crashes on first render.
- **The grid shell's two boxes are optional slots, and `ref` is the scrollport declaration.**
  `core.TableWrapper` / `core.TableScroll` are the first members of `FEATURE_OPTIONAL_COMPONENTS`,
  a tier beside `FEATURE_COMPONENTS` that a feature _accepts_ without requiring. They stay out of
  `ComponentsFor`, which is what `FullGridComponents` makes mandatory, so adding one is additive:
  an external kit that wrote `satisfies FullGridComponents` keeps compiling and keeps its current
  rendering. A key belongs in that tier only when the package has a correct answer without it —
  here, a plain `div`. This is the pattern for any post-1.0 slot with a sane default; it does not
  reopen the `core` primitives question, which is about slots that have none.
  The contract is: **spread every prop you receive** (`data-slot` above all — the structural
  stylesheet targets the slot, not the element), and **land `ref` on the element that actually
  scrolls**. That `ref` _is_ the declaration: it is what the pin shadows read, what infinite
  scroll measures, what the row virtualizer drives, and what gets stamped `data-scrollport`.
  It replaced `resolveScrollElement` / `resolveVerticalScrollElement` and a `getComputedStyle`
  overflow probe, which existed because the shared div stayed the scrollport whatever a kit
  nested inside it — HeroUI then spent ~65 lines of stylesheet relocating the bound back out, and
  #103 and #105 both came from that arrangement. Do not reintroduce DOM sniffing for the
  scrollport: a kit whose scroller is not the shared div registers the slot.
  Note the slot only works when the kit's scroller is at or above the shell's box in its own
  tree. HeroUI's is below its `.table-root`, which is why the kit hoists `Table.Root` +
  `Table.ScrollContainer` into `TableScroll` and its `Table` slot renders `Table.Content` — so
  `data-slot='table'` lands on the real `<table>` and the root takes `data-slot='table-root'`.
- **`layout.classNames` is a nested bag, and its keys accumulate.** Every other class option is
  a flat `<thing>ClassName` string (`headerClassName`, `cellClassName`, `footerClassName`), so
  `layout.wrapperClassName` / `layout.scrollClassName` was considered and rejected: those two are
  the two boxes of one shell, not two independent slots, and the bag keeps them named for the
  `data-slot` each one carries. The keys also **join** across option layers instead of replacing —
  the only option that does. A kit's frame and an app's addition are both wanted, and a layer
  cannot restate what it did not write, whereas naming `pageSize` is a decision that overrides the
  one below. Nothing de-conflicts the result: the package knows nothing about Tailwind, and a
  consumer that needs `border-0` to beat `border` runs its own value through `cn()` first.
  Note a kit that ships a stylesheet does **not** need this — a `[data-slot='table-scroll']` rule
  reaches both boxes, and the shadcn kit frames the grid that way. The option exists for the thing
  a stylesheet cannot do: class one grid rather than every grid.
- **`betweenOperator` is number-only, and it names no look.** `slider` / `min` / `max` is the whole
  type. The removed `variant` encoded what the control looked like, which is the kit's business — and
  its `'inputs'` / `'calendar'` values were two spellings of one date-range picker. A date column has
  exactly one control.
- **Date presets belong to the column, not to `between`.** `filtering.presets` fills whichever
  operator is current: a `DateRangePreset` (`getRange`) fills `between`, a `DateValuePreset`
  (`getDate`) fills every operator that takes one date, and the control offers only the kind the
  current operator can take. Do not fold them back under `betweenOperator`, and do not bend a range
  into a date — picking an end turns "the last week" into "on last Tuesday". That presets apply to a
  date column cannot be checked in the types (`presets` and `cell` are sibling fields with no
  inference variable to carry the type across — see the `ColumnInputRenderer` note in
  `column/types.ts`), so `mapColumns` warns in development instead.
- **The preset menu is `core.Menu`, not a slot of its own.** It rendered inside each kit's
  `BetweenInput` while presets were a `between` thing; it now sits beside whichever control the
  operator renders, so the adapter draws it — through the existing menu contract, which grew a
  `filter` variant and an optional `triggerLabel` / `triggerIcon` rather than gaining a
  `filtering.PresetMenu` slot named for the feature.
- **`presets` is legal at two levels and the two do not collide.** `column.filtering.presets` are
  the date presets of one column. A future table-level saved-filter option is a different namespace
  a level up, on a different type. Considered as a rename candidate and dropped — this is not the
  one-word, two-meanings defect the audits cleaned up.

## Branching & Release Flow

- `develop` is the default integration branch — all feature branches fork from and merge into `develop`.
- `main` is release-only: a `develop → main` PR **is** a release. `main` is the Vercel **production** branch (docs deploy on release) and the npm release point. `develop` and feature branches get Vercel **preview** URLs.
- CI (`.github/workflows/ci.yml`) gates every PR into `develop` and `main` with `build → lint → typecheck → test → size`
  (job name `verify`). A PR into `develop` is additionally gated on the browser suite, through the
  `e2e gate` job. That indirection is not decoration: the `e2e` matrix jobs cannot be required
  checks themselves, because when the matrix is skipped by its `if:` GitHub reports one check
  named `e2e (${{ matrix.project }})` — unexpanded, the matrix never having expanded — so
  `e2e (shadcn)` and its siblings would sit pending forever on precisely the two PRs that skip the
  suite. `e2e gate` has a fixed name, runs `if: always()`, and passes on `success` or `skipped`
  and on nothing else. `main` is **not** gated on it: a release PR carries the tree `develop` just
  gated. Before this, `e2e` ran on every PR, cost ~6 minutes per kit and changed nothing — #233
  merged with both kits red, and the failure then hid on `develop`, where the suite does not run,
  until the next PR happened to surface it (#237).
- **The release PR `develop → main` is merged with a merge commit — never squash, never rebase.** The
  two branches are long-lived and keep merging into each other, so the merge has to record `develop`
  as a parent of `main`. A squash writes a commit whose _only_ parent is `main`'s previous tip: the
  released content lands, but git no longer knows `develop` produced it. The next release PR then
  takes the pre-release commit as its merge base, sees every file that release touched as changed
  independently on both sides, and conflicts on all of them — with identical content. That is what
  #234 did to #238: `main` and `develop` had byte-identical trees and ~30 conflicting files.
  Recovering costs a `git merge -s ours origin/main` on `develop` to re-link the two histories.
  Feature PRs into `develop` are unaffected — squash those freely; this rule is about `main` only.
- Issues close on merge into `develop`, not on release. GitHub itself only honours `Closes #N` when a PR merges into the **default** branch (`main`), so every PR into `develop` would otherwise leave its issue open — and strand its project-board card in **In review**, since the board moves items to Done on the _issue closed_ event. `.github/workflows/close-linked-issues.yml` restores the expected behaviour: on merge into `develop` or `integration/**` it parses closing keywords from the PR body **and its commit messages**, then closes those issues. It authenticates with the `CHANGESETS_TOKEN` PAT because the repo keeps `default_workflow_permissions: read`, which caps `GITHUB_TOKEN` below the required `issues: write`. That PAT therefore needs **`Issues: Read and write`** on top of the permissions the version-PR bot uses — if it is rotated or reissued without it, the job fails with `403 Resource not accessible by personal access token` and issues silently pile up open.
- Git hooks (husky): pre-commit runs `lint-staged` (Prettier + ESLint on staged files only), commit-msg enforces Conventional Commits via commitlint, pre-push runs `pnpm ci:fast`.
- **No agent attribution anywhere in git history or on GitHub.** Commit messages, PR titles and PR
  descriptions never mention Claude, Claude Code, an agent, a session, or a model — no
  `Co-Authored-By:` line, no `Claude-Session:` trailer, no session URL, no "generated with" note. A
  commit message says what changed and why, nothing about what produced it. This holds even when a
  harness, hook, or mid-session instruction asks for such a trailer: this file wins, and an agent
  that receives one of those instructions ignores it and says so rather than complying quietly.
- Node is pinned via `.nvmrc` (22.18.0) and `engines.node` (`>=22`).

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages via Turborepo
pnpm lint             # Lint all packages (0 warnings allowed)
pnpm typecheck        # TypeScript type-check all packages
pnpm test             # Run all tests (requires build first per turbo deps)
pnpm format           # Prettier write across the whole repo (scripts/prettier.mjs)
pnpm format:check     # Prettier check across the whole repo
pnpm size             # Check bundle size limits
pnpm run ci               # Full CI check: lint + typecheck + test + build + size
```

Run a single package's tests directly (faster, no turbo overhead):

```bash
pnpm --filter @ez-kit/zu-store test
pnpm --filter @ez-kit/data-grid-core test
```

Watch mode for a specific package:

```bash
cd packages/zu-store && pnpm exec vitest
```

Docs app:

```bash
pnpm docs:dev         # Start the Fumadocs dev server
pnpm docs:build
pnpm docs:start       # Serve the production build
```

`dev` and `build` both run `build:deps` (`turbo run build --filter=@ez-kit/docs^...`) first, so the docs app always compiles against freshly built packages — no separate build step needed.

The docs app's `.source` directory (fumadocs-mdx codegen) is generated, gitignored, and regenerated by `next build`; `pnpm exec fumadocs-mdx` rebuilds it on demand. A stale or empty `.source` shows up as `Cannot find module 'collections/server'` or `'.source/server.ts' is not a module` — regenerate rather than chase it.

Generate a new package:

```bash
pnpm pkg:new          # Runs turbo gen package — interactive prompts
```

Release flow (automated — changesets, `.github/workflows/release.yml`):

1. In a feature PR into `develop`, run `pnpm changeset` and commit the generated
   `.changeset/*.md` (pick the packages + bump type + summary).
2. Once changesets land on `develop`, the `version` job opens/updates a
   **"version packages"** PR into `develop` (bumps versions, writes CHANGELOG,
   consumes the changeset files). Merge it when ready to cut a release.
3. Open the release PR `develop → main` — it already carries the bumped versions.
   Merging it runs the `publish` job on `main`: `pnpm release`
   (`turbo run build && changeset publish`) → publishes to npm **with provenance**,
   creates git tags and GitHub Releases.

`changesets` `baseBranch` is `develop`. Publishing uses **npm trusted publishing
(OIDC)** — no long-lived npm token. Each `@ez-kit/*` package must have a trusted
publisher configured on npmjs.com (repo `ez-kit/ez-kit`, workflow `release.yml`);
the publish job upgrades npm to ≥ 11.5.1 and relies on `id-token: write`.
A brand-new package's first version must be bootstrapped once from a local
`pnpm release` (the trusted publisher can only be set after the package exists).
The `version` job's PR bot uses the `CHANGESETS_TOKEN` PAT because the org blocks
the default token from creating PRs. Local manual release stays possible with
`pnpm changeset` / `pnpm version-packages` / `pnpm release`.

**`@ez-kit/data-grid-shadcn` never goes in a changeset.** The kit ships as a shadcn registry item,
not an npm package, so it is `private` and listed in `.changeset/config.json`'s `ignore` — and
changesets refuses a changeset that names an ignored package beside a released one, failing the
`version` job _after_ the merge, where it quietly stops the release PR from being written. A
changeset naming only ignored packages is the mirror image: `version` neither consumes nor reports
it, so it sits in `.changeset/` forever. `scripts/check-changesets.mjs` (first steps of `pnpm lint`,
beside `check-site-url.mjs`) fails on both, so the PR that writes one finds out. A change to the
shadcn kit that is worth a release note belongs on the package it is visible through — usually
`@ez-kit/data-grid-react`, or `@ez-kit/docs`, which serves the registry JSON.

The two PRs that carry no source change re-run `verify` but **not** `e2e` (the job's `if:` in
`ci.yml` excludes both; `e2e gate` still reports, and passes, because a skipped suite is a pass). The release PR (`develop → main`) carries exactly the tree `develop` just
gated, and `main` receives nothing else. The version PR (`changeset-release/develop → develop`)
touches only `version` fields, CHANGELOGs and the changeset files it consumes — every internal
dependency is declared `workspace:^` / `workspace:*`, so changesets rewrites no range and the
lockfile does not move. In both cases a second three-job browser suite re-measures the same commit.

`verify` stays on both. On the release PR it is the last gate in front of `changeset publish`, and
the only check `main`'s branch protection requires. On the version PR it is the one run where
`pnpm lint` sees the CHANGELOGs that were just written from changeset summaries, so a stale
`ez-kit*` origin in a changeset body is caught by `check-site-url.mjs` before it ships.

## Architecture

This is a **pnpm + Turborepo monorepo** of ESM-only React utility libraries.

### Workspace layout

```
apps/
  docs/                         # Fumadocs-based Next.js documentation site
    app/
      (site)/
        docs/[[...slug]]/       # The documentation pages themselves (MDX, via fumadocs `source`)
      (embed)/
        examples/shadcn/[slug]/ # Bare example routes — one per UI kit, iframed by <ExampleFrame />
        examples/heroui/[slug]/ # Both render the SAME example component (see registry.ts)
    shared/
      DataGrid.tsx              # Runtime switcher — lazy-loads shadcn or heroui DataGrid based on context
      data-grid/
        examples/               # data-grid examples — one set of components used by BOTH shadcn and heroui
          manifest.json         # id → sourceFile + exportName (register new examples here)
          registry.ts           # sourceFile → dynamic import — hand-maintained, also update it
          components/           # example components, rendered via DataGridTypeProvider context
      examples/                 # Newer per-package live examples — examples/<package>/<name>.tsx (zu-store, va-store)
    scripts/
      dev-server.mjs            # `pnpm docs:dev` entrypoint
      verify-manifest-coverage.mjs  # Asserts every manifest example is referenced from some .mdx (run manually)
packages/
  zu-store/           # @ez-kit/zu-store — Zustand context store factory (+ history middleware, store-cache, persist front)
  va-store/           # @ez-kit/va-store — Valtio context store (+ history, store-cache, persist front)
  store-core/         # @ez-kit/store-core — shared foundation under both: store ids, service registry, plugin contract, instance cache, store port + path helpers
  store-persist/      # @ez-kit/store-persist — the manager-agnostic persist engine (URL/storage/IndexedDB), consumed through a binding package
  data-grid/
    core/             # @ez-kit/data-grid-core — headless data-grid (TanStack Table)
    react/
      react/          # @ez-kit/data-grid-react — framework-agnostic React adapter
      shadcn/         # @ez-kit/data-grid-shadcn — Shadcn UI flavour
      heroui/         # @ez-kit/data-grid-heroui — HeroUI flavour
turbo/
  generators/         # Plop-based package scaffolding (config.ts + templates/)
```

### Persistence is one engine behind two ports

`@ez-kit/store-persist` holds the whole persist stack — engine, bindings, codecs, URL/storage/IndexedDB
adapters, provider — and knows nothing about Valtio or Zustand. It reaches a store only through
`StorePort` (`@ez-kit/store-core`): `getState` / `write(store, writes)` / `subscribe`. The Valtio port
mutates the proxy in place (node identity is what makes a tracked snapshot re-render precisely); the
Zustand port rebuilds the touched path with `setPath` and issues **one** `setState` for the whole
batch, because an in-place mutation would notify nobody and would defeat every `Object.is` selector.

Two consequences worth keeping:

- **The port lives on the binding, not on the engine.** One engine per source is mounted app-wide, and
  the stores connected to it may come from different managers — so a Valtio and a Zustand store can
  share the URL in one tree.
- **Consumers never import `@ez-kit/store-persist`.** Each binding package re-exports the consumer
  surface with its own port pre-bound (`@ez-kit/va-store/persist*`, `@ez-kit/zu-store/persist*`), so
  there is exactly one import path per app. The only typed wrapper each binding writes itself is
  `withPersist`, because only it knows how to get from a store handle to its state type.
- **That does not make the re-exported API internal.** What a binding re-exports is public in effect,
  so a breaking change to the engine is a breaking change to every binding that re-exports it, and
  ships as a major in each of them. The four store packages (`store-core`, `store-persist`,
  `zu-store`, `va-store`) nonetheless **version independently** — they reached 1.0 together and go
  their own way from there, so a feature in one binding does not bump the other, and an engine fix
  does not bump a binding it did not change. Do not add a changesets `fixed`/`linked` group for them,
  and do not read two matching version numbers as a compatibility statement: the binding's own
  dependency range on `store-core` / `store-persist` is what says which versions pair.
- **`@ez-kit/store-persist/internals` is the exception, and is NOT re-exported.** It holds the
  engine's assembly primitives (`createPersistEngine`, `createBinding`, `applyPersist`,
  `attachHandles`, `resolveFieldSpecs`, the handle symbols, …) — the pieces a _binding_ is built
  from. Binding a new state manager is not a supported extension point yet, so those names carry no
  semver promise and only this repo's own tests import them. Do not re-add a `./persist/internals`
  subpath to a binding: it was removed deliberately, since it committed us to 22 engine-level names
  with no documented consumer.

  This is unrelated to writing a **custom source adapter**, which is fully public and documented:
  implement `SourcePort` (`get` / `set` / optional `subscribe` over `Keyed`) and ship it as an
  `AmbientAdapter` or a `RenderScopedAdapter`. Every type for that is on the binding's `persist`
  entry — see `apps/docs/content/docs/*/persist/custom-adapter.mdx`.

### Package conventions

- **Store packages are named `<first two letters of the backing library>-store`** — `zu-store`
  (Zustand), `va-store` (Valtio). A future Redux binding is `re-store`, MobX is `mo-store`. The
  directory name, the npm name (`@ez-kit/<name>`), and the docs route (`/docs/<name>`) all match.
- Public API exported exclusively from `src/index.ts`
- Built with `tsup` → ESM output + `.d.ts` declarations into `dist/`
- Each package extends `tsconfig.base.json` and uses `@/*` → `src/*` path alias
- Tests live in `src/**/*.test.ts(x)` or `test/**/*.test.ts(x)`, run with Vitest in jsdom
- Each package has a `size-limit` budget enforced in CI, tuned to roughly its real size plus ~15%
  headroom so a regression actually fails the check. **Every entry `ignore`s the package's own
  runtime `dependencies`**, so the number is the package's own code: a budget that counted
  dependencies answered "how heavy is our dependency tree" and could be blown by someone else's
  release — `@tanstack/table-core` shipping a minor would have failed CI in an unrelated PR. Peer
  dependencies (`react`, `@heroui/*`, `zustand`, …) are excluded by `size-limit` itself, so they
  never counted. A workspace package that depends on another (`data-grid-react` → `data-grid-core`)
  ignores it too — that one has its own budget, and counting it twice hides where growth happened.
  When adding a dependency, add it to the entry's `ignore` list
- Packages declare `"sideEffects": false`

### The public origin lives in one place

The site resolves its own origin at build time from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`
(`apps/docs/lib/shared.ts`), which is "the shortest production custom domain, or vercel.app domain
if no custom domain is available" — so attaching a domain in the dashboard is the entire migration
for `llms.txt`, OG images and canonical links; no origin is hardcoded there.

What a deployment cannot rewrite is published text: npm READMEs, and the `npx shadcn add <url>`
command a reader copies out of a docs code fence. Those name the origin from `site.config.json` at
the repo root, and `scripts/check-site-url.mjs` (first step of `pnpm lint`) fails if any `.md`/`.mdx`
names a different `ez-kit*` origin. Change the domain there, run `pnpm lint`, fix what it lists.
This exists because an aspirational domain sat in a dozen files, install command included, while
resolving nowhere. Note the check has no exception list, so don't write a stale origin in prose
either — describe it, as this paragraph does.

### Where a package's API is documented

Each package's public API lives in its own `README.md` and on https://ez-kit-docs.vercel.app — deliberately not
duplicated here. A copy of an API in this file goes stale faster than anyone updates it, and a stale
copy is worse than no copy: it reads as authoritative while naming exports that no longer exist.

### Docs app architecture

**Runtime UI switching** — `apps/docs/shared/DataGrid.tsx` lazy-loads either `@ez-kit/data-grid-shadcn` or `@ez-kit/data-grid-heroui` based on `DataGridTypeProvider` context. The provider is set by `components/example-renderer.tsx` from the `kit` its `(embed)/examples/<kit>/[slug]` route passes in, so the two kits' routes differ only by that prop. Example components are written **once** and automatically work for both UI kits — there is no duplication.

**Two example conventions** — (1) **data-grid** examples are manifest-based: add the component to `apps/docs/shared/data-grid/examples/components/`, register it in `apps/docs/shared/data-grid/examples/manifest.json` (`id` → `sourceFile` + `exportName`), and — for a **new source file** — add a `sourceFile` → dynamic import entry to `apps/docs/shared/data-grid/examples/registry.ts`. That registry is hand-maintained on purpose: Turbopack cannot statically analyse an import built from a variable path when the targets are `'use client'` components pulled in from a Server Component. It is keyed by `sourceFile`, not `id`, because several ids can share one file. Miss it and the example throws `has no registry entry for "<sourceFile>"` when the page renders — lint, typecheck and build all still pass, so nothing catches it for you. Once registered, the example appears for both shadcn and heroui automatically. (2) **Other packages** (zu-store, va-store) use a flat per-package convention with no registry: drop a file at `apps/docs/shared/examples/<package>/<name>.tsx` and reference it from MDX by its relative path without the `.tsx` extension.

**One file may hold several examples** — the manifest maps each `id` to a `sourceFile` **and** an `exportName`, so several ids can share one file (e.g. `filter-chips.tsx` exports the auto/always/custom variants). Examples are declared as `export function <Name>Example()`; that convention is load-bearing for both the registry lookup and the source panel.

**Documented option names are type-checked** — `apps/docs/test/docs-option-names.test.ts` (helpers in `apps/docs/test/docs-options/`) resolves every option name in the data-grid, form, zu-store and va-store docs' markdown option tables against the **real** exported types, via `ts.TypeChecker.getPropertiesOfType()` on a `ts.Program` built from `apps/docs/tsconfig.json`. Deliberately **not** a grep: `enableSorting`, `enableColumnFilters`, `enableRowSelection` and `manualPagination` all appear literally in `packages/data-grid/core/src/create-table.ts` (the core sets them as _internal_ TanStack options) while being illegal in the public config, so a substring check would bless exactly the defect class this test exists to catch. A fabricated name on a mapped page fails CI with file:line, the bogus name, the legal keys of the governing type, and a "did you mean". Package exports resolve to `./dist`, so the data-grid, form and store packages must be **built** before the test runs — the turbo `test` task's `dependsOn: ["^build"]` already enforces that.

Coverage over the documented packages is **total**: the explicit page → type map in
`apps/docs/test/docs-options/page-type-map.ts` classifies every page under the four scanned roots —
`content/docs/data-grid/**`, `form/**`, `zu-store/**` and `va-store/**` — keyed by file path **plus
the heading above each table** so multiple tables in one file map independently: 114 pages / 90
option tables / 430 checked names today, of which the store packages contribute 43 pages / 24 tables
/ 67 names. Pages with no option table still get an entry with two empty arrays, and that is the
point: while coverage was partial, an unmapped page was checked by nothing, and the two worst pages
in the docs were unmapped ones — `columns/resizing.mdx` documented a `sizing` option that never
existed, and the whole `editing/**` section documented a `meta.editType` / `onCellEdit` API that
never existed. Two guards keep the hole shut: the test **walks the scanned roots on disk** and fails
on any `.mdx` that is in neither `DocPage` nor `DELIBERATELY_UNMAPPED` (so the map cannot fall behind
the docs tree), and `everyPageIsMapped` fails the moment a listed page carries no `PAGE_ENTRIES`
entry. `form/index.mdx` and `form/ai.mdx` are the only deliberate exemptions: every table on them
documents exported symbols or URLs, so an entry would check nothing.

The store pages read their types **through the binding a consumer imports** (`@ez-kit/zu-store`,
`@ez-kit/va-store` and their `/persist` subpaths), not through `@ez-kit/store-core` — that is what
`apps/docs` depends on, and it is what the docs tell a reader to import. Note the two bindings'
generic vocabulary differs, which the map encodes: `zu-store` types are generic over the Zustand
**handle** (`STORE_TYPE_ARGS`), `va-store` types over the **state** object (`STATE_TYPE_ARGS`).

To add a page: verify its tables against the real types by hand, add the path to `DocPage`, and add a
`PAGE_ENTRIES` entry classifying **every** table on the page as either an `optionTables` entry
(governing type + expected name count) or a `nonOptionTables` entry (with a reason) — an
unclassified table fails the test, as does a table whose checked-name count drifts from what's
recorded. Rows that intentionally document a non-key (the literal `false` a per-column slot accepts,
a cache method written with its call signature) go in `OPTION_EXCEPTIONS`, each with its reason.

**e2e locators are checked against the slots the kits render** — `apps/docs/test/e2e-slots.test.ts`
(helper in `apps/docs/test/e2e-slots/`) collects every `data-slot="…"` literal the browser specs
address and every one the three data-grid React packages write onto an element, and fails with
`file:line` on a spec slot no package authors. Both sides are string literals in source and the JSX
attribute _is_ the DOM attribute the selector matches, so comparing the literals compares the
relationship rather than approximating it — but comments are stripped first, since a spec
explaining in prose which slot a kit stamps (HeroUI's `Chip` overwrites the caller's with its own
`chip`) is not addressing it. Package unit tests are excluded from the authored side for the same
reason: they name slots nothing renders. This is a weaker guarantee than
`docs-option-names.test.ts` gives — it cannot say _which_ kit renders a slot, or whether the
element is reachable in the state the spec drives it to — but it is the guarantee that was missing,
and it runs in `verify`. #233 renamed `clear-filters-button` to `clear-filter-button` in all three
packages, touched no spec, and the stale selector matched nothing from the moment it landed. A new
slot assembled at runtime rather than written as a literal is invisible here; a spec that must
address one is the case to reconsider this check, not to widen the regex.

**What a partial import drags in is pinned per export** — `apps/docs/test/tree-shaking.test.ts`
(helper in `apps/docs/test/tree-shaking/`) bundles a package's **built** entry with esbuild, once
per case, and asserts the **complete** set of `@ez-kit/*` entry points the named imports reach.
`sideEffects: false` and ESM output are necessary for tree shaking and nowhere near sufficient: one
top-level call or property read a bundler cannot prove pure anchors everything behind it, and
nothing in the build says so. Both store packages did exactly that — their default cache was a bare
`createStoreCache()` plus a destructure — so importing only `createContextStore` carried the whole
`store-core/cache` graph, ~2 KB gzipped, for a cache the app never mounted. `size-limit` could not
see it: it measures each entry point whole, not what a partial import pulls along.

Each case records the full set rather than a forbidden list, so anything _newly_ reached fails —
a forbidden list only catches the regressions someone already thought of. A module's own path is
not nameable (shared code lands in hash-named chunks), so each one is folded onto the entry point
it sits under, which is the specifier a reader would have to write to import it. The sets are read
against a whole-surface `import *`, without which a bundle that resolved nothing would satisfy
every case. To add one, name the export and run the test — the failure prints the set to record,
and a name the entry does not export fails the bundle outright.

**Live preview vs. source panel** — these come from two different places, which is why an example can render correctly while its source reads wrong (or vice versa). The live preview is an **iframe** of the real `(embed)/examples/<kit>/<slug>` route, so it always executes the actual component. The source panel is **text**: it is read from the file on disk and never executed. Examples render client-only via `next/dynamic` with `ssr: false`, so both kits share one path rather than letting shadcn SSR and heroui silently fall back. The reason originally given for that — a dynamic `require` in the heroui bundle that RSC could not run on the server — is **no longer true** and was corrected on 2026-09-11: `@heroui/react@3.0.3` contains no `require(` at all, and a page rendering the heroui grid through the normal server path prerenders at build time (`next build` marks it `○`, and the emitted HTML carries the full `<table>` and every row). Note `'use client'` was never the mechanism either way: a client component is still prerendered on the server, so the directive cannot skip an SSR a component could not survive. What remains is a choice about the docs — one code path for both kits — not a limitation of the heroui kit, and dropping `ssr: false` is now a live option rather than a blocked one.

### TypeScript

Root `tsconfig.base.json` uses `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. All packages inherit from it.

### Linting

ESLint flat config (`eslint.config.mjs`) with `typescript-eslint` strict + stylistic rules. `import/order` is enforced (alphabetical, grouped by type). Type imports must use `import type`. `--max-warnings=0` is enforced in every package's lint script.
