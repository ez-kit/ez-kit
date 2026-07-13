---
name: task-flow-execute
description: Autonomous parallel execution of ez-kit board tasks that are already in Ready (planned via task-flow-plan). Dispatches up to 3 isolated worktree workers that implement, gate, and open PRs, then verifies each PR (code review + isolated visual check) and moves it to In review. Use when the user says "task-flow-execute", "выполни задачи", gives 1-3 Ready issue numbers to execute, or asks to run/ship planned tasks in parallel.
---

# task-flow-execute — autonomous parallel execution

Takes **1–3 tasks that are already in `Ready`** (planned and approved via
`task-flow-plan`) and drives each to a PR in `In review` — in parallel, isolated, with no
per-task interaction from the user. The user's only remaining touchpoint is reviewing the
finished PRs (admin gate → merge → Done).

Board statuses: **Backlog → Ready → In progress → In review → Done**. This skill moves
`Ready → In progress → In review`. **`Done` is the admin's manual action.**

Shared board mechanics (never hand-roll GraphQL):

```bash
node .claude/skills/task-flow-plan/scripts/board.mjs status <issue#> "In review"
```

## Preconditions

- Each requested issue is in **`Ready`** with an approved plan comment. If not, **skip it
  and report** — do not plan here (that's `task-flow-plan`'s job).
- Max **3** tasks per run (concurrency cap). More than 3 → take the first 3, tell the user
  the rest wait for the next run.
- Chromium for the visual check is a one-time global install; if a worker reports it's
  missing, run `npx playwright install chromium` (cached in `~/.../ms-playwright`, shared
  across all worktrees).

## Architecture — everything parallel

Two overlapping, fully-parallel phases. Read `references/orchestration.md` for the exact
dispatch mechanics and `references/worker-brief.md` for the brief each worker receives.

### Phase B — workers (parallel, up to 3, isolated worktrees)

Dispatch one subagent per task via the **Agent tool with `isolation: "worktree"`** — each
gets its own git worktree, so parallel file edits never collide. Assign a distinct
**`PW_PORT`** per worker (worker _i_ → `3100 + i`, e.g. 3101/3102/3103) for its isolated
dev server + browser. Each worker autonomously:

1. `Ready → In progress`
2. reads the approved plan from the issue comment; implements it in its worktree
3. objective gate — all must pass: `lint`, `typecheck`, `test`, `build` of the affected
   package, **plus** its own isolated visual check (own dev server on `PW_PORT` + own
   Chromium via `scripts/visual-check.mjs`) for visual/UI/docs tasks
4. commits, pushes branch `issue-<N>-<slug>`, opens a **draft** PR with `Closes #<N>`
5. for visual/UI/docs tasks, posts a **visual-verification comment** on the PR
   (`scripts/visual-report.mjs`): the screenshots it looked at, one section per path
   (embedded image + HTTP status + title + console errors) so the reviewer sees exactly
   what was checked. Images are uploaded as assets on a shared `visual-artifacts`
   prerelease (public repo → they render inline; nothing binary lands on the issue branch).
6. returns a structured result (PR url, gate results, files). It does **not** move the card
   to In review — verification comes next.

### Phase C — verification (parallel, per returned PR)

As each worker returns, verify its PR concurrently (no shared resource — each is an
independent subagent on a different diff):

1. **code review** — a `code-reviewer` subagent on the PR diff (separate lane; the
   implementer never reviews itself). Address nothing here — just judge.
2. If clean (no CRITICAL/HIGH) → mark the PR **ready for review** and
   `node board.mjs status <N> "In review"`.
3. If issues → post them as PR review comments, leave the card in **In progress**, and flag
   it in the summary. Do not advance to In review on red.

The visual "manual look" already happened inside the worker (its own browser), so Phase C
needs no shared playwright MCP and stays fully parallel.

## Final report

One table: issue → PR → gate result → code-review verdict → board status. Surface every
skipped/failed task with the reason. Then stop — the user reviews the PRs (gate #2).

## Guardrails

- Never touch `main`; each worker works only on its own `issue-<N>-<slug>` branch.
- Never set `Done`; never merge.
- A task only reaches `In review` after its objective gate AND code review are green.
- Follow-up on the user's PR comments is a future `task-flow-address` mode — out of scope.
