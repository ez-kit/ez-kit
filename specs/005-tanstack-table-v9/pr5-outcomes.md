# PR 5 outcomes — the browser suite on v9

**Date:** 2026-09-16
**Branch:** `integration/tanstack-v9` (local, unpushed), worktree `/Users/sergejolcev/orca/workspaces/ez-kit/data-grid-bump`
**Scope worked:** `apps/docs/e2e/**` only. No `ci.yml`, no `packages/**`, no `apps/docs/shared/**`,
no `apps/docs/content/**`, no changeset.
**Commits:** `5236a546` (ten absence-assertion repairs), `3af550e1` (two of those ten corrected),
and this document.

---

## 0. Read this before any number below

**Superseded on 2026-09-16 by §10 — read that first.** The full suite has since been run to
completion against a stationary tree: **518/518 passed at `5c1a85f4`**, and `@smoke` **298/298 at
`c22e4c60`**. Everything §0 through §9 says about "no full-suite result" describes the state before
that run and is kept as the record of it, not as the current answer.

What follows was written when that was still true: **there is no full-suite result for this branch.**
One full run was executed (§2); it is _not_ a gate and must not be quoted as one, because the tree
changed underneath it while it ran. Every result after that is a **selective** run against a named
commit.

**No CI has ever run against this branch.** It is unpushed with no PR. Every figure in this document
is a local measurement on one machine.

**Where a run produced nothing, this document says so** rather than recording a pass or a failure.

---

## 1. What the suite is, and what one run costs

| Measurement                           | Figure                                             | How obtained                                                              |
| ------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| Full suite                            | **518 tests, 16.1 min**                            | the §2 run, `workers: 1`, `fullyParallel: false`                          |
| Single spec, one kit, **warm** server | **~14 s**                                          | `chips.spec.ts --project=shadcn` → 7 passed in 11.5 s                     |
| Single spec, one kit, **cold** server | **minutes**                                        | 3 specs × 2 kits cost 10.2 min, dominated by `next dev` route compilation |
| Rebuild of the docs app's deps        | **46 s** uncontended, **>10 min** under contention | `turbo run build --filter=@ez-kit/docs^...`                               |

Retries are **off** locally — `playwright.config.ts:44` is `retries: process.env.CI ? 1 : 0` and `CI`
was unset. No result below can have passed on a second attempt, and no `flaky` line appears in any
log. That is the strongest available answer to "did `exit 0` hide something": nothing could hide.

---

## 2. The one full run, and why it is not a gate

`518/518` executed. **20 failed, 498 passed, 16.1 min.** Playwright's own exit was `1`, captured
explicitly rather than inferred from the wrapper.

It is not a gate because **`d279a5dc` landed at 18:25:42, inside the run** (18:11 → 18:28). shadcn's
chips specs executed before it, heroui's after, and `next dev` hot-reloaded the package in between —
which is the entire explanation for an otherwise baffling kit asymmetry. A run that straddles a tree
change measures two trees.

All 20, resolved:

| Count | Cases                                                                       | Resolution                                                       |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 4     | `docs/embed-isolation.spec.ts` (all 4)                                      | **Cold start.** Re-measured warm: **5 passed**. §4               |
| 6     | `filtering/chips.spec.ts` ×6, shadcn only                                   | **Stale.** Fixed by `d279a5dc` mid-run. Re-run: **7 passed**. §3 |
| 2     | `filtering/panel.spec.ts:85`, `pagination/page-sizer.spec.ts:59`, both kits | **My own error.** §5                                             |
| 2     | `ordering/rows.spec.ts:143`, both kits                                      | Real defect, fixed later by `dbc0b876`                           |
| 2     | `state/persistence.spec.ts:50`, both kits                                   | Real defect, fixed later by `86b5a546`                           |
| 4     | `virtualization.spec.ts:139` ×2 + `:113` ×2                                 | `:139` real, fixed by `8825d1ac`; `:113` cold start              |

---

## 3. The defect the audit caught in the act

