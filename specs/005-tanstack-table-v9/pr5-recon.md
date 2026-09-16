# PR 5 reconnaissance — the browser suite on v9

**Date:** 2026-09-16
**Branch:** `integration/tanstack-v9`, worktree `/Users/sergejolcev/orca/workspaces/ez-kit/data-grid-bump`
**Tree read at:** `91f23b38` (`docs: record the PR 3 pinning inventory taken against the tree`).
**Method:** static read only. No `playwright`, no `tsc`, no `vitest`, no `eslint`, no `build` was run.
PR 3 (`packages/data-grid/**` + the pinning e2e cases) and PR 4 (`apps/docs/**`) are being written by
other agents in this same worktree **right now**, so every line number below is true of `91f23b38`
and may have moved by the time PR 5 starts. Re-derive before editing; the file paths are stable, the
line numbers are not.

---

## 0. The three findings that change the shape of PR 5

Read these before the inventory; two of them contradict the design document.

1. **The temporary `e2e` trigger design §6 asks for does not need to be added, and PR 6 has nothing
   to remove.** `.github/workflows/ci.yml:7` already triggers on `branches: [develop, main,
'integration/**']`, and the `e2e` job's `if:` (`ci.yml:78`) excludes only `base_ref == 'main'`
   and `head_ref == 'changeset-release/develop'` — it does **not** restrict to `develop`. A PR into
   `integration/tanstack-v9` therefore already runs the full three-job matrix. Verified twice:
   `git diff f5f9ca88..HEAD -- .github/workflows/ci.yml` is **empty**, and `git show
f5f9ca88:.github/workflows/ci.yml` carries the same trigger and the same `if:`. Design §6's
   premise ("the browser suite runs only on PRs into `develop`") was already false when it was
   written. See §2.
2. **No CI has run for this migration at all, and not because of the trigger.** `origin/integration/tanstack-v9`
   does not exist (`git rev-parse` → `unknown revision`) and `gh pr list --state all` shows nothing
   for this branch: the newest PR is #245. PRs 1-3 are **local commits on an unpushed branch**
   (`91f23b38 ← 4a7009a0 ← f8fa600c ← cf14f78f ← c449d02b ← e7ba4259`), not GitHub PRs. The "PR"
   numbering in `plan.md` / `design.md` is a sequencing convention. Whatever PR 5 concludes about
   `ci.yml`, **e2e has never executed against v9**, and the avalanche design §6 was trying to avoid
   is already fully loaded.
3. **PRs 1 and 2 changed no DOM contract whatsoever.** `git diff f5f9ca88..HEAD -- 'packages/data-grid/**'`
   filtered to `data-*=` attribute literals yields exactly **three** lines, and two of them are one
   edit in a test helper (`table.getState()` → `table.store.state` on a `data-testid='page-index'`
   span) plus one new assertion on `data-system-column='actions'`. Not one `data-slot`, `data-pinned`,
   `data-align`, `data-sticky`, `data-scrollport` … literal moved. Spot-checked the other direction
   too: all fifteen non-slot attributes the specs address are still authored in the three packages
   (`data-scrollport` 3 sites, `data-virtualized` 14, `data-virtual` 23, `data-sticky` 16,
   `data-resizable` 2, `data-row-selected` 6, `data-expanded-row` 6, `data-depth` 24,
   `data-creating-row` 2, `data-loading-row` 4, `data-system-column` 27, `data-chip-kind` 3,
   `data-has-value` 3, `data-sort-direction` 3, `data-align` 22).

   **So PR 5 is not a "fix the broken selectors" PR.** The only DOM change in the whole migration is
   PR 3's pinning values, and PR 3 owns both sides of it. PR 5's real content is (a) _running_ the
   suite for the first time, (b) the coverage that the migration's behaviour changes leave uncovered,
   and (c) the fail-open checks nobody has.

---

## 1. The suite as it stands

### 1a. Shape

`apps/docs/playwright.config.ts` defines **three projects** (`:54-63`):

| Project  | `testDir`    | `testIgnore`     | Notes                                                                 |
| -------- | ------------ | ---------------- | --------------------------------------------------------------------- |
| `docs`   | `./e2e/docs` | —                | The site itself. Runs once; nothing kit-agnostic about it (`:56-61`). |
| `shadcn` | `./e2e`      | `/e2e\/docs\//u` | From `KITS` (`e2e/kits.ts:11`), via `kitProjects` (`:28-35`).         |
| `heroui` | `./e2e`      | `/e2e\/docs\//u` | Same specs, `use: { kit }` differs.                                   |

`fullyParallel: false`, `workers: 1` (`:42,44`) — deliberate: several specs measure geometry
(`pinning/columns.spec.ts:50-62`, `layout/sticky.spec.ts:39-78`, `columns/resizing.spec.ts`), and
parallel workers on a shared runner make those measurements disagree with themselves
(`ci.yml:60-64`). `retries: 1` in CI (`:44`).

A spec never names a kit: it asks for the `grid` fixture (`e2e/fixtures.ts:147-154`) and the project
decides which kit that is. The whole contract is `@ez-kit/data-grid-react`'s `data-*` attributes
(`fixtures.ts:6-17`).

### 1b. Every spec file

32 files. Counts are `test(` declarations, not executions.

**`docs` project (runs once) — 8 cases, 2 files**

| File                                         | Cases | Covers                                                                                                   |
| -------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| `apps/docs/e2e/docs/embed-isolation.spec.ts` | 5     | The `(embed)` routes carry no site chrome; console/network isolation. Uses `setTimeout` at `:52,82,101`. |
| `apps/docs/e2e/docs/pages.spec.ts`           | 3     | `/docs/data-grid` 200 + `h1`; the flavour toggle on getting-started; the sidebar.                        |

**Kit-agnostic (runs ×2) — 241 cases, 29 files**

