# Design: task-flow skills — ez-kit board workflow

**Date:** 2026-07-06
**Status:** Approved (design) — split into two skills + parallel execution

## Problem

Tasks live in the GitHub Project board **ez-kit / Project 2**. Every task should move
through a fixed lifecycle with human gates, and the user wants to run **several tasks in
parallel** by handing them to agents. Doing this by hand is error-prone; codify it.

## Board facts

- **Statuses:** `Backlog → Ready → In progress → In review → Done`
- **`Done` is set only by the admin.**
- Access needs the `read:project` + `project` gh scopes.

## Two skills

The workflow is split by human involvement:

### `task-flow-plan` — grooming (serial, human gate #1)

Input: a list of issue links/numbers, or "fetch the backlog". Per task, one at a time:
analyze → plan (via `omc-plan` for non-trivial) → **user approves** → post plan comment
(Russian) → move `Backlog → Ready`. No code, no worktree. Can groom many tasks in one
sitting; execution happens later. The plan comment must be self-sufficient — it is the
only context the autonomous executor gets.

### `task-flow-execute` — autonomous parallel execution

Input: 1–3 issues already in `Ready` (planned). Everything is parallel; the user does not
verify anything by hand (agents do it) and only reviews the finished PRs.

**Phase B — workers (parallel, ≤3, isolated worktrees).** One subagent per task via the
Agent tool with `isolation: "worktree"`, each assigned a distinct `PW_PORT` (3101/3102/
3103). Each worker autonomously: `Ready → In progress`; implement per the plan; objective
gate (`lint`/`typecheck`/`test`/`build` + its own isolated visual check); commit; push
`issue-<N>-<slug>`; open a **draft** PR `Closes #<N>`; return a structured result. Workers
do **not** move the card to In review.

**Phase C — verification (parallel, per PR).** As each worker returns, a `code-reviewer`
subagent reviews its PR diff (separate lane — the implementer never reviews itself). Clean
→ `gh pr ready` + move `In progress → In review`. Issues → post PR comments, leave in
`In progress`, flag in the report. No shared resource, so every PR verifies independently.

Then the user reviews the In-review PRs (gate #2) → admin merges → sets `Done`.
Addressing PR comments is a future `task-flow-address` mode (out of scope).

## Isolated visual check (the key technical decision)

The interactive playwright **MCP** is a single shared browser in the main session — it
cannot be driven by parallel agents. So each worker runs its **own** headless Chromium via
`scripts/visual-check.mjs` (uses `@playwright/test`'s `chromium`, resolved from the
worktree's `apps/docs`) against its **own** dev server on its `PW_PORT`. The script visits
each path, captures a screenshot + accessibility snapshot + HTTP status + console errors,
and prints JSON; the worker agent Reads the screenshots and judges — "go look once", but
isolated and parallel. Chromium is a one-time global install (`npx playwright install
chromium`, cached across all worktrees).

Enabling repo change: `apps/docs/playwright.config.ts` reads the port from `PW_PORT`
(default 3100) and only reuses an existing server when `PW_PORT` is unset — so each worker
gets a fully isolated dev server. Shipped as its own PR.

## File layout

```
.claude/skills/task-flow-plan/
  SKILL.md
  scripts/board.mjs            # shared board mechanics (both skills call this path)
  references/plan-template.md
.claude/skills/task-flow-execute/
  SKILL.md
  scripts/visual-check.mjs     # isolated per-worktree Chromium walkthrough
  references/worker-brief.md   # the contract handed to each Phase B worker
  references/orchestration.md  # how the orchestrator dispatches + verifies
```

`.claude/skills/` is gitignored — these skills are local-only by design.

### `board.mjs`

Resolves all Projects v2 ids dynamically via gh, behind: `status <issue#> "<name>"`,
`comment <issue#> <file>`, `show <issue#>`, `list [<status>]`. Fails with a clear scope
hint if `project`/`read:project` is missing.

## Guardrails

- One approval gate per task in planning; never batch-approve blindly.
- Workers only touch their own branch; never `main`, never merge, never set `Done`.
- A task reaches `In review` only after its objective gate AND code review are green.
- Concurrency cap: 3 workers per execute run.

## Success criteria

- `task-flow-plan` turns Backlog issues into Ready tasks with self-sufficient plan comments.
- `task-flow-execute` drives ≤3 Ready tasks to In-review PRs in parallel with no per-task
  user interaction, each fully isolated (worktree + own dev server + own browser).
- No task reaches `In review` with a red gate or a failing code review.