This is the clearest evidence in the PR that the §6 exercise was worth doing, so it is recorded
before the audit itself.

`filtering/chips.spec.ts:81` — "stays unmounted while nothing is filtered" — was an absence-only
test. The repair in `5236a546` added a positive: filter a column, assert the strip appears. On the
first execution it went red, **alongside the two pre-existing positive cases beside it**, with the
browser throwing:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'columnFilters')
    at ActiveFiltersBar (packages/data-grid/react/react/src/data-grid/active-filters-bar.tsx:118:33)
```

The cause: `active-filters-bar.tsx:88` reads `s.applied`, which is **`draftFeature`'s** slice. In v9
a slice exists only if its feature is registered, and `filter-chips-auto` correctly does not register
`draftFeature` because it does not use `draft`. Lines `:127` and `:140` guard the _uses_ with
`isDrafting` — but `:118` dereferences `applied` **before** either guard runs. Fixed as `d279a5dc`
("never a missing feature, only a missing `?.`").

Two things worth keeping from this:

- **The old version of that test would have gone green while the feature it describes was crashing.** That is the exact failure mode the audit exists to close, demonstrated on a live defect rather than argued from first principles.
- **Nothing warned.** The log line immediately before the TypeError is the test name; core emitted no diagnostic. This is not "a warning nobody listened to" — it is an unguarded read with no diagnostic at all.

---

## 4. The absence-assertion audit

### 4a. How the set was derived

`pr5-recon.md` §3c F2 listed ~15 by hand. That list was **re-derived rather than trusted** — a
hand-written list of fail-open assertions is itself a thing that can be incomplete, and three of its
rows turned out already sound.

A script split every spec under `apps/docs/e2e/packages/` into `test(` blocks and flagged any block
**all** of whose assertions are negative. That is the precise defect shape: not "a negative exists",
but "the test's whole subject is an absence, so nothing in it can fail when the page is broken". The
repo has **99** negative assertions across 19 files; **9** tests were all-negative.

(The script's first version missed `expect.poll(...)` and over-reported by two. Corrected before use.)

### 4b. Verdict per case

Ten repaired, the rest already sound. Three of the recon's named rows (`ordering:112,113`,
`visibility:68`, `visibility:124`) already carried the exact "the menu did open" control it asked for,
with a comment saying so.

The single most valuable finding: **`contract/row-slot.spec.ts` was the weakest assertion in the
suite and is the one that advertises itself as the strongest.** Its docblock says the same defect
"has now been found three times" and "the next one should fail here". Its assertion was
`expect(offenders.length).toBe(0)` over a sweep beginning
`document.querySelectorAll('[data-slot="tbody"]')` — so a renamed `tbody` slot, an example that
stopped rendering rows, or an `open` step that missed its state all yield zero rows visited, zero
offenders, and **eleven green cases**, across the suite's only coverage of pinned rows, the creating
draft row, the loading skeleton, the empty state, virtualized rows and the load-more row. Repaired by
returning the **denominator** (`{ offenders, swept }`) and asserting `swept > 0` first — the
`fixtures.ts:130` `boxOf` principle (refuse to measure nothing) applied to a sweep.

### 4c. Mutation proofs — the standard this PR set itself

Each repair was mutated twice: with the control present (must go **RED**) and with the control
removed (must go **GREEN**). The second half is the load-bearing one — it demonstrates the
_pre-repair_ test failing open under the same breakage, which is the claim being made.

All runs: `--project=shadcn`, warm server, at `eaaa3098`.

| #   | Repair                                  | Mutation applied                        | + control | − control |
| --- | --------------------------------------- | --------------------------------------- | --------- | --------- |
| 1   | `row-slot` sweep denominator            | `[data-slot="tbody"]` → `tbody-X`       | **RED**   | **GREEN** |
| 2   | `sticky` both ends resolved             | both end selectors → `-X`               | **RED**   | **GREEN** |
| 3   | `chips` strip selector is live          | `active-filters-bar` → `-X`             | **RED**   | **GREEN** |
| 4   | `selection` bar round trip              | `data-state="open"` → `open-X`          | **RED**   | **GREEN** |
| 5   | `paging` footer exists                  | `pagination` + `pagination-item` → `-X` | **RED**   | **GREEN** |
| 6   | `editing` the editor really opened      | drop the `dblclick`                     | **RED**   | **GREEN** |
| 7   | `expanding` the leaf is really the leaf | `nth(2)` → `nth(99)`                    | **RED**   | **GREEN** |
| 8   | `resizing` the opted-out column exists  | `header('active')` → `active-X`         | **RED**   | **GREEN** |

**8 of 8 mutable repairs proved, both directions.** The other two of the ten are the corrections in
§5; after correction they are annotations rather than assertions, so they have no control to mutate
and are excluded from this table rather than counted as passes.

Two mutations had to be redone. The first attempts at #6 and #7 broke something the _original_ test
also depended on, so "− control" failed too and the mutation isolated nothing. Replacing them with
genuine fail-open simulations (never open the edit; address a row that is not there) produced the
clean result above. A mutation that fails both ways proves nothing, and recording the first attempt
as a proof would have been the same defect this PR is about.

After every mutation the tree was restored and verified: `git status` shows only the intended
changes and `find -name "*.bak"` returns 0.

---

## 5. Two of the twenty failures were mine

Stated plainly because the record is worth more than the appearance.

`5236a546` hardened three compound-selector negatives by asserting the left half resolves. Right for
`resizing`; **wrong for `filtering/panel.spec.ts` and `pagination/page-sizer.spec.ts`**, which failed
on both kits with:

```
Locator: locator('[data-slot="toolbar"]')   Expected: 1   Received: 0
```

`filter-panel` and `pagination-page-sizer-footer` **mount no toolbar at all.** I asserted a premise
without checking it, turning a vacuous pass into a red test.

Corrected in `3af550e1`, and the correct treatment is **not** a different assertion. On a grid with
no toolbar the compound selector is empty whatever the panel or sizer does, so that negative is
structurally vacuous and cannot be paired at all. Both are restored with the measurement and the
reason recorded in place, naming what does carry the claim: the sibling test that asserts the same
containment positively on a grid that _has_ a toolbar, and the `boxOf` reads that throw rather than
coordinate-zero. Verified warm, both kits: **20 passed**.

The lesson generalises: this is a verdict my static audit got wrong and **only execution could have
caught** — the same lesson as §3, pointed at my own work.

---

## 6. Selective results at `eaaa3098`

One dev server, warm, all 14 needed routes pre-warmed to HTTP 200.

| Run                                                                  | Result        | Time    |
| -------------------------------------------------------------------- | ------------- | ------- |
| `chips.spec.ts` — shadcn                                             | **7 passed**  | 14 s    |
| `panel` + `page-sizer` — both kits                                   | **20 passed** | 1.2 min |
| `embed-isolation.spec.ts` — docs, warm                               | **5 passed**  | 16 s    |
| `virtualization` + `ordering/rows` + `state/persistence` — both kits | **60 passed** | 1.1 min |

That last run covers every defect the full run surfaced: `virtualization:113`, `virtualization:139`,
`ordering/rows:143` and `persistence:50` are all green on both kits.

### The RTL pinning spec

`pinning/rtl-columns.spec.ts` (PR 3, `45e9748e`) **executed for the first time in the migration's
history and passed all 6 executions** — 3 cases × 2 kits, `[209-211]` shadcn and `[464-466]` heroui.

What it would have caught: case `:42` asserts `start.x > end.x` and that the end-pinned column's
trailing edge sits left of the start-pinned one. Both are stated as **relations between the two
pinned columns**, not absolute coordinates, so they fail on an LTR layout rather than being satisfied
by one. Any implementation that kept `left:` / `right:`, or resolved the logical sides physically,
fails there and only there. Design §5 makes this coverage mandatory precisely because the work
changes RTL behaviour by design; before this run, that semantic change was covered by nothing.

---

## 7. Runs that produced no result

Neither a pass nor a failure. Recorded so "no result" does not read as a mystery later.

- **Two `state/persistence.spec.ts` attempts: zero tests executed.** Both died on `Error: Timed out waiting 300000ms from config.webServer`. Playwright could not get a server up inside 5 minutes because `pnpm dev` runs `build:deps` first and the machine was building for several agents at once.
- **One `ordering` + `persistence` + `virtualization` attempt: zero tests executed.** Playwright's `reuseExistingServer` probe timed out against a busy warm server, so it started its own `pnpm dev`, whose `build:deps` step rebuilt `dist` **underneath the running server** before dying on `EADDRINUSE`. The surviving server then returned 500 on every route, `GET /` included. Killed and re-run.

**The operational rule this yields:** keep exactly one dev server, warm it before running, and never
let a second Playwright invocation spawn its own. A targeted run is ~14 s against a warm reused
server and minutes against a cold one — and a collision costs an entire run. The 300 s `webServer`
timeout is not generous when `build:deps` is contended.

A related hazard: a `pnpm dev` that outlives Playwright's timeout **keeps going** and eventually
binds the port. One such orphan was found serving a 20-minute-old `dist`, which would have silently
produced results for a tree three commits behind. Check the age and provenance of a server before
reusing it.

---

## 8. Decisions

### `ci.yml` — nothing added, nothing to remove

**Zero diff in `.github/`.**

- `ci.yml:7` — `on: pull_request: branches: [develop, main, 'integration/**']`. A PR into `integration/tanstack-v9` already triggers the workflow.
- `ci.yml:78` — the `e2e` gate is `if: github.base_ref != 'main' && github.head_ref != 'changeset-release/develop'`. Both terms hold for such a PR, so the full matrix already runs.

**Design §6's premise is false and acting on it is harmful.** It says the browser suite runs only on
PRs into `develop` and asks for a temporary trigger. Because the gate is an **AND**, any addition
there can only ever turn e2e **off**. The safe outcome and the harmful one differ by one `&&`.
**Design §7 row 6's "remove the temporary e2e trigger" is struck** — nothing was added.

Whether `e2e gate` is a _required_ check on `integration/**` is **unknown and not knowable from this
repository**: branch protection lives in GitHub's settings and this repo's rules are documented only
for `develop` and `main`. Stating it either way would be a guess. What is certain from
`ci.yml:123-144` is that the gate's logic is branch-name-independent: fixed name, `needs: e2e`,
`if: always()`, passes on `success` or `skipped` and nothing else.

### `e2e-slots.test.ts` — not extended

**Decision, not a deferral.** The check matches `/data-slot=["']([a-z0-9-]+)["']/` — attribute _name_
`data-slot`, capturing the slot name, never a value, never another attribute. It gave and gives zero
cover over `data-pinned`, the one DOM contract this migration moved.

Rejected on three grounds:

1. **Three of the four attributes whose values the migration moves are not literals on the authored side.** `data-pinned` is `getIsPinned()`'s return value passed through five writers; the string `'start'` lives in core, spelled `ColumnPinSide.Start` — a const-object member, not a string at the site that matters. A name-and-value scanner would find it **nowhere**, mark every spec usage unknown, and fail. The only way to make it pass is an allowlist: a check reporting green about something it did not verify. That is this migration's own defect class, reintroduced inside the tool meant to detect it.
2. It would catch two lines, both already owned and fixed by PR 3, which one suite run catches far more cheaply and with a real message.
3. AGENTS.md says so directly: "A new slot assembled at runtime rather than written as a literal is invisible here; a spec that must address one is the case to reconsider this check, not to widen the regex."

The honest version of the guarantee is different work — resolve a `data-pinned` value a spec addresses
against `ColumnPinSide`'s members through `ts.TypeChecker`, as `docs-option-names.test.ts` resolves
option names. Defensible, and not a regex widening.

The test **was** exercised: it passes on the repaired tree, and it was mutation-checked — renaming
`[data-slot="thead"]` → `thead-bogus` in a repaired spec turns it red (1 failed / 4 passed), restored
green.

---

## 9. What is inherited

**Not run, or run against a tree that has since moved — labelled as such. Both bullets below
were closed by §10; they are kept because the reasoning in them is what §10 had to satisfy.**

- **`@smoke` was run once and has not been re-run since** (recon G1). PR 4 ran it against the tree at `f07a5656` and got **298/298, exit 0, zero console errors, zero failure directories, both kits**. That result is real, and it is also **stale: eleven commits have landed on top of `f07a5656`** — `d279a5dc`, `86b5a546`, `2b916909`, `8825d1ac`, `dbc0b876`, `87304c0a`, `eaaa3098`, `dccc1d78`, `302cd0f9`, `3af550e1` and this document's own. Several changed example feature sets, and three changed the react package itself; the run predates even the chips fix. So neither "never run" nor a bare "298/298" is the honest statement — the honest one is that a passing smoke result exists for a tree eleven commits behind HEAD. This is the same distinction §0 and §2 draw about the full run straddling `d279a5dc`, applied to a result this PR did not produce.

  Why it still matters: `@smoke` is the only check that opens the ~89 data-grid examples no spec drives, and it is excluded from every CI invocation (`--grep-invert @smoke` in `ci.yml:110` and two `package.json` scripts). A missing `registry.ts` entry throws **only at page render** — lint, typecheck and build all pass. Whoever re-runs it must check the **count of tests run**, not the exit code: Playwright exits 0 on an empty selection and nothing sets a fail-on-empty.

- **No full-suite gate exists** (§0).
- **Only the `shadcn` project was used for the mutation proofs.** The repairs are kit-agnostic by construction, but that is an argument, not a measurement.

**Still uncovered:**

- **The controlled × deferred behaviour change** (recon G2) — the migration's one real public behaviour change, and covered by nothing. Re-verified at the time: exactly one example in the tree contains `draft` (`ProductionDeferredApplyExample`), whose own docblock says nothing is fed back through `state` on the deferred axes; `controlled-state.tsx` is controlled but carries no `draft`. No example can exercise the combination, so no spec was written — authoring one is `apps/docs/shared/**`, another PR's territory. What it needs: an example carrying both `draft` and a parent-owned `sorting`, its `manifest.json` entry **and** a `registry.ts` entry, a reference from some `.mdx`, and a spec asserting the v9 behaviour **positively** (the parent's write does not land until `apply()`) so that it fails on v8 rather than passing vacuously. **PR 6's changeset still needs this named in its own sentence.**
- **The pin-shadow opacity case** (recon G5) — the only possible coverage for the `--dg-pin-{start,end}-shadow` rename, and itself trap-shaped: `getComputedStyle` reads `0` for a missing element and a broken one alike, so it is worth nothing without a mutation showing one kit red while the other stays green. Not written.
- **The column-menu pin entries** (recon G4) — no spec names the pin entries in either language. The Russian half is the only check for a silently-accepted stale message key, and it needs the `localization` example to enable pinning first.

**A defect found in passing, outside this PR's territory:**
`apps/docs/shared/data-grid/examples/components/example-task-board.tsx:238` writes bare `deleting`
(i.e. `deleting: true`). Per pr2-outcomes §1.3 that renders **nothing** — no actions column entry, no
delete button, no diagnostic — and after PR 2 it warns in development instead. A docs example
advertises a delete affordance it does not have, and no spec catches it: `editing/deleting.spec.ts`
drives `delete-confirmation` (object form), and the one spec that opens `example-task-board` only
measures the filter panel. The fix belongs in the example. Checked and clear:
`e2e/docs/embed-isolation.spec.ts` makes no console assertions, so the development warning breaks
nothing.

**`verify-manifest-coverage.mjs` is documented as a gate and wired to nothing** — not in
`apps/docs/package.json`, not in `ci.yml`, not in any turbo task, despite
`specs/001-data-grid-docs/tasks.md:195` being ticked. It must be run by hand or any criterion citing
it is satisfied by nothing.

---

## 10. The full suite and `@smoke`, run to completion on a stationary tree

**Date:** 2026-09-16, same machine, same worktree. This section closes the two §9 bullets and the
`controlled × deferred` gap beneath them.

### 10a. The full suite — 518/518

|             |                                                                                    |
| ----------- | ---------------------------------------------------------------------------------- |
| Commit      | **`5c1a85f4`** (`docs: correct the smoke-run line`), the tip when the run started  |
| Command     | `PW_PORT=3664 pnpm exec playwright test --grep-invert @smoke --reporter=line,json` |
| Result      | **518 passed, 0 failed, 0 flaky, 0 skipped. Exit 0.**                              |
| Wall clock  | **10.0 min** (`workers: 1`, `fullyParallel: false`)                                |
| Per project | `docs` 8, `shadcn` 255, `heroui` 255 — 32 spec files                               |

**Read from the JSON report, not from the exit code.** `stats` is
`{"expected":518,"skipped":0,"unexpected":0,"flaky":0}` and every one of the 518 `tests[].results`
entries is `passed`. That is the check §9 demands of a `@smoke` run, applied here too: an exit code
alone cannot distinguish a green suite from an empty selection.

`retries` is `process.env.CI ? 1 : 0` and `CI` was unset, so nothing passed on a second attempt —
the same guarantee §1 records.

**The tree did not move under it, and that is verifiable rather than asserted.** §2's run is
disqualified because `d279a5dc` landed mid-run; this one has the mirror-image property. One commit
did land while it ran — `c22e4c60`, the test of §10c — and it adds vitest cases to
`packages/data-grid/react/react/src/use-data-grid.test.tsx`, a file the docs app does not import and
`tsup` does not bundle. The server was serving `packages/data-grid/react/react/dist/index.js`, built
at **20:12:23**, before the run started and before that commit; it was never rebuilt. So the browser
saw exactly `5c1a85f4`'s artefacts from first test to last.

**Why 10.0 min against §2's 16.1.** The stand was prepared the way §7's operational rule says:
**one** dev server, started once, then **every route the suite touches warmed to HTTP 200 before
Playwright was invoked** — the two docs page groups plus all 55 example slugs referenced from the
specs, across both kits. §2 paid `next dev`'s per-route compilation inside the measurement; this run
did not, which is also why the four `embed-isolation` cases and `virtualization:113` — §2's
cold-start failures — are simply green here.

**Failure classification: there is nothing to classify.** Every one of §2's twenty failures is
accounted for in this run rather than by argument: the six `chips` cases (fixed by `d279a5dc`), the
two of §5 that were the author's own error, `ordering/rows:143`, `persistence:50`,
`virtualization:139`, and the five cold-start cases all executed and passed.

### 10b. `@smoke` — 298/298, re-run against HEAD

§9's bullet is closed. The stale result stood at `f07a5656`, eleven commits behind.

|                     |                                                                    |
| ------------------- | ------------------------------------------------------------------ |
| Commit              | **`c22e4c60`**, HEAD at the time of the run                        |
| Command             | `PW_PORT=3664 pnpm exec playwright test --grep @smoke --workers=4` |
| Result              | **298 passed, 0 failed, 0 flaky, 0 skipped. Exit 0.** 2.7 min      |
| Per project         | `shadcn` 149, `heroui` 149                                         |
| Failure directories | `apps/docs/test-results` — **0 entries**                           |

**The count is the number that matters**, per §9: Playwright exits 0 on an empty selection, so 298
executed tests — the same 298 the `f07a5656` run measured — is what says the selection did not
silently shrink. Read from the JSON report's `stats`, not inferred.

"Zero console errors" is not a separate observation here: `smoke.spec.ts` collects `pageerror` and
`console.error` per page and asserts the array is empty inside each test, so 298 passes **is** that
claim, for every example and both kits.

### 10c. `controlled × deferred` — the §9 gap, closed in the React package

§9 asks for an e2e spec and says no example can carry one. That is still true of the examples, and
the behaviour is nonetheless now asserted — one level down, where it can be stated exactly.
`c22e4c60` adds two cases to `use-data-grid.test.tsx`
(`useDataGrid — controlled state under deferred apply`).

The subject is the `onStateChange` subscriber, which carries two filters whose **order** is the
thing nothing stated:

```ts
const projected = projectApplied === undefined ? next : projectApplied(next)
if (isControlledEcho(previous, next, controlledStateRef.current)) return
if (projected === undefined) return
```

What each case asserts:

1. **`does not report the controlled prop back to the consumer while deferring`** — on a grid with
   `draft: true` and a parent-owned `columnVisibility`, the consumer's own write moves the store (the
   controlled publish is an ordinary write now that `syncControlledState` is gone) and must **not**
   come back through `onStateChange`. Without the skip, a consumer mirroring the callback into React
   state loops. This is the v8 skip, restated in the deferred configuration.
2. **`keeps the applied-emitter baseline current across a suppressed echo`** — the ordering claim, and
   the one that was covered by nothing. `projectApplied` is stateful: it compares against its own last
   projection, so it has to be fed **every** store value including the ones the echo filter is about
   to swallow. The case drives exactly that: the consumer hides a column (suppressed as an echo), then
   the grid itself moves that slice back to the value the emitter last saw beforehand. With the
   projection fed unconditionally the comparison is against the consumer's value and the change is
   emitted; with the two checks written the obvious way round the baseline is stale, the comparison
   reports `unchanged`, and a change the grid made on its own initiative **never reaches the consumer
   at all**.

**Mutation proofs**, to the standard §4c set — each mutation must hit exactly the case that claims it:

| #   | Mutation applied to `use-data-grid.ts`                                  | Case 1  | Case 2  |
| --- | ----------------------------------------------------------------------- | ------- | ------- |
| 1   | swap the two checks (`isControlledEcho` first, `projectApplied` second) | GREEN   | **RED** |
| 2   | `isControlledEcho` → `return false`                                     | **RED** | GREEN   |

Mutation 1 was additionally run against the **whole** React package: **1 failed, 745 passed**. The
one failure is case 2. That is the measurement behind "covered by nothing" — not an assertion that
the gap existed, but the demonstration that 745 other tests are blind to it. (Mutation 2 also reds
two pre-existing cases, `notifies the consumer but does not loop when it ignores the clamp` and
`does not invoke onStateChange when state prop is the source of the change`, which is expected: the
echo skip was already covered **undeferred**. Its deferred half was not.)

The pre-existing `useDataGrid — draft with a mirrored controlled state prop` case stays green under
both mutations, which is correct and worth recording: its claim is structural — the deferred axes are
owned by `options.atoms`, so a controlled write to one does not land — and has nothing to do with
either filter.

After each mutation the source was restored from a copy and `git status` checked: only the intended
test file differs, and `find -name "*.bak"` returns 0.

**What is still not covered**, so this does not read as more than it is: the combination is asserted
in jsdom against the React adapter, not in a browser against a real kit, and §9's account of why
stands — no example carries both `draft` and a parent-owned axis, and authoring one is
`apps/docs/shared/**`. The two items beside it in §9 — the pin-shadow opacity case (G5) and the
column-menu pin entries (G4) — are untouched and remain uncovered.

### 10d. What §10 does not change

Still true, and not affected by any of the above:

- **No CI has ever run against this branch.** It is unpushed with no PR; every figure here remains a
  local measurement on one machine.
- **Whether `e2e gate` is a required check on `integration/**` is unknown\*\* (§8).
- The mutation proofs of §4c were run on `shadcn` only; §10c's are jsdom, so kit-independent.
