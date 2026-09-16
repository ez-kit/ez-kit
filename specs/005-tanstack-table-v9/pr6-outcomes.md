# PR 6 outcomes — the tail: AGENTS.md, the READMEs, the changeset, the budgets

Sibling of `pr1-outcomes.md`, `pr2-outcomes.md` and `pr3-outcomes.md`. PR 6 wrote no source code:
its territory was `AGENTS.md`, the packages' `README.md` files, `.changeset/` and the packages'
`size-limit` budgets.

**Commits** (branch `integration/tanstack-v9`, still local — nothing pushed, no PR opened):

| SHA        | Subject                                                                        |
| ---------- | ------------------------------------------------------------------------------ |
| `e6c8ca51` | `docs(agents): record the v9 feature model and make the pinning rule logical`  |
| `94e480aa` | `docs(data-grid): correct the v8-era API claims in the package READMEs`        |
| `32ded1bc` | `chore(changeset): describe the TanStack Table v9 migration's consumer breaks` |

`.github/workflows/ci.yml` is **untouched** — see §5, where design §6's premise turns out to be
false. The `size-limit` budgets are **deliberately left alone** — see §4.

No CI has ever run against this branch: it is unpushed and has no PR, so every figure in this
document is a local measurement.

---

## 1. AGENTS.md — five edits

### 1.1 The pinning entry, rewritten

It read: _"Column `align` is logical (`start` / `end`), column `pinning` is physical (`left` /
`right`). The alignment axis flips under RTL; a pinned column sticks to a viewport edge and does
not."_ That was settled against a model that no longer exists — v9 removed physical `left` /
`right` from `Column.getStart` / `getAfter` / `pin()` entirely.

The replacement states one rule instead of an exception: **a logical vocabulary wherever the axis
flips under RTL — `align`, `Toolbar.start` / `Toolbar.end`, column pinning; a physical one only
where RTL does not apply.** It then records, explicitly, the two things a later audit would
otherwise "fix":

- **Row pinning stays `top` / `bottom`**, and column-logical beside row-physical is **two different
  axes, not an inconsistency** — a vertical axis has no logical names and nothing about it flips.
  Written as "do not unify them, in either direction", because the unification could be attempted
  from either end.
- **The English labels stay `'Pin Left'` / `'Pin Right'` and both kits' glyphs stay `ArrowLeft` /
  `ArrowRight`**, by the `moveStart: 'Move left'` convention already established. Without this the
  key/wording mismatch reads as a missed rename.

The entry also enumerates how far the rename reaches (`ColumnPinSide`, `GridMenuIcon`,
`messages.columnMenu`, `ColumnActionId` **and its string values**, the `data-pinned` /
`data-pin-shadow` values, the `--dg-pin-*` custom properties, `inset-inline-*`), so the next reader
does not have to reconstruct the inventory from `pr3-outcomes.md`.

### 1.2 A new section: "The data-grid's features are composed by the consumer"

Four of the five edits live here, because all four are architecture rather than API vocabulary.

**(a) Features are the consumer's, and config gates behaviour, not presence.** `tableFeatures()`
from `@ez-kit/data-grid-core/features`, `features` required on `TableConfig` and
`UseDataGridConfig` with no default, and — the load-bearing sentence — **`sorting: false` beside a
registered `rowSortingFeature` is not a contradiction and is not a finding.** Without it the next
audit reads the two axes as one and reports a defect. Also recorded: the accepted cost (a
registered-but-disabled feature still creates its slice and APIs), and that a `defaults` layer may
supply `features` optionally while the instance config must name a set — checked against
`DataGridDefaultOptions` rather than assumed, since that type `Omit`s `features` and re-adds it as
optional with its own docblock.

**(b) The grid-own feature guards are RUNTIME-ONLY.** Design §1 promised `sorting: {…}` without
`rowSortingFeature` would be a compile error. It is not, deliberately (`pr1-outcomes.md` §1.1d).
AGENTS.md now says so, with the reason the gate was not built — the named `TS2561` diagnostic the
guard catalogue is built around, and `docs-option-names.test.ts`'s `getPropertiesOfType()` being
unable to resolve through a conditional intersection — and, critically, that **the two core
docblocks' retraction is the current state and not a regression**. Those docblocks
(`core/src/types.ts` on `TableConfig.features`, `create-table-options.ts` on `REQUIRED_FEATURE`)
read as authoritative and each explicitly corrects an earlier revision; an audit finding them
without this entry would "restore" the compile-time claim.

