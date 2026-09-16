# PR 5 outcomes — the browser suite on v9

**Date:** 2026-09-16
**Branch:** `integration/tanstack-v9`, worktree `/Users/sergejolcev/orca/workspaces/ez-kit/data-grid-bump`
**Tree at start:** `f5e03efe` (`docs: record what PR 3 delivered and the residue PRs 4-6 inherit`).
**Scope worked:** `apps/docs/e2e/**` only. Nothing outside it was edited — no `ci.yml`, no
`packages/**`, no `apps/docs/shared/**`, no `apps/docs/content/**`, no changeset.

---

## 0. The headline, stated plainly

**The browser suite did not run. Not one Playwright case executed against v9 in this PR.** Every
claim below is either a static reading of source or the result of a Vitest run; none of it is a
statement about a browser. See §5 for the exact blockage and the evidence for it.

What PR 5 therefore delivers is the half of its scope that never needed a browser: the
absence-assertion audit and its repairs (§1), the controlled × deferred finding (§2), the
`e2e-slots` decision (§3), the `ci.yml` decision (§4), and a list of what the next agent inherits
(§6).

---

## 1. The absence-assertion audit

### 1a. How the candidate set was derived

`pr5-recon.md` §3c F2 listed ~15 assertions by hand. That list was **re-derived rather than
trusted**, because a hand-written list of fail-open assertions is itself a thing that can be
incomplete, and three of its rows turned out to be already sound.

Method: a script (`scratchpad/audit.mjs`) split every spec under `apps/docs/e2e/packages/` into
`test(` blocks and flagged any block **all** of whose assertions are negative — `toHaveCount(0)`,
`not.to*`, `toEqual([])`, `toBe(0)`, `toHaveLength(0)`. That is the precise defect shape: not "a
negative exists", but "the test's entire subject is an absence, so nothing in it can fail when the
page is broken". The repo has **99** negative assertions across 19 spec files; **9** tests are
all-negative.

One correction worth recording: the first run of the script missed `expect.poll(...)` (its
positive-assertion regex was `expect\(`), which over-reported by two. The counts below are from the
corrected run.

### 1b. Verdict per case

Rows marked **sound** were left alone, as instructed — the audit does not rewrite tests that are
fine. Rows marked **repaired** got a positive control and **no change of subject**.