| File                                    | Cases | Example(s) driven                                                                                      |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `columns/alignment.spec.ts`             | 2     | `column-footers` (`:22`)                                                                               |
| `columns/cell-types.spec.ts`            | 10    | `cell-types` (`:17`), `date-cell-view` (`:100`)                                                        |
| `columns/column-panel.spec.ts`          | 8     | `column-panel-ordering` (`:17`)                                                                        |
| `columns/ordering.spec.ts`              | 10    | `column-ordering` (`:20`)                                                                              |
| `columns/resizing.spec.ts`              | 11    | `resizing-on-change` (`:18`), `resizing-on-end` (`:19`)                                                |
| `columns/visibility.spec.ts`            | 12    | `column-visibility` (`:14`)                                                                            |
| `contract/row-slot.spec.ts`             | 1     | Table-driven over 5+ examples (`:82,99,100,104`) — every row-bearing surface carries `data-slot="tr"`. |
| `editing/creating.spec.ts`              | 15    | `creating-pin-row` (`:20`), plus row/dialog modes                                                      |
| `editing/deleting.spec.ts`              | 6     | `delete-confirmation` (`:16`)                                                                          |
| `editing/editing.spec.ts`               | 15    | row / cell / dialog edit                                                                               |
| `expanding/expanding.spec.ts`           | 18    | sub-content, tree sub-rows                                                                             |
| `fallbacks/fallbacks.spec.ts`           | 7     | `fallbacks` (`:17`) — loading / empty / no-results                                                     |
| `filtering/chips.spec.ts`               | 7     | chip strip auto/always/custom                                                                          |
| `filtering/panel.spec.ts`               | 6     | the filter panel in toolbar / footer                                                                   |
| `layout/scrollport.spec.ts`             | 2     | `data-scrollport` resolution                                                                           |
| `layout/sticky.spec.ts`                 | 4     | `sticky-footer` (`:14`), `column-footers` baseline (`:16`)                                             |
| `localization/messages.spec.ts`         | 8     | `localization` (`:22`)                                                                                 |
| `ordering/rows.spec.ts`                 | 13    | row drag/keyboard reordering                                                                           |
| `pagination/infinite-scroll.spec.ts`    | 12    | `infinite-scroll-auto` (`:43`), `-manual` (`:84`), `-virtualized` (`:120`), `-reset` (`:158`)          |
| `pagination/page-sizer.spec.ts`         | 4     | toolbar / footer placement                                                                             |
| `pagination/paging.spec.ts`             | 12    | pager controls, ellipsis, summary                                                                      |
| `pinning/columns.spec.ts`               | 3     | `column-pinning-static` (`:13`) — **PR 3's**                                                           |
| `pinning/rows.spec.ts`                  | 3     | `row-pinning-initial` (`:12`) — row axis, unaffected                                                   |
| `row-actions/row-actions.spec.ts`       | 16    | inline / menu / mixed; row-pin menu at `:51-59,118-126,145-147`                                        |
| `selection/selection.spec.ts`           | 9     | checkbox selection + the selection bar                                                                 |
| `sorting/sorting.spec.ts`               | 6     | `base-sorting` (`:15`)                                                                                 |
| `state/controlled.spec.ts`              | 4     | `controlled-state` (`:13`)                                                                             |
| `state/persistence.spec.ts`             | 7     | `state-persistence` (`:15`)                                                                            |
| `virtualization/virtualization.spec.ts` | 10    | `virtualized` (`:18`)                                                                                  |

**Tagged `@smoke`, excluded from every CI run — 1 file, 1 templated case**

`apps/docs/e2e/smoke.spec.ts:67-79` generates one test per manifest id per kit: **111** data-grid ids

- **37** form ids = 148 ids, ×2 kits = **296 executions**. Tagged `@smoke` (`:67`) and skipped by
  both `--grep-invert @smoke` invocations. Its docblock (`:12-21`) says exactly what it is for: "A
  missing `registry.ts` entry throws `has no registry entry for '<sourceFile>'` when the page renders
  and is invisible to lint, typecheck and build … Run it before touching the manifest, a registry, or
  either kit's blocks." **PR 4 is rewriting all 111 data-grid examples right now.** See §4 gap G1.

**Totals: 32 spec files, 250 `test(` declarations (249 non-smoke), 490 CI executions
(8 docs + 241×2 kits).**

### 1c. Invocation

| Where            | Command                                                                                                | Source                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Local, default   | `pnpm --filter @ez-kit/docs test:e2e` → `playwright test --grep-invert @smoke`                         | `apps/docs/package.json` `scripts.test:e2e` |
| Local, smoke     | `pnpm --filter @ez-kit/docs test:e2e:smoke` → `playwright test --grep @smoke --workers=4`              | same                                        |
| Local, snapshots | `test:e2e:update` → `… --update-snapshots`                                                             | same                                        |
| CI, per project  | `pnpm --filter @ez-kit/docs exec playwright test --project=${{ matrix.project }} --grep-invert @smoke` | `ci.yml:110`                                |

The web server differs by environment (`playwright.config.ts:64-77`): locally `PORT=… pnpm dev`
(which runs `build:deps` + `registry:build` first) with `reuseExistingServer: true`; in CI
`PORT=3000 pnpm start` against an already-built tree, because `next dev` compiles each route on
first request and turns the first test to touch a page into a timeout that looks like a product
failure. `PW_PORT` overrides the per-worktree hashed port (`:8-16`) — **relevant here**: several
worktrees are live, so a local run must target this one's server.

CI job steps (`ci.yml:86-121`): checkout → pnpm → node from `.nvmrc` → `pnpm install --frozen-lockfile`
→ `playwright install --with-deps chromium` → `pnpm --filter @ez-kit/docs build` → run → upload the
HTML report on failure only.

---

## 2. The temporary CI trigger

**(a) Has it been added? No — and it is not needed.**

`.github/workflows/ci.yml` is **byte-identical** to the migration's base commit
(`git diff f5f9ca88..HEAD -- .github/workflows/ci.yml` → empty output). The trigger already covers
integration branches:

- `ci.yml:4-7` — `on: pull_request: branches: [develop, main, 'integration/**']`, with the comment
  "`integration/**` are per-feature holding branches: epic-flow slice PRs target them, so they must
  get the same `verify` gate as PRs into develop/main."