**(c) The component-pinning cost.** Everything below `<DataGrid>` is typed against `GridFeatures`,
which is `TableFeatures` — the widest instantiation (`react/react/src/types.ts:50`). That is what
keeps `TFeatures` out of the component contract and both kits, and it is why the migration's type
cost was bearable; the price is that **a component read is not gated on the feature being
registered**, and core's development-mode `REQUIRED_FEATURE` warning is the only thing that catches
it.

**(d) The `_features` framing.** Verified against the installed package rather than restated: v9's
`_features` is `readonly _features: Partial<CoreFeatures> & TFeatures` on
`coreTablesFeature.types.d.ts:140` — a **member of the constructed table instance**, resolved from
the `features` option, not a table option itself (the brief called it an option; the entry says
what is actually there). So "add it to `_features`" is stale twice over: it was v8's internal
registration array, and the surviving name means something else.

**Where the stale framing actually lives.** AGENTS.md contained no `_features` mention at all. A
repo-wide grep over markdown finds exactly two, both in
`docs/superpowers/plans/2026-09-12-data-grid-row-ordering.md:750` and
`docs/superpowers/plans/2026-08-24-data-grid-deferred-apply.md:327,330`. Those are dated records of
work as it was done, and rewriting them would falsify history, so AGENTS.md names them and says to
read their instructions as history rather than as the mechanism. They are also outside PR 6's
territory.

---

## 2. READMEs — what was wrong

### 2.1 The live consumer-facing error

`packages/data-grid/core/README.md:38` — _"Read `table.getRowModel()`, drive state via
`table.setState(...)`"_. **`setState` does not exist.** It was deleted in PR 1 along with
`getState`, `subscribe`, `getSnapshot`, `getInitialSnapshot`, `notifyStateSubscribers` and
`syncControlledState`, and v9 has no equivalent pair — state moved to atoms. This is published npm
text, so it is the one README error a consumer hits directly.

Replaced with what is actually there, taken from `create-table.ts`'s own docblock and checked
against the installed types: `table.store.state` / `table.store.subscribe(fn)` (the `ReadonlyStore`
carries both `.state` and `.get()`), `table.atoms.<slice>.get()`, `table.initialState`, the setters
a registered feature installs, and `onStateChange` to mirror into your own store.

### 2.2 The error in all four

**Every usage example constructed a grid with no `features`**, which is now a required field — so
each was a compile error as written. All four gained the set they need plus a short "Feature
composition" section: `@ez-kit/data-grid-core/features` as the one import path, registering ≠
enabling, and configuring an unregistered feature being a silent no-op.

The example shape follows what PR 4 settled in the docs app (`tableFeatures({…})` at module scope,
imported from `@ez-kit/data-grid-core/features`) rather than inventing a second convention.

### 2.3 Two facts stated rather than papered over