| `file:line` (at `f5e03efe`)                                 | Subject                                                  | Verdict                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contract/row-slot.spec.ts:125`                             | the whole-body slot sweep, ×11 examples                  | **repaired** — see 1c                                                                                                                                  |
| `pagination/paging.spec.ts:125`                             | `links: false` renders no numbers/ellipsis/edge jumps    | **repaired**                                                                                                                                           |
| `layout/sticky.spec.ts:81`                                  | without `layout`, neither end is sticky                  | **repaired**                                                                                                                                           |
| `editing/editing.spec.ts:141`                               | cell mode offers no save/cancel pair                     | **repaired**                                                                                                                                           |
| `expanding/expanding.spec.ts:179`                           | a leaf offers no chevron                                 | **repaired**                                                                                                                                           |
| `filtering/chips.spec.ts:81`                                | the strip stays unmounted while nothing is filtered      | **repaired**                                                                                                                                           |
| `selection/selection.spec.ts:94`                            | the selection bar stays down until something is selected | **repaired**                                                                                                                                           |
| `filtering/panel.spec.ts:90`                                | an `above` panel is not inside the toolbar               | **repaired** (compound-selector hardening)                                                                                                             |
| `pagination/page-sizer.spec.ts:62`                          | a `footer` sizer is not inside the toolbar               | **repaired** (same)                                                                                                                                    |
| `columns/resizing.spec.ts:68,69`                            | `active` has no resize handle                            | **repaired** (same)                                                                                                                                    |
| `expanding/expanding.spec.ts:219`                           | "and closes them again"                                  | **sound** — opens with `not.toHaveCount(0)` on the panel, which is the live-selector proof                                                             |
| `fallbacks/fallbacks.spec.ts:34`                            | skeleton rows, no data rows                              | **sound** — opens with `not.toHaveCount(0)` on `LOADING_ROW`, same pattern                                                                             |
| `columns/ordering.spec.ts:112,113`                          | a locked column gets no move entries                     | **sound** — `:115` asserts `Asc` is present, and says why: "The menu did open — this is not a missing trigger"                                         |
| `columns/visibility.spec.ts:68`                             | `visibility: false` is not offered a toggle              | **sound** — `:65,:66` assert two other toggles through the same locator                                                                                |
| `columns/visibility.spec.ts:124`                            | that column is offered no `Hide`                         | **sound** — `:126` carries the same explicit "the menu did open" control                                                                               |
| `row-actions/row-actions.spec.ts:46,54,61,93,94,95,140,147` | eight absences across five tests                         | **sound** — every one sits beside a `toHaveCount(1)` resolved through the _same_ `cell` locator in the same test                                       |
| `pinning/columns.spec.ts:31`                                | the free column carries no `data-pinned`                 | **sound as of PR 3** — `:30` now asserts `data-pinned='start'` positively on the pinned column in the same test. Recon F1 described the pre-PR-3 state |

So the recon's "~15 with no paired positive" resolves to **10 repaired, and the rest already
sound**. Three of its named rows (`ordering:112,113`, `visibility:68`, `visibility:124`) already
carried the exact "the menu did open" control it was asking for, with a comment saying so.

### 1c. The one finding the recon did not have

**`contract/row-slot.spec.ts` was the weakest assertion in the suite, and it is the one that
advertises itself as the strongest.** Its docblock says the same defect "has now been found three
times" and that "the next one should fail here". Its assertion was `expect(offenders.length).toBe(0)`
over a sweep that begins `document.querySelectorAll('[data-slot="tbody"]')`. A renamed `tbody` slot,
an example that stopped rendering rows, or an `open` step that drove the grid into the wrong state
all yield **zero rows visited, zero offenders, and eleven green cases** — across the eleven examples
that are the suite's only coverage of pinned rows, the creating draft row, the loading skeleton, the
empty state, virtualized rows and the load-more row.

Repaired by returning the **denominator** alongside the result (`{ offenders, swept }`) and asserting
`swept > 0` before believing the empty offender list. This is the `fixtures.ts:130` `boxOf` principle
— refuse to measure nothing — applied to a sweep rather than to a box.

### 1d. What the repairs are, in one line each

- `row-slot.spec.ts` — `bodySlotOffenders` → `sweepBodySlots`, returning `swept`; `expect(swept).toBeGreaterThan(0)` added ahead of the offender assertion.
- `paging.spec.ts` — the `links: false` test now first asserts `[data-slot="pagination"]` count 1 and that `Next` / `Previous` resolve, so the three absences are absences within a footer that exists.
- `sticky.spec.ts` — `expect(positions).toHaveLength(2)` before `not.toContain('sticky')`; `evaluateAll` over a selector matching nothing returns `[]`, which contains no `'sticky'` either.
- `editing.spec.ts` — the cell-mode test asserts the editor actually opened (`toHaveValue(ALICE)`) before asserting no save/cancel/edit controls exist.
- `expanding.spec.ts` — the leaf test asserts row 2 is at `data-depth="2"` and is Alice Johnson before asserting she has no chevron.
- `chips.spec.ts` — after asserting the strip is unmounted, the test filters a column and asserts the strip appears: the selector is proved live.
- `selection.spec.ts` — the bar test now does the round trip (down → select → up → deselect → down), proving `[data-state="open"]` is a state the element really takes.
- `panel.spec.ts`, `page-sizer.spec.ts`, `resizing.spec.ts` — three compound-selector hardenings: assert the _left_ half (`[data-slot="toolbar"]`, the `active` header) resolves, so an empty compound selector cannot read as "the thing moved".

No test's subject changed and no test was deleted.

### 1e. Mutation proof

**What was proved, and how.** `apps/docs/test/e2e-slots.test.ts` is the one check over this PR's
diff that runs without a browser, so it is the one whose falsifiability could be demonstrated rather
than asserted:

- Baseline, with all ten repairs in place: `pnpm exec vitest run test/e2e-slots.test.ts` → **5 passed**.
- Mutation: `[data-slot="thead"]` → `[data-slot="thead-bogus"]` in `layout/sticky.spec.ts` (one of the repaired files), re-run → **1 failed | 4 passed**, failing on the "spec addresses a slot no package authors" assertion.
- Restored; `git diff --stat` confirms `sticky.spec.ts` carries only the intended `3 insertions`.

Also run: `pnpm exec tsc --noEmit -p apps/docs/tsconfig.json`, filtered to `e2e/` and `test/` →
**zero errors**. (The unfiltered run has many errors, all under `shared/` — PR 4's in-flight tree.)

**What was NOT proved, and this is the important half.** The ten repaired assertions are
_themselves_ untested. Each was written to fail when its positive control is removed, but that
mutation requires a browser, and no browser ran. The repairs are therefore **reviewed, typechecked
and slot-checked, but not executed**. Per the brief's own standard — "every case you write or repair
must be falsified by mutation, and your report must show the mutation and its result" — these ten do
not meet it yet. They are the first thing to run when §5's blockage clears.

---

## 2. The controlled × deferred behaviour change (recon G2)

**Finding: no example in the repository can exercise it, and I did not author one — the examples
tree is PR 4's territory.** Re-verified against the tree at `f5e03efe`:

- `grep -l "draft" apps/docs/shared/data-grid/examples/components/` returns **exactly one file**: `production/ProductionDeferredApplyExample.tsx`. Its own docblock says "Nothing is fed back down through `state` on the three deferred axes — the draft is grid-owned." So: deferred, not controlled.
- `controlled-state.tsx` drives `sorting` / `pagination` from the page's `useState` and carries no `draft`. So: controlled, not deferred.
- The manifest has one `deferred` id (`production-deferred-apply`, `manifest.json:779`) and no spec drives it.

**What would be needed** (for whoever owns it — PR 4, or a follow-up):

1. An example under `apps/docs/shared/data-grid/examples/components/` carrying **both** `draft` and a `sorting` (or `pagination`) value written from the parent's own state, with a control outside the grid that writes it and a readout that renders what the parent believes the state to be — the `controlled-state.tsx` shape, plus `draft`.
2. Its `manifest.json` entry (`id` → `sourceFile` + `exportName`) **and** a `registry.ts` entry if it is a new source file. A missing registry entry throws only at page render; lint, typecheck and build all pass.
3. A reference from some `.mdx`, or `node apps/docs/scripts/verify-manifest-coverage.mjs` fails. (Note that script is wired into nothing — it is not in `apps/docs/package.json`, not in `ci.yml`, not in any turbo task. It must be run by hand or the criterion is met by nothing.)
4. Then a spec asserting the v9 behaviour **positively**: the parent writes a sort, the readout shows the parent holding it, and the **grid still shows the old order** until `apply()` — at which point the grid follows. Stated that way it fails on v8 (where the write landed immediately) rather than passing vacuously.

Until 1-3 exist there is nothing for a spec to open, so PR 5 adds no case here. **This remains the
single highest-value uncovered behaviour change in the migration** and PR 6's changeset still needs
it named in its own sentence.

---

## 3. `e2e-slots.test.ts` — not extended, and why

**Decision: leave it exactly as it is.** Not a deferral — a decision, recorded so the next audit
reads this instead of re-proposing the regex.

The check matches `/data-slot=["']([a-z0-9-]+)["']/` (`test/e2e-slots/slot-literals.ts:16`) —
attribute **name** `data-slot`, capturing the slot name, never a value, never another attribute. So
it gave and gives zero cover over `data-pinned`, which is the one DOM contract this migration moved.

Extending it to attribute values was rejected on three grounds:

1. **Three of the four attributes whose values the migration moves are not literals on the authored side.** `data-pinned` is `getIsPinned()`'s return value passed through five writers; the string `'start'` lives in **core**, and even there it is spelled `ColumnPinSide.Start`, a const-object member rather than a string at the site that matters. `data-align` has the same shape. A name-and-value scanner over the React packages would find `data-pinned='start'` **nowhere**, mark every spec usage unknown, and fail — so the only way to make it pass is an allowlist, i.e. a check reporting green about something it did not verify. That is precisely the defect class this migration is about, reintroduced inside the tool meant to detect it.
2. **It would catch two lines**, both already fixed by PR 3, and both of which a single suite run catches far more cheaply and with a real failure message.
3. **AGENTS.md says so directly**: "A new slot assembled at runtime rather than written as a literal is invisible here; a spec that must address one is the case to reconsider this check, not to widen the regex."

The honest version of the guarantee is different work — resolve a `data-pinned` value a spec
addresses against `ColumnPinSide`'s **members** through `ts.TypeChecker`, the way
`docs-option-names.test.ts` resolves option names. That is a defensible project. It is not a regex
widening and it is not this PR.

The test **was** exercised: it passes on the repaired tree and it was mutation-checked (§1e). Its
existing guard assertions (>50 usages, >20 distinct slots, >100 authored) are the same
denominator principle §1c applies to `row-slot.spec.ts`.

---

## 4. `ci.yml` — nothing added, nothing to remove

**Zero diff in `.github/`.** Confirmed against the live file:

- `ci.yml:7` — `on: pull_request: branches: [develop, main, 'integration/**']`. A PR into `integration/tanstack-v9` already triggers the workflow. Adding the branch would be a no-op.
- `ci.yml:78` — the `e2e` job's gate is `if: github.base_ref != 'main' && github.head_ref != 'changeset-release/develop'`. For a PR into `integration/tanstack-v9` both terms hold, so the full three-leg matrix already runs.

**Design §6's premise is false and acting on it is harmful.** It states the browser suite runs only
on PRs into `develop` and asks for a temporary trigger. Because the `e2e` gate is an **AND** of its
terms, any addition there can only ever turn e2e **off** on some set of PRs. The safe outcome and
the harmful one differ by one `&&`.

**Consequence for PR 6:** design §7 row 6's "remove the temporary e2e trigger" is **struck** — there
is nothing to remove, because nothing was added.

**On whether `e2e gate` is a required check on `integration/**`:** unknown, and not knowable from
this repository. Branch protection is configured per branch in GitHub's settings, and this repo's
rules are documented only for `develop`and`main`. Stating it either way would be a guess. What
*is* certain from `ci.yml:123-144`is that the gate's own logic is branch-name-independent: fixed
name,`needs: e2e`, `if: always()`, passes on `success`or`skipped` and nothing else.

---

## 5. Why the suite could not run — the evidence

Blocked, and **further upstream than the brief described**. The brief said no docs example renders
(a v9 feature-registration problem, PR 4's). That is true, but it is not the first wall:

```
$ pnpm turbo run build --filter=@ez-kit/docs^...
 Tasks:    10 successful, 11 total
Failed:    @ez-kit/data-grid-react#build

$ pnpm --filter @ez-kit/data-grid-react build
src/data-grid/data-grid.tsx(104,25): error TS2344: Type 'unknown' does not satisfy the constraint 'RowData'.
src/data-grid/data-grid.tsx(111,28): error TS2379: Argument of type 'Row<TableFeatures, unknown>' is not
  assignable to parameter of type 'PublicRow<unknown>' with 'exactOptionalPropertyTypes: true'.
src/data-grid/data-grid.tsx(142,2):  error TS2322: Type 'BulkConfirmationConfig<any>' is not assignable to
  type 'BulkConfirmationConfig | undefined'.
  … 5 more, all in data-grid.tsx
DTS Build error
```

**`@ez-kit/data-grid-react` does not build** — eight type errors in `src/data-grid/data-grid.tsx`,
all of the same family (the v9 `TableFeatures` generic not threading through `Row` / `Table` /
`PublicRow`). That is `packages/data-grid/**`, PR 3's territory, mid-flight.

Everything downstream follows: the docs app cannot build (`pnpm docs:dev` and `docs:build` both run
`build:deps` first), so the dev server cannot serve working examples, so `playwright test` would
fail every case in `beforeEach` at `fixtures.ts:79`. There was no point starting a server, and I did
not start one.

Independently, `pnpm exec tsc --noEmit` over `apps/docs` reports many errors under `shared/` —
including `controlled-state.tsx:19` importing a `GridFeatures` that `@ez-kit/data-grid-react` no
longer exports — confirming PR 4's tree is also mid-flight.

**No CI has ever run against this branch.** `origin/integration/tanstack-v9` does not exist and no
PR is open. Every figure in this migration, including every one in this document, is a local
measurement. Nothing here has been verified by CI.

---

## 6. What is inherited

**For whoever runs the suite first (the blocking item):**

1. **Run the three projects and triage.** `pnpm --filter @ez-kit/docs build`, then `playwright test --project=<docs|shadcn|heroui> --grep-invert @smoke`. Pin `PW_PORT` — the port is hashed per worktree and `reuseExistingServer` is true locally, so an unpinned run can silently measure a different branch's server.
2. **Mutation-check the ten repairs of §1.** They are the deliverable of this PR and they are unexecuted. For each, remove the positive control and confirm the test goes red. If one stays green, the repair is decorative and should be redone.
3. **`pnpm --filter @ez-kit/docs test:e2e:smoke`, both kits, once.** It is the only check that opens the ~89 data-grid examples no spec drives, it is excluded from every CI run, and PR 4 is rewriting all 111. Check the **count of tests run**, not the exit code: Playwright exits 0 on an empty selection and nothing in `playwright.config.ts` sets a fail-on-empty.

**For PR 6's changeset:**

- The controlled × deferred behaviour change (§2) still needs its own sentence, and still has no coverage.
- Design §7 row 6 ("remove the temporary e2e trigger") is struck; §4 has the reason, which PR 6 should record so the next reader does not re-add it.

**A defect found in passing, outside my territory (PR 4's, or a follow-up):**
`apps/docs/shared/data-grid/examples/components/example-task-board.tsx:238` writes bare `deleting`
— i.e. `deleting: true`. Per pr2-outcomes §1.3 that renders **nothing**: no actions column entry, no
delete button, no diagnostic; after PR 2 it warns in development instead. So a docs example
advertises a delete affordance it does not have. No spec catches it: `editing/deleting.spec.ts`
drives `delete-confirmation` (object form), and the one spec that opens `example-task-board`
(`filtering/panel.spec.ts:17`) only measures the filter panel. The fix is in the example, not in a
spec. Checked and clear: `e2e/docs/embed-isolation.spec.ts` makes no console assertions, so the new
development warning breaks nothing.

**Gaps deliberately left open, with reasons:**

- **The pin-shadow opacity case (recon G5/T4) was not written.** It is the only possible coverage for the `--dg-pin-{start,end}-shadow` rename, and it is also trap-shaped: `getComputedStyle` reads `0` for a missing element and for a broken one alike, so the case is worth nothing without a mutation run proving one kit goes red while the other stays green. With no browser, that mutation cannot be performed — and a case written but never falsified is exactly the fail-open artifact this PR exists to remove. Writing it unverified would have been worse than leaving the gap visible. **This is the highest-value item still outstanding.**
- **The column-menu pin entries (recon G4/T7) were not covered.** Same reason: the Russian-label half of that case _is_ the check for PR 3's silent message-key revert, and an unverified assertion about a translation is not a check. It also needs the `localization` example to enable pinning, which is outside my territory.
- **The RTL extensions to `columns/ordering.spec.ts` and `columns/alignment.spec.ts` (recon G6/T6) were not added.** PR 3's `pinning/rtl-columns.spec.ts` now gives them an example to reuse, and the ordering one would cover PR 2 §1.2's real RTL reordering fix. Its stated criterion is that it fails against the pre-fix `header-cell.tsx` — again, a browser check.
- Recon G6 (`deleting: true`) is addressed above as a found defect rather than a coverage gap.