- `ci.yml:78` — the `e2e` job's only gate is
  `if: github.base_ref != 'main' && github.head_ref != 'changeset-release/develop'`.

For a PR into `integration/tanstack-v9`, `base_ref` is `integration/tanstack-v9` (≠ `'main'`) and
`head_ref` is a feature branch (≠ `changeset-release/develop`), so **`e2e` runs, all three matrix
legs**. Design §6's statement that "The browser suite runs only on PRs into `develop`" is false and
was false at `f5f9ca88`. AGENTS.md's "A PR into `develop` is additionally gated on the browser suite,
through the `e2e gate` job" is about which check is **required by branch protection**, not about
which PRs the job _runs_ on — the two were conflated.

**(b) The precise edit needed: none.** Do not add `integration/tanstack-v9` anywhere in `ci.yml`.
Adding it to `on.pull_request.branches` would be a no-op (`integration/**` already matches). Adding
it to the `e2e` job's `if:` would only ever _narrow_ the condition, since `if:` is an AND of the
existing terms — i.e. a well-meant edit there can only turn e2e **off**.

**(c) PR 6 has nothing to remove.** Design §7 row 6 lists "remove the temporary e2e trigger" as PR 6
content. Strike it. PR 6 should instead record in this spec directory _why_ it was struck, or the
next reader re-adds it.

**(d) Does `e2e gate` still behave correctly? Yes, and it was never at risk.** `e2e-gate`
(`ci.yml:123-144`) has a fixed name, `needs: e2e`, `if: always()`, and a shell step that passes on
`success` or `skipped` and fails on everything else (`:142-144`). Nothing about the branch name
enters that logic. The one thing worth stating plainly: on a PR into `integration/**`, `e2e gate`
**reports** but is almost certainly **not required** by branch protection (protection rules are
configured per-branch on GitHub and the repo's are documented only for `develop` and `main` —
AGENTS.md, "Branching & Release Flow"). So a red `e2e` on an integration PR is visible and does not
block. That is the correct arrangement for intermediate PRs, per design §7's accepted constraint,
but it means **PR 5 must read the run, not merely open the PR.**

**The real gap (b′):** per §0.2 the branch is unpushed and no PR exists, so none of this has fired.
PR 5's first task is therefore mechanical and unavoidable: **push the branch, open a PR into
`integration/tanstack-v9` (or run the suite locally), and read the result.** Everything below is
written against a suite that has never executed once on v9.

---

## 3. What v9 broke in the specs

Short answer: **one spec, two lines, and PR 3 owns both.** Verified two ways — the attribute-literal
diff in §0.3, and a direct grep of `apps/docs/e2e/**` for every name the migration renamed.

### 3a. Genuinely broken (PR 3's, listed for completeness)

| `file:line`                                                   | What                                                       | Why it breaks                |
| ------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| `apps/docs/e2e/packages/data-grid/pinning/columns.spec.ts:30` | `toHaveAttribute('data-pinned', 'left')`                   | The value becomes `'start'`. |
| `apps/docs/e2e/packages/data-grid/pinning/columns.spec.ts:33` | `[data-slot="tbody"] [data-slot="td"][data-pinned="left"]` | Same.                        |

`columns.spec.ts:31` (`not.toHaveAttribute('data-pinned', /.*/u)`) and `:39` (bare `[data-pinned]`)
are value-free and survive. `pinning/rows.spec.ts:24,26,27` and `row-actions/row-actions.spec.ts:126`
are the **row** axis (`'top'` / `'bottom'`), which v9 does not touch (design §5, "Not renamed").

These two lines pair with `apps/docs/shared/data-grid/examples/components/pinning/static-column.tsx:11`
(`pinning: 'left'`), the example the spec opens. PR 3's Task 7 takes all three together.

### 3b. Searched for and **not** found — the renames that reach no spec

Grepped `apps/docs/e2e/**` for every renamed name in design §5 plus PR 2's list:

- `columnSizingInfo` / `columnResizing` — **zero matches.** PR 2 §1.1g renamed the two layout
  subscriptions (`table.tsx:127`, `header.tsx:129`); no spec names either slice.
  `columns/resizing.spec.ts` drives a real pointer sequence (`:45-56`) and measures a body cell's
  width (`:35-37`), so it is behaviour-level and blind to the state-slice name. It survives.
