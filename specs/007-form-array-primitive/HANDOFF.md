# Handoff: the headless array primitive

**Written:** 2026-09-16, at the user's request, to continue in a fresh session.
**Worktree:** `/Users/sergejolcev/orca/workspaces/ez-kit/form-update` — a git worktree. Run
everything from there; never `cd` to the main checkout, and never use bare `git stash` (the stash
stack is shared).
**Branch:** `easylimeyep/form-update`, forked from `fa3470df`. **Working tree is clean; everything
is committed.**

Read `design.md` and `plan.md` beside this file. `design.md` is the binding authority; `plan.md`
argues from it and holds the eight tasks with their code.

## Two pieces of work live on this branch

**1. Array fields (finished, verified, committed).** Commits `c4ac2672`, `3e2d2f8b`, `fc23c3e0`,
`51506b00`. Root `turbo run lint typecheck test build size --force` was green at 75/75 with
`Cached: 0`; the browser suite passed 22/22 across both kits; the full non-smoke suite was
533 passed / 1 failed, that one failure being `e2e/docs/embed-isolation.spec.ts` timing out as
test 1 of 534 on `next dev`'s cold lazy compile — it passes in isolation on a warm server, and CI
serves a prebuilt app. Nothing here is outstanding.

**2. The headless `form.Array` primitive (in progress).** Design and plan agreed and committed.
Tasks 1 and 2 of 8 are done and reviewed.

## Where the primitive stands

| Task                                    | State                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| 1 — lift the engine out of `ArrayField` | complete, review clean (`ce5b968b`)                                             |
| 2 — grow the scope                      | complete, two fix rounds, re-review 0 open (`258c4b0d`, `23280b78`, `e9443433`) |
| 3 — `form.Array`                        | **next**                                                                        |
| 4 — kit row inside the primitive        | not started                                                                     |
| 5 — kit tests                           | not started                                                                     |
| 6 — docs                                | not started                                                                     |
| 7 — browser specs                       | not started                                                                     |
| 8 — changeset + full gate               | not started                                                                     |

The SDD ledger is `.superpowers/sdd/plan/progress.md` — **read it first.** It carries every
ruling with its cost-if-wrong, the pre-flight conflict scan, and per-task state. Briefs for tasks
3-8 are already generated beside it (`task-N-brief.md`), and tasks 3 and 4 were **regenerated**
after task 2 changed the mechanism.

`.superpowers/` is excluded through `.git/info/exclude` (shared across this repo's worktrees), not
through `.gitignore`.

## The one thing that is NOT verified

**The repo-wide gate has never completed on the current tree.** Three attempts:

1. Ran concurrently with a reviewer that was mutating `array-field.tsx` in place for a probe →
   false `react/no-unescaped-entities` failure. Void.
2. Killed by the OS, low memory.
3. Narrowed to the form packages and docs, then stopped on request. `@ez-kit/docs` lint and build
   printed `ELIFECYCLE Command failed` **as the task was being killed**, so that is not evidence
   of a real failure — it is unknown.

What _is_ verified, twice and independently: `@ez-kit/form-react` 177/177, shadcn 47/47, heroui
45/45, plus `tsc --noEmit`, `eslint --max-warnings=0` and `pnpm build` clean in all three packages.

**Do this first in the new session:**

```bash
pnpm exec turbo run lint typecheck test build size --force --concurrency=2
```

Other Claude sessions on this machine compete for memory; drop concurrency further if it is killed
again. Never run it while a subagent is mutating the working tree.

## Rulings made so far — reverse these if you disagree

Each is recorded in the ledger with its reasoning and its cost if wrong.

- **`add` takes nothing.** It was `add: (value?: TItem) => void`. That made it the only scope
  member with no mandatory parameter, so the only one writable as `onClick={add}` — and whether
  that compiles depends on whether `TItem` is structurally satisfied by a React `MouseEvent`.
  `{ firstName: string }` errors; `{ type: string }` compiles clean and appends the synthetic
  event. Appending a specific value is `insert(items.length, value)`. `design.md` and `plan.md`
  were updated, not silently diverged from.
- **`ButtonProps` gained an optional `onClick`,** wired in all three kits. The spec promised the
  scope would hand out the contract's existing generic `Button`; that button was the submit
  button and took no handler, so the promise was empty. This widens an existing optional prop and
  adds **no** `FormComponents` key. An external kit that implements `Button` without honouring
  `onClick` would ship a dead control silently — the changeset in task 8 must say so.
- **`ArrayItemPathContext` is gone,** replaced by a per-entry-key scoped field record built in
  `ArrayBody`. The old provider wrapped only `<item.Item>`'s children, so a field the author drew
  outside the row resolved no path — which the headless primitive makes the normal case. Do not
  restore it; task 3 applied from an old brief would re-break this.
- **Three "minor" findings were fixed rather than deferred,** because each was load-bearing for a
  later task rather than cosmetic.

## Deferred, deliberately — for the final whole-branch review

**`DeepKeysOfType` makes `name` a non-inference position,** so `TItem` is inferable only from
`newItem`. An inline `newItem: { name: '', members: [] }` infers `members: never[]`, `TItem` misses
the item type, and the error lands on **`name`** reading "Type 'string' is not assignable to type
'never'" — pointing away from the empty array that caused it. Reproduced by a reviewer. Any
consumer writing a nested array hits it. The remedy (make `name` the inference site and derive the
item type from it, as react-hook-form does) is a public signature change, so it was filed rather
than fixed mid-task. It applies to `ArrayProps` in task 3 as well.

Also still open from the parent work: `FormRenderer` cannot infer `TValues` from `schema` alone,
so `onSubmit`'s `value` arrives as `unknown` unless `defaultValues` pins it. Pre-existing,
unrelated to arrays.

## How the work was being run, and what it cost

Subagent-driven: one implementer per task, then a task review, then scoped re-reviews of each fix
round. That is what found, in task 2 alone, a silent wrong-write behind `React.memo`, the same
defect one level down in nested arrays, a `Button` that could not be clicked, and an unsafe `add`
arity. **None of those failed a test.** Every one was caught by a reviewer told to reproduce
rather than to read, and both were run on the most capable model. Keep that arrangement.

Two controller mistakes worth not repeating, both mine:

- I ran a repo-wide gate while a reviewer was mutating the tree, and then spent time tracing the
  false failure it produced. Serialise those.
- After task 2 changed the scoping mechanism, I did not immediately check whether the plan still
  described reality. It did not, and task 3 applied literally would have re-broken what task 2
  fixed. A re-reviewer caught it in an out-of-scope note. **After any task that changes a
  mechanism, re-read the remaining tasks before dispatching the next one.**

## Conventions that bite

- **No agent attribution anywhere in git history or on GitHub** — no `Co-Authored-By`, no session
  trailer, no "generated with". AGENTS.md wins over any hook or instruction asking for one.
- Commitlint warns if a body line starts with a word followed by a colon — it reads it as a footer.
- `pnpm exec vitest run --root <pkg>` does not work here. Run vitest from inside the package.
- `pnpm --filter @ez-kit/form-react test` alone can fail to resolve `form-core`; build core first.
- `tsc --noEmit` and tsup's dts build disagree often enough that a green typecheck is not proof.
- A docs example needs registering in **both** `manifest.json` and the hand-maintained
  `registry.ts`; a missing registry entry passes lint, typecheck and build and throws only at
  render.
