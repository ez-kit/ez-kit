---
name: task-flow-execute
description: Autonomous execution of a single ez-kit board task that is already in Ready (planned via task-flow-plan). Works strictly in the current worktree — it does NOT create a worktree, only a branch — then implements, gates, and opens a PR, verifies it (code review + isolated visual check), and moves it to In review. Use when the user says "task-flow-execute", "выполни задачу", gives one Ready issue number/link to execute, or asks to run/ship a planned task.
---

# task-flow-execute — autonomous single-task execution

Takes **one task that is already in `Ready`** (planned and approved via `task-flow-plan`) and
drives it to a PR in `In review` — in the **current worktree**, autonomously, with no
per-step interaction from the user. The user's only remaining touchpoint is reviewing the
finished PR (admin gate → merge → Done).

Board statuses: **Backlog → Ready → In progress → In review → Done**. This skill moves
`Ready → In progress → In review`. **`Done` is the admin's manual action.**

Shared board mechanics (never hand-roll GraphQL):

```bash
node .claude/skills/task-flow-plan/scripts/board.mjs status <issue#> "In review"
```

## Preconditions

- The input is **exactly one** issue (number or link). If more than one is given, take the
  first and tell the user the rest are out of scope for this run.
- The issue is in **`Ready`** with an approved plan comment. If not, **stop and report** — do
  not plan here (that's `task-flow-plan`'s job).
- **Current worktree only.** This skill never creates a git worktree. It works in place on
  the checkout it is invoked from, creating a dedicated branch for the task. The working tree
  must be clean before it starts (no uncommitted changes) — if it is dirty, stop and report.
- Chromium for the visual check is a one-time global install; if it's missing, run
  `npx playwright install chromium` (cached in `~/.../ms-playwright`).

## Architecture — implement here, review in a separate lane

Two phases, run in the current worktree by the main session.

### Phase B — implement the task (in place)

The main session does the work directly in the current worktree — it does **not** spawn a
worktree worker. Read `references/worker-brief.md` for the exact steps and the deterministic
wrapper scripts every gate/visual/push step must go through. In short:

1. `Ready → In progress`
2. create the branch `issue-<N>-<slug>` from `main` in the current worktree (never edit on
   `main` directly)
3. read the approved plan from the issue comment; implement it
4. objective gate — all must pass: `lint`, `typecheck`, `test`, `build` of the affected
   package, **plus** an isolated visual check (dev server on `PW_PORT=3101` + Chromium via
   `scripts/visual-check.mjs`) for visual/UI/docs tasks
5. commit, push branch `issue-<N>-<slug>`, open a **draft** PR with `Closes #<N>` — the
   visual verdict from step 4 goes in the PR body as a one-line note (screenshots are **not**
   uploaded to the PR)

### Phase C — verification (separate lane)

Once the PR is open, verify it — **do not self-approve** (per the repo's execution rules):

1. **code review** — dispatch a `code-reviewer` subagent on the PR diff (separate lane; the
   implementing context never reviews itself). Just judge — fix nothing here.
2. If clean (no CRITICAL/HIGH) → mark the PR **ready for review** and
   `node board.mjs status <N> "In review"`.
3. If issues → post them as PR review comments, leave the card in **In progress**, and flag
   it in the summary. Do not advance to In review on red.

The visual "manual look" already happened during Phase B (isolated browser), so Phase C needs
only the code review.

## Final report

One short summary: issue → PR → gate result → code-review verdict → board status. If the task
was skipped or failed, state the reason. Then stop — the user reviews the PR (gate #2).

## Guardrails

- Never touch `main`; all work happens on the `issue-<N>-<slug>` branch in the current
  worktree.
- Never create a worktree; never set `Done`; never merge.
- The task only reaches `In review` after its objective gate AND code review are green.
- Follow-up on the user's PR comments is a future `task-flow-address` mode — out of scope.