- **heroui's _"you never need `@ez-kit/data-grid-react` or `@ez-kit/data-grid-core` as a second
  dependency — not even to name a type"_ is no longer true.** The feature **values** are
  deliberately not re-exported by the kits or by `@ez-kit/data-grid-react` (re-exporting a feature
  is what would put it in every consumer's bundle), so composing a set needs
  `@ez-kit/data-grid-core` as a direct dependency. The sentence now carries that one exception.
- **`shadcn add` does not install `@ez-kit/data-grid-core`.** `registry.config.mjs:38-47` lists
  `@ez-kit/data-grid-react` and seven third-party packages and nothing else, so a consumer who
  copied the kit cannot resolve `@ez-kit/data-grid-core/features` — the import every example now
  needs. **This is a real install gap created by the migration, and PR 6 did not close it:**
  `registry.config.mjs` is the kit's file, not PR 6's territory. The README says so plainly rather
  than shipping an example a reader cannot run. **Open item for whoever owns the kit** — either add
  the package to the registry's `dependencies`, or give the kits their own `/features` re-export
  and revisit the bundle argument.

### 2.4 The rest of the sweep found nothing

`getState`, `setState`, `columnSizingInfo`, `VisibilityState`, `sortingFn`, `pinLeft` / `pinRight`,
`columnPinning`, a physical pin value: no other package README names any of them. The
`getState` / `setState` / `subscribe` hits in `zu-store`, `va-store`, `store-core` and
`store-persist` are Zustand's own API and unrelated. `sortingFn` does not appear anywhere in
`packages/data-grid` — design §5's "`sortingFn` → `sortFn` in every spelling" was about internals;
the public column option is and remains `sorting.fn`, so there is no consumer rename to report.

---

## 3. The changeset

Two files, both **`minor`**, both verified with `node scripts/check-changesets.mjs` and
`pnpm exec changeset status`.

### 3.1 The two traps, and the evidence each was avoided

**`major` on `0.x` publishes `1.0.0`.** Every entry is `minor`. `changeset status` reports the
pending majors as `@ez-kit/zu-store`, `@ez-kit/va-store`, `@ez-kit/store-persist` and
`@ez-kit/store-core` — the pre-existing, deliberate `stores-1-0.md` cut — and **no data-grid
package among them**. That output is the check, not the intention.

**`@ez-kit/data-grid-shadcn` never appears.** Absent from both files.
`node scripts/check-changesets.mjs` passes. The kit's breaks ship through
`@ez-kit/data-grid-react` and, for the registry payload, `@ez-kit/docs`.

`@ez-kit/docs` is private but **not** in `ignore`, so naming it is legal (changesets' default
`privatePackages.version` is `true`): it is versioned and never published, which is exactly the
behaviour wanted for a break whose only released surface is the registry JSON the site serves.
`changeset status` confirms it resolves.

### 3.2 `.changeset/tanstack-table-v9.md` — core, react, heroui

Named because each is a consumer-visible statement, not because it happened:

| Break                                                                                                         | Source                                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `features` is required; `@ez-kit/data-grid-core/features` is a new entry point                                | pr1 §1; verified against `package.json` `exports` |
| registering ≠ enabling, and configuring an unregistered feature is a **silent no-op**                         | pr1 §1.1d                                         |
| **design §1's compile-time gate is a spec claim not delivered** — said plainly, not dropped                   | pr1 §1.1d, and the brief's explicit instruction   |
| `getState` / `setState` and the five store methods are gone; atoms replace them                               | pr1 §2.3                                          |
| `columnSizingInfo` → `columnResizing` in `TableState`                                                         | pr2 §1.1g                                         |
| `VisibilityState` → `ColumnVisibilityState`, **no alias**                                                     | pr2 §1.1e                                         |
| `ReactSelectionConfig` / `ReactExpandingConfig` gained a leading `TFeatures`                                  | pr2 §1.1f                                         |
| `DataTable` from the react entry is the React table, not core's                                               | `react/src/index.ts` diff vs `f5f9ca88`           |
| `ResolvedGridOptions` gained `pagination.enabled`, `rowActions`, `direction`, `pinning.rowConfig`             | pr2 §1.1d                                         |
| `createTableOptions`, `createAppliedEmitter`, `createDraftAtoms` + their types are new public exports on core | pr1 §1, pr2 §1.1a                                 |
| **a controlled write to a deferred axis no longer lands**                                                     | pr1 §4.4, pr2 §1.1b                               |
| `deleting: true` now warns instead of silently doing nothing                                                  | pr2 §1.3                                          |
| keyboard column reordering works under RTL                                                                    | pr2 §1.2                                          |
| a plain TanStack table elsewhere in the project no longer gets `state.editing` declared and lying             | pr1 §1                                            |

### 3.3 `.changeset/column-pinning-logical.md` — core, react, heroui, docs

The rename is written as **eight** things to edit, in two groups, because they fail differently:
the five API breaks (option value, `columnPinning` state shape, icon-map key, message override,
`ColumnActionId` **and its string values**) and the three DOM/CSS ones (`data-pinned` /
`data-pin-shadow` values, the `--dg-pin-*` custom properties, `inset-inline-*` positioning) that
land on anyone who ran `npx shadcn add` or styles the grid themselves — which design §5 requires be
said "in those words".

Two are called out as **failing silently**: `columnPinning: { right: [...] }` is accepted and
merges to "nothing pinned", and a CSS custom property that no longer matches falls back rather than
erroring. The message-override case is described as silent too, per `pr3-outcomes.md` §5's ruling
that T2 was never established and the worst should be assumed.

It also records that row pinning is unchanged, that the English labels are unchanged on purpose,
and that `direction: 'rtl'` does not lay the page out (pr3 §1.1d).

### 3.4 The unconsumed `grid-context-option.md` — checked, left alone

It still describes reality. `GridContext` is still the empty exported interface extended by
declaration merging (`grid-context.tsx:47`), `useGridContext()` still has both the whole-object and
selector forms (`:187-210`), and the three option layers are unchanged. The only rename —
`GridContextStore` → `GridContextAtom` — **does not appear in that changeset's text at all**, so
there was nothing to correct, and per `pr2-outcomes.md` §1.1c it must not be added: `GridContext`
has never shipped, so no released version names either spelling and there is nothing for a consumer
to migrate.

---

## 4. Size budgets — deliberately left, with one measurement

**PR 4 has not landed.** At the time of writing the worktree carries ~100 uncommitted modified
files under `apps/docs/shared/**`, and `pnpm --filter @ez-kit/data-grid-react typecheck` still
fails on the generic-variance family (`3c259be1` records the split, 55 remaining). `build`'s `dts`
half fails with it, so **`@ez-kit/data-grid-react` produces no `dist`, and `size-limit` has nothing
to measure** — for it or for `@ez-kit/data-grid-heroui`, which builds against it. Writing a figure
there would be writing a number nobody has measured.

What was measured: **`@ez-kit/data-grid-core` is green and within budget**, unchanged from PR 1's
re-measurement — `index` 10.65 kB against 12.5 kB, `features` 4.66 kB against 5.5 kB, i.e. ~17% and
~18% headroom against AGENTS.md's ~15% rule. Nothing to restate.

**Still open, and inherited rather than done:** `pr2-outcomes.md` §1.4 asked PR 3 or PR 6 to drop
`@tanstack/react-store` from `@ez-kit/data-grid-react`'s five `size-limit` `ignore` lists — it is
not a dependency and nothing imports it (grep finds the name only inside docblocks in
`grid-context.tsx` and core). PR 6 left it: the edit is provably inert only if it can be measured
either side, and the package does not build. It changes no number today and should go with the
budget re-measurement, under the ledger's rule that whichever task first _imports_ `@tanstack/store`
re-adds it with its `ignore` entries.

**Whoever closes the react typecheck owns the budget pass** for `@ez-kit/data-grid-react` and
`@ez-kit/data-grid-heroui`: re-measure, set to roughly measurement + 15%, and drop the dead ignore
in the same commit.

---

## 5. Design §6's e2e trigger — the premise is false, and acting on it would have broken CI

Design §6 says: _"For the duration of this work, `integration/tanstack-v9` is added to the `e2e`
trigger and removed again in the last PR."_ **It was never added, and there is nothing to remove.**

Measured, not inferred:

- `git diff f5f9ca88..HEAD -- .github/workflows/ci.yml` is **empty**. The file has not been touched
  by this migration at all.
- `.github/workflows/ci.yml:7` already triggers the whole workflow on
  `branches: [develop, main, 'integration/**']`, with a comment saying exactly why: slice PRs target
  `integration/**` and must get the same gate.
- The `e2e` job's condition is
  `if: github.base_ref != 'main' && github.head_ref != 'changeset-release/develop'`. It **never**
  restricted the suite to `develop`; it excludes the release PR and the version PR and nothing else.

Because that condition is an **AND of two exclusions**, there is no clause a later PR could delete
to "restore" anything. Anyone acting on design §6 could only have _added_ a restriction — turning
the browser suite **off** on this branch, which is the opposite of what §6 wanted and a repeat of
#233, the failure §6 exists to prevent. `ci.yml` is untouched.

---

## 6. What PR 6 could not do

1. **The budgets for `@ez-kit/data-grid-react` and `@ez-kit/data-grid-heroui`** — §4. Blocked on the
   react package's typecheck/build, which is PR 4's and PR 5's residue and belongs to nobody yet.
2. **The shadcn install gap** — §2.3. `registry.config.mjs` does not carry
   `@ez-kit/data-grid-core`, so a `shadcn add` consumer cannot import the features entry. Outside
   PR 6's territory; documented in the README and named here.
3. **Nothing was verified by CI.** The branch is unpushed and has no PR. Core's `typecheck` and
   `size` were run locally, `check-changesets.mjs`, `check-site-url.mjs`, `changeset status` and
   Prettier were run locally, and that is the whole evidence base.