- `sortingFn` / `sortFn` — **zero matches** in `e2e/**`.
- `VisibilityState` / `ColumnVisibilityState` — **zero matches**. Specs read the DOM, not types.
- `table.getState()` — **zero matches** in `e2e/**`. (It survives in
  `apps/docs/content/docs/data-grid/editing/creating.mdx:73`, which is PR 4's — pr2-outcomes §3.1.)
- `ColumnPinSide` / `pinLeft` / `pinRight` / `pin-left` / `pin-right` / `Pin Left` / `Pin Right` /
  `Закрепить` — **zero matches in `e2e/**`**. This is worth a sentence: `ColumnActionId`'s
`'pin-left'`/`'pin-right'`DOM ids (pr3-recon T4) and the`columnMenu.pinLeft`/`.pinRight`
  message labels are addressed by **no browser case at all**. See §4 gap G4.
- `--dg-pin-*` — **zero matches**. No spec reads a CSS custom property.

### 3c. The fail-open shapes — assertions that pass whether or not the thing exists

This is the section that matters, and it is larger than the two broken lines.

**F1 — `columns.spec.ts:31` is a passing assertion about a renamed attribute.**
`not.toHaveAttribute('data-pinned', /.*/u)` on the _free_ column passes when the attribute is absent
— and also when the whole grid failed to render pinning, when the column id changed, and when the
example stopped pinning anything. It is the negative half of `:30`; if `:30` is fixed and `:33` is
not, `:31` still passes and contributes nothing. Value-free negatives are only meaningful beside a
value-ful positive in the same test.

**F2 — 107 `toHaveCount(0)` / `not.toHaveAttribute` / `not.toEqual` assertions across
`e2e/packages/**`, 84 of them `toHaveCount(0)`.** Every one passes when the locator matches nothing
for the *wrong* reason — a renamed slot, a crashed example, a page that never rendered. The suite is
mostly protected by structure (a `beforeEach`opening the example and`fixtures.ts:79`
`expect(page.locator('table')).toBeVisible()`), which is a real guard: an example that fails to
render fails in `beforeEach`, not in a silently-satisfied negative. The exceptions are the tests that
assert an absence _as their whole subject_:

| `file:line`                                                      | Assertion                                                        | Why it cannot fail on its own                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `row-actions/row-actions.spec.ts:93,94,95`                       | `button(cell, 'Edit'/'Delete'/'Row pinning')` → `toHaveCount(0)` | The "actions column is absent" test. Passes if the cell locator itself broke. |
| `row-actions/row-actions.spec.ts:46,61,140,147`                  | same shape                                                       | ditto                                                                         |
| `columns/ordering.spec.ts:112,113`                               | `menuItem(page, MOVE_START/MOVE_END)` → `toHaveCount(0)`         | Passes if the menu never opened.                                              |
| `columns/visibility.spec.ts:68,124`                              | `toHaveCount(0)` on a toggle / `Hide` menu item                  | ditto                                                                         |
| `pagination/paging.spec.ts:127,128`                              | ellipsis and `Go to first page` absent                           | ditto                                                                         |
| `filtering/panel.spec.ts:90`, `pagination/page-sizer.spec.ts:62` | `[data-slot="toolbar"] <X>` absent                               | The placement tests. A renamed `toolbar` slot makes both pass.                |
| `columns/resizing.spec.ts:68,69`                                 | `active` has no handle                                           | Passes if `active` stopped being a column.                                    |
| `layout/sticky.spec.ts:84`                                       | `not.toHaveAttribute('data-sticky','true')`                      | Passes if `thead`'s slot moved.                                               |

Several of these carry a paired positive in the same test, which is the right pattern — and
`layout/sticky.spec.ts:54-55,74-77` says so explicitly ("The rows really moved — otherwise the header
standing still would prove nothing … it is how this assertion survived `stickyFooter` being switched
off"). The list above is the set that does **not**. Auditing them is a PR 5 task (T6) rather than a
migration fix, but the migration is exactly the event that turns one of them into a silent hole.

**F3 — `fixtures.ts:130-134` `boxOf` is the pattern the rest should follow.** It throws on a `null`
bounding box instead of `?? 0`, with the reason recorded: "two missing elements then 'agree' and a
measurement test passes while measuring nothing. This is how a sticky-footer assertion kept passing
after the footer stopped being sticky." Every geometry assertion already routes through it. Nothing
to fix; cite it as the standard when writing T5's RTL and controlled cases.

**F4 — `e2e-slots.test.ts` gives zero cover over attribute _values_.** Confirmed by reading
`apps/docs/test/e2e-slots/slot-literals.ts:16`: the regex is
`/data-slot=["']([a-z0-9-]+)["']/g` — `data-slot` only, name only. `data-pinned`, `data-pin-shadow`,
`data-align`, `data-sort-direction` and every other attribute are outside it entirely, as are all
values. pr3-recon §5 / T8 is correct. See §5.

---

## 4. Coverage gaps this migration creates

Ordered by risk. Not PR 3's RTL pinning cases (design §5, PR 3 Task 8) and not PR 4's
`tree-shaking.test.ts` cases (design §4) — those have owners.

**G1 — `@smoke` is excluded from CI, and PR 4 is rewriting all 111 data-grid examples. (highest risk)**
`ci.yml:110` and both `test:e2e` scripts pass `--grep-invert @smoke`, so `smoke.spec.ts` — the only
check that opens every example — has never run in CI and will not run on the final PR either. Its own
docblock (`smoke.spec.ts:12-21`) names the exact defect it catches: a missing `registry.ts` entry
throws only at page render and is invisible to lint, typecheck **and build**. The 29 kit-agnostic
specs between them drive **22 of 111** data-grid example ids (§1b, "Example(s) driven"). The other
89 — every example PR 4 rewrites and no spec opens — are checked by nothing in CI.

The _mechanism_ is not hypothetical here: PR 4 must add a `registry.ts` entry for every new source
file, hand-maintained (AGENTS.md, "Two example conventions"), and PR 3's own Task 8 adds a new RTL
example that needs one. **PR 5 must run `pnpm --filter @ez-kit/docs test:e2e:smoke` for both kits
at least once**, after PR 4 lands, and decide whether it becomes a job. It is ~296 page loads and
the suite's docblock explicitly calls it "a barrier, not a CI job" — running it once inside PR 5 and
recording the result is the proportionate answer; making it a permanent job is a separate decision.

**G2 — "a controlled write to a deferred axis no longer lands" is covered by nothing.**
pr2-outcomes §1.1b calls it "a **real public behaviour change**" needing "its own sentence in the
changeset". The two halves of it exist as separate examples and neither is exercised together:
`controlled-state` (`e2e/packages/data-grid/state/controlled.spec.ts:13`, 4 cases) is controlled but
**not** deferred — reading `apps/docs/shared/data-grid/examples/components/controlled-state.tsx`,
it carries `sorting`/`pagination` in the page's `useState` and no `draft`. `production-deferred-apply`
(`components/production/ProductionDeferredApplyExample.tsx:22`) is deferred (`draft`) but explicitly
**not** controlled on those axes — its own docblock at `:13` says "Nothing is fed back down through
`state` on the three deferred axes — the draft is grid-owned." **There is no example, and no case,
where a controlled write meets a deferred axis.** The behaviour change is therefore invisible to the
whole suite and to the jsdom suites too. A new case here is the single highest-value addition PR 5
can make, because it is the one change in the migration a consumer will hit and the repo cannot see.

**G3 — deferred apply has no browser coverage at all.** `production-deferred-apply` is driven by no
spec (`grep -rn "deferred" apps/docs/e2e/` matches nothing; the id does not appear in the "Example(s)
driven" column). Design §7 notes characterization coverage exists in
`deferred-apply.test.ts` (core, jsdom). But PR 2 also left
`header-cell.tsx`'s `applied` read with **no subscriber**, so `data-draft-sorting` does not clear
when `draft.apply()` runs (pr2-outcomes §2.3) — "pre-existing and identical under v8, covered by no
test". That is a marker a browser case could see and no unit test does. Whether PR 5 fixes it is PR 3/4's
call; whether PR 5 _covers_ it is PR 5's.

**G4 — the column-menu pin entries are covered by nothing, in either language.** §3b: no spec names
`Pin Left`, `Pin Right`, `pin-left`, `pin-right` or `Закрепить`. `localization/messages.spec.ts:65-74`
opens the column menu but asserts only `Скрыть` (Hide), and says why at `:70-73`: "the ordering and
pinning sections are likewise off, so their translated entries have nothing to render into." So PR 3
renames `ColumnActionId.PinLeft` → `PinStart` (DOM id `'pin-left'` → `'pin-start'`, pr3-recon T4) and
`messages.columnMenu.pinLeft` → `pinStart` (T2, where a stale key may be silently accepted by a deep-
`Partial` messages type) with **no browser assertion on either side**. The `row-actions` spec proves
the pattern is writable — `:51-59` asserts `Pin Top` / `Pin Bottom` menu items by accessible name. A
column-menu equivalent is a small, high-value case, and it is the only thing that would catch T2's
silent revert-to-English.

**G5 — the pin shadow is covered by no browser case.** pr3-recon §1h: "No e2e spec addresses
`data-pin-shadow` at all" — confirmed, `grep -rn "pin-shadow" apps/docs/e2e/` is empty. Its only
coverage is four jsdom tests in `data-attrs.test.tsx`, which assert the overlay's **position** and
never its **opacity** — and opacity is what the `--dg-pin-{left,right}-shadow` rename (pr3-recon T1,
"the single highest-risk item in the PR") silently breaks, because every consumer has a `, 0`
fallback. A browser case reading `getComputedStyle(overlay).opacity` on a scrolled, pinned grid is
the only thing in the repository that could catch T1. **This is the one gap where the browser suite
is not merely additional coverage but the only possible coverage.**

**G6 — `deleting: true` now warns; nothing asserts the behaviour it replaced.** pr2-outcomes §1.3:
the bare `true` used to be dropped in total silence (React) / mount a permanently empty `__actions__`
column (core, §3.3 — still unfixed). It is pinned by three cases in `actions-cell.test.tsx` (jsdom,
console-warning level). `editing/deleting.spec.ts` drives `delete-confirmation` (`:16`), which uses
the object form. No example uses `deleting: true`, so nothing in the browser sees either the old or
the new behaviour. **Low priority** — the resolution is a dev-mode warning, which is not a browser
concern, and core's half is an unfixed defect rather than a covered one. Listed so it is not
rediscovered as a gap.

**G7 — RTL is absent from the entire docs app, not just from pinning.** Independently re-verified:
`grep -rn "direction:" apps/docs/shared/` → **zero matches**; `grep -rniE "\bdir=|rtl"` over
`apps/docs/shared/` and `apps/docs/e2e/` → two false positives, both `sortLabel` string
interpolation in `controlled-state.tsx:35,41`. Design §5's "`direction` exists and
`layout/sticky.spec.ts` covers sticky" is about the **grid option**, not about coverage —
`layout/sticky.spec.ts` (read in full, 89 lines) sets no direction and measures only the vertical
axis. So PR 3 must author the first RTL example the repo has ever had. **Two consequences for PR 5:**
(a) PR 3's RTL work has no precedent to copy, so PR 5 should re-read it rather than assume it landed
correctly; and (b) once an RTL example exists, `columns/alignment.spec.ts` (`align: start/end` — the
_other_ logical axis, 2 cases on `column-footers`) and `columns/ordering.spec.ts` become cheap RTL
extensions. PR 2 §1.2 fixed a **real RTL reordering defect** (`header-cell.tsx` read the grid's
direction from `columnResizeDirection`, which is `undefined` when resizing is off, so both keyboard
shortcuts moved columns the wrong way under RTL) — **that fix is covered by no browser case**, and
`columns/ordering.spec.ts` already drives exactly those keyboard shortcuts in LTR. Running it once
more under RTL is a two-line `test.use` away, once an RTL example exists.

---

## 5. The `e2e-slots.test.ts` question

**What it does today.** `apps/docs/test/e2e-slots.test.ts` collects every `data-slot="…"` literal the
specs under `apps/docs/e2e` address (`readSpecSlots`, `slot-literals.ts:79-92`) and every one the
three data-grid React package `src/` trees write (`readAuthoredSlots`, `:95-105`), and fails with
`file:line` on a spec slot no package authors (`e2e-slots.test.ts:38-42`). Comments are stripped by a
hand-written scanner (`stripComments`, `:46-76`) rather than a regex, because both halves quote the
other. A guard test (`:46-50`) asserts >50 usages, >20 distinct slots and >100 authored, so an
extractor that silently stopped finding anything fails rather than vacuously passing.

**Why it cannot see this migration.** The regex is `data-slot=["']([a-z0-9-]+)["']`
(`slot-literals.ts:16`) — attribute **name** `data-slot`, capturing the slot name. `data-pinned` is a
different attribute and never matches; an attribute _value_ is never captured for any attribute. So
`columns.spec.ts:30,33` can go stale with every `verify` gate green. pr3-recon T8 is right, and it is
the #233 failure mode one attribute over.

**What extending it would take.** Three separable pieces, in increasing cost:

1. **A second regex over a whitelist of value-bearing attributes** (`data-pinned`, `data-align`,
   `data-sort-direction`, `data-pin-shadow`, `data-chip-kind`, `data-sticky`, `data-virtual`), with
   authored and addressed values compared as `attribute:value` pairs. ~30 lines beside the existing
   pair of functions; the existing `stripComments` and `walk` carry over unchanged.
2. **The `false` problem.** Most of these values are _not_ written as literals. `data-pinned` is
   `getIsPinned()`'s return value passed straight through five writers (pr3-recon §1g:
   `header-cell.tsx:147,347`, `cell.tsx:477`, `footer-cell.tsx:64`, `creating-row.tsx:87`) — the
   string `'start'` appears in **core**, not in the React packages the scanner reads. So a
   name-and-value scanner over `SLOT_AUTHORS` would find `data-pinned='left'` **nowhere**, mark every
   spec usage unknown, and fail. Widening `SLOT_AUTHORS` to include core does not fix it either: core
   spells the value as `ColumnPinSide.Start`, a const-object member, not a string at the site that
   matters. `data-align` has the same shape. Only `data-pin-shadow` (`pin-shadow-overlay.tsx:123,129`)
   and `data-sticky='true'` are genuine literals on both sides.
3. **An allowlist for the rest**, which is where it stops being a contract check and becomes a
   second place to remember to edit — precisely what AGENTS.md warns against: "A new slot assembled
   at runtime rather than written as a literal is invisible here; a spec that must address one is the
   case to reconsider this check, not to widen the regex."

**Recommendation: do not extend it in PR 5. Follow-up at best, and probably not that.** Three
reasons, in order:

- It would catch **two lines** (`columns.spec.ts:30,33`), which PR 3 already owns, and which PR 5's
  first act — actually running the suite (§2 b′) — catches far more cheaply and with a real failure
  message. The value of a static check is in the window where the dynamic one does not run; that
  window closes the moment §2's task lands.
- Of the four attributes whose values the migration moves, **three are not literals on the authored
  side**, so the check would be structurally incapable of covering them — and an allowlist that makes
  it pass anyway is a check that reports green about a thing it did not verify. That is the failure
  mode this whole migration is trying to stop, reintroduced in the tool meant to detect it.
- The honest version of the guarantee is different work: assert that a `data-pinned` value a spec
  addresses is one of `ColumnPinSide`'s **members**, resolved through the type checker, the way
  `docs-option-names.test.ts` resolves option names through `ts.TypeChecker` rather than by grep.
  That is a real project and a defensible one; it is not a regex widening and it is not PR 5.

Record the decision in PR 5's summary either way, with the reason — otherwise the next audit reads
the gap and proposes the regex again.

---

## 6. Proposed task breakdown

Ordered. Each sized for one subagent, each with its own checkable criterion. **PR-3 dependency** is
marked per task: "the pinning DOM contract" means `data-pinned='start'|'end'` landing in the three
packages and `static-column.tsx` / `columns.spec.ts` moving with it.

---

**T1 — Run the suite for the first time. ⭐ Do this before anything else. No PR 3 dependency.**
Per §0.2 and §2 b′, e2e has never executed against v9. Build the docs app and run both kit projects
plus `docs` locally (`pnpm --filter @ez-kit/docs build`, then
`pnpm --filter @ez-kit/docs exec playwright test --project=<p> --grep-invert @smoke` once per
project). Use `PW_PORT` — several worktrees are live and the hashed port is per-worktree
(`playwright.config.ts:8-16`). Record the **complete** failure list with file:line, classified into
(i) PR 3 residue, (ii) PR 4 residue, (iii) genuine v9 regressions, (iv) flakes. Do not fix anything.
_Criterion:_ a written triage of every failing case in all three projects, each assigned an owner.
This is the input to T2-T8; do not size them before it exists.

---

**T2 — Decide and record the `ci.yml` question. No PR 3 dependency. Can run in parallel with T1.**
Confirm §2's finding against the live workflow file (it moves under no one, but confirm), then write
the decision: **no trigger is added, and design §7 row 6's "remove the temporary e2e trigger" is
struck from PR 6.** Verify the `e2e gate` logic independently (`ci.yml:123-144`) and state whether
`e2e gate` is a required check on `integration/**` — if the answer needs GitHub's branch-protection
settings, say so rather than guessing. Do **not** edit `ci.yml`.
_Criterion:_ a paragraph in PR 5's summary and in this spec directory, naming `ci.yml:7` and
`ci.yml:78` and quoting design §6's contradicted sentence. Zero diff in `.github/`.

---

**T3 — The pinning spec, read back. ⚠️ Depends on PR 3.**
PR 3's Task 7 edits `pinning/columns.spec.ts:30,33` and `static-column.tsx:11`. PR 5 does not redo
it — PR 5 **verifies** it, because per §3c F1 and pr3-recon's own Task 7 note, a value-keyed selector
that matches nothing produces a clean "expected 1, got 0" that reads as a real pinning regression.
Read all three files; confirm the example pins, the spec asserts the new value on both `:30` and
`:33`, and `:31`'s negative still sits beside a positive in the same test. Then run
`--project=shadcn --project=heroui` on the `pinning/` directory only.
_Criterion:_ both kits green on `pinning/`, **and** a deliberate mutation check — flip `:30` to
`'end'` locally and confirm it fails. An assertion that cannot fail is the thing being guarded here.

---

**T4 — The pin-shadow browser case. ⚠️ Depends on PR 3. Closes §4 G5 and pr3-recon T1.**
Nothing in the repository can catch a missed `--dg-pin-{start,end}-shadow` consumer: the writer is
`style.setProperty` (a string, invisible to TypeScript), every CSS consumer has a `, 0` fallback, and
`data-attrs.test.tsx` asserts position, never opacity. Add a case to `pinning/columns.spec.ts` (or a
sibling `pin-shadow.spec.ts`) that scrolls the `column-pinning-static` grid and asserts
`getComputedStyle(el).opacity` on `[data-pin-shadow='start']` is `> 0` after scrolling and `0` before
— with the paired control that the grid really scrolled, per `layout/sticky.spec.ts:54-55`'s pattern.
Route every box read through `boxOf` (`fixtures.ts:130`).
_Criterion:_ green on both kits; **and** the mutation check — rename one kit's
`--dg-pin-start-shadow` consumer in `styles.css` locally and confirm that kit's case goes red while
the other stays green. Without that the case proves nothing, since `0` is also what a missing
element yields.

---

**T5 — The controlled × deferred case. ⭐ No PR 3 dependency. Closes §4 G2.**
The migration's one real public behaviour change (pr2-outcomes §1.1b) is covered by nothing (§4 G2:
`controlled-state.tsx` is controlled but not deferred; `ProductionDeferredApplyExample.tsx:13` is
deferred but explicitly not controlled). Author (a) an example combining `draft` with a controlled
`sorting` written from outside the grid, under
`apps/docs/shared/data-grid/examples/components/`, (b) its `manifest.json` entry (`id` → `sourceFile`

- `exportName`) **and** its `registry.ts` entry if it is a new source file — hand-maintained, and a
  miss throws only at page render while lint, typecheck and build all pass (AGENTS.md, "Two example
  conventions"), (c) a spec asserting the new behaviour: the parent's write to the deferred axis does
  **not** land until `apply()`. Write the assertion so it states the v9 behaviour positively, not as
  the absence of the v8 one.
  _Criterion:_ both kits green; the example is referenced from some `.mdx` so
  `node apps/docs/scripts/verify-manifest-coverage.mjs` passes; and the spec's docblock says in one
  sentence which behaviour changed and that this case is its only coverage.

---

**T6 — The RTL extensions PR 3's example makes cheap. ⚠️ Depends on PR 3 (needs its RTL example).**
Once an RTL example exists (PR 3 Task 8 — the first in the repo, §4 G7), two existing suites become
RTL-capable for almost nothing: `columns/ordering.spec.ts`'s keyboard move shortcuts — which is
precisely the surface **PR 2 §1.2 fixed a real RTL defect in**, covered by no browser case — and
`columns/alignment.spec.ts`'s `align: start/end`, the other logical axis. Add one RTL case to each,
reusing PR 3's example rather than authoring a second one.
_Criterion:_ both kits green; the ordering case fails against PR 2's pre-fix `header-cell.tsx`
(verify by reverting that one read locally). If it does not fail there, it is not covering the defect.

---

**T7 — The column-menu pin entries. ⚠️ Depends on PR 3. Closes §4 G4, covers pr3-recon T2 and T4.**
No spec names `Pin Left`/`Pin Right`/`pin-left`/`pin-right` in any form (§3b). PR 3 renames both the
`ColumnActionId` DOM ids and the `columnMenu.pinStart`/`pinEnd` message keys, and T2 warns the stale
message key may be **silently accepted** by a deep-`Partial` `messages` type — which would revert
every consumer's translation to English with nothing failing. Add: (a) a case in
`pinning/columns.spec.ts` opening a column menu and asserting the pin entries by accessible name,
mirroring `row-actions.spec.ts:51-59`'s pattern for row pinning; (b) a case in
`localization/messages.spec.ts` asserting the **Russian** pin labels — which requires the
`localization` example to enable pinning, since `messages.spec.ts:70-73` records that it currently
does not ("their translated entries have nothing to render into"). Either extend that example or add
a sibling; say which and why.
_Criterion:_ both kits green; the Russian case fails if
`apps/docs/shared/data-grid/examples/components/localization.tsx`'s pin keys are left at the old
spelling. That failure **is** the T2 check — if it passes with a stale key, T2's silent-acceptance
fear is confirmed and belongs in PR 6's changeset in those words.

---

**T8 — Run `@smoke` once, both kits. ⚠️ Depends on PR 3 **and** PR 4. Closes §4 G1.**
`pnpm --filter @ez-kit/docs test:e2e:smoke` — 148 ids × 2 kits, the only check that opens the 89
data-grid examples no spec drives, and excluded from every CI run (`ci.yml:110`). PR 4 rewrites all
111; PR 3 and T5 each add one. A missing `registry.ts` entry is invisible to lint, typecheck and
build (`smoke.spec.ts:12-21`). Run it, fix or report every failure, and **decide** whether it becomes
a CI job — the spec's own docblock argues it should not ("a barrier, not a CI job"), so the default
answer is "run it here, record the result, leave the tag". Say which you chose.
_Criterion:_ zero failures across both kits, with the run's output recorded; and a one-paragraph
decision on the job question with its reason.

---

**T9 — Audit the assertions that cannot fail. No PR 3 dependency. Closes §3c F2.**
The 84 `toHaveCount(0)` assertions are mostly safe because a `beforeEach` renders the example first.
The ~15 listed in §3c F2 are the ones whose **whole subject** is an absence with no paired positive
in the same test. Go through that table; for each, either add the positive control that makes the
negative mean something (the `layout/sticky.spec.ts:54-55` pattern) or record why it is already
sound. Do not rewrite tests that are fine.
_Criterion:_ every row of §3c F2's table is either amended or annotated with a reason; the suite
stays green; no test's subject changed.

---

**T10 — Write the PR 5 record.** What ran, what failed and why, the `ci.yml` decision (T2), the
`e2e-slots` decision (§5), which gaps are closed and which are consciously left. PR 6's changeset
needs G2's behaviour change named in its own sentence (pr2-outcomes §3.2 item 2) and, if T7 confirms
it, T2's silent message-key revert.
_Criterion:_ `specs/005-tanstack-table-v9/pr5-outcomes.md` exists and answers each of the above.

**Dependency summary.** No PR 3 dependency: **T1, T2, T5, T9** — start immediately, in parallel.
Needs PR 3's pinning DOM contract: **T3, T4, T6, T7**. Needs PR 3 **and** PR 4: **T8**. **T10** last.

---

## 7. Traps

The migration's signature defect is a value that silently stops being reached. In a browser suite it
is a selector matching nothing, an assertion that cannot fail, or a wait that resolves for the wrong
reason. Ordered by how likely each is to ship undetected.

**B1 — The suite has never run, so "e2e is green" is not a fact anyone holds. (highest)**
§0.2: the branch is unpushed, no PR exists, `origin/integration/tanstack-v9` is not a revision. Every
statement in `plan.md` and `design.md` about what CI does for this branch is a statement about a
workflow that has not executed. Treat _any_ claim that a gate passed as unverified until T1 produces
output. Corollary: do not size T3-T9 before T1 lands — the triage may reclassify half of them.

**B2 — A renamed pinning value fails clean, and a clean failure reads as a product regression.**
`columns.spec.ts:30,33`. `toHaveAttribute('data-pinned','left')` against an element stamped `'start'`
produces "expected `left`, received `start`" — legible. But `:33`'s
`[data-slot="td"][data-pinned="left"]` produces `toHaveCount` expected N, **received 0**, which is
exactly what a grid that stopped pinning produces. A half-applied rename and a broken feature are the
same failure message. pr3-recon's Task 7 says "verify by **reading the spec back** as well as running
it"; T3 makes that a mutation check instead, because reading is what everyone believes they did.

**B3 — The pin-shadow opacity cannot be caught by anything that exists.**
pr3-recon T1 calls `--dg-pin-{left,right}-shadow` "the single highest-risk item" in PR 3: written by
`style.setProperty` (a string — TypeScript sees nothing), read by four CSS rules each with `, 0`. Miss
one consumer and that kit's shadow is permanently invisible, with no type error, no unit failure
(`data-attrs.test.tsx` asserts position, never opacity) and no e2e assertion (§4 G5). T4 is the only
proposed check. **And T4 is itself trap-shaped**: `getComputedStyle(missing).opacity` and
`getComputedStyle(broken).opacity` both read `0`, so T4 without its mutation criterion is a test that
passes for the wrong reason about a defect that fails open. Do not accept T4 without the mutation run.

**B4 — `@smoke` is the only check over 89 of the 111 examples, and it is off in CI.**
§4 G1. PR 4 rewrites every one of them. `registry.ts` is hand-maintained and a miss throws **only at
page render** — lint, typecheck and build all pass (`smoke.spec.ts:12-21`, AGENTS.md). The failure
mode is: PR 4 lands green, PR 5 runs the 29 specs green (they drive 22 ids), the final PR merges, and
a reader opens a docs page to `has no registry entry for "<sourceFile>"`. T8 is the only thing between
here and that. It depends on PR 4, so it is last — schedule it, do not let it fall off.

**B5 — `e2e-slots.test.ts` looks like cover and is not.**
`slot-literals.ts:16` matches `data-slot` and nothing else, name only, never a value. A green `verify`
says nothing about `data-pinned`, `data-pin-shadow` or `data-align`. pr3-recon T8 says this; it is
repeated here because the test's _name_ and its `file:line` failure output make it feel like the
contract check for the whole `data-*` surface, and §5 explains why extending it is the wrong move
rather than the obvious one.

**B6 — `not.toHaveAttribute` and `toHaveCount(0)` pass when the page is broken.**
§3c F1/F2. `columns.spec.ts:31` is the clearest instance: the negative half of a renamed-attribute
assertion, which passes before, during and after the rename, and would also pass if the example
stopped rendering the free column at all. 84 `toHaveCount(0)` assertions repo-wide; ~15 with no paired
positive. `fixtures.ts:130-134` records this exact class having already bitten once — "how a
sticky-footer assertion kept passing after the footer stopped being sticky". T9.

**B7 — The design document is wrong about CI in a way that invites a harmful edit.**
Design §6 says the browser suite runs only on PRs into `develop` and that a temporary trigger must be
added. §2 shows `ci.yml:7` and `:78` already cover `integration/**`. Someone acting on §6 would edit
the `e2e` job's `if:` — and since `if:` is an AND of its terms, **any addition there can only turn
e2e off** on some set of PRs. The safe outcome and the harmful one differ by one `&&`. T2 exists to
close this in writing before anyone opens the file.

**B8 — `verify-manifest-coverage.mjs` is documented as a gate and is wired to nothing.**
`specs/001-data-grid-docs/tasks.md:195` (T060) says to "wire it into the docs `lint` script (or a new
`pnpm --filter @ez-kit/docs verify:manifest`)" and is ticked `[x]`. It is **not** in
`apps/docs/package.json`'s scripts, not in `ci.yml`, not in any `turbo.json` task — grep over the repo
finds it only in `AGENTS.md:293` (which correctly says "run manually") and in spec prose. T5 and PR 3
Task 8 both cite it as a criterion. Run it by hand (`node apps/docs/scripts/verify-manifest-coverage.mjs`)
or the criterion is satisfied by nothing.

**B9 — A local run can target another worktree's dev server.**
`playwright.config.ts:8-16`: the port is hashed per worktree and `reuseExistingServer: !IS_CI` is
**true** locally (`:75`). Several worktrees are live in this session. A run that reuses a server built
from a different branch measures that branch — and passes or fails for reasons that have nothing to
do with the tree under test. Pin `PW_PORT` and confirm the server you got is this worktree's.

**B10 — `--grep-invert @smoke` is in four places and easy to satisfy accidentally.**
`ci.yml:110`, and `test:e2e` / `test:e2e:update` in `apps/docs/package.json`. A tag typo in
`smoke.spec.ts:67` would make `--grep-invert @smoke` match nothing and quietly add 296 page loads to
every CI run — or, in the other direction, `--grep @smoke` match nothing and make `test:e2e:smoke`
report success having run zero tests. Playwright exits 0 on an empty selection unless `forbidOnly` or
a `--fail-on-empty` equivalent is set, and neither is (`:43` sets only `forbidOnly`). T8 must check
the **count** of tests run, not just the exit code.

**B11 — PR 3 and PR 4 are editing this worktree while PR 5 is scoped.**
Every line number here was read at `91f23b38` and PR 3 explicitly touches `pinning/columns.spec.ts`
and `static-column.tsx`, PR 4 the examples T5 and T8 depend on. Re-derive line numbers at the start
of each task. Where §1b's "Example(s) driven" column disagrees with the manifest, the manifest wins.
