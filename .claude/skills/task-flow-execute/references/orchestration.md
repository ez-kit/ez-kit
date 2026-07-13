# Orchestration — dispatching parallel workers

How the main session (orchestrator) runs Phase B + Phase C. The orchestrator writes no
code itself; it dispatches workers, verifies their PRs, and reports.

## Preflight

1. Resolve the requested issues (max 3). For each, `board.mjs show <N>` → confirm status is
   **Ready** and that a `## План выполнения` comment exists. Skip + report any that aren't.
2. Assign a `PW_PORT` per accepted task by index: `3101`, `3102`, `3103`.

## Phase B — dispatch workers in parallel

Spawn one Agent per task **in a single message** (so they run concurrently), each with
`isolation: "worktree"`. Suggested agent type: `oh-my-claudecode:executor` (use
`model=opus` for complex tasks; default for small docs/config edits).

Each worker's prompt = the full contents of `references/worker-brief.md` + the concrete
`{ issue number, PW_PORT, affected package, plan summary }`. Tell the worker its final
message must be the structured result (issue, branch, prUrl, gate, visual, notes).

Collect results as workers finish. A worker that dies or can't get a green gate returns a
failure note — keep its card in **In progress** and surface it in the report.

## Phase C — verify each PR (parallel, as they arrive)

For each worker that returned a PR, run verification concurrently — one code-review
subagent per PR, on the diff (`gh pr diff <PR#>` / `gh pr view <PR#>`):

- Spawn a `code-reviewer` subagent (separate lane — the implementer never reviews itself).
  Ask for severity-rated findings against the plan's intent and the ez-kit constraints.
- **Clean (no CRITICAL/HIGH):** mark the PR ready (`gh pr ready <PR#>`) and
  `node <repo>/.claude/skills/task-flow-plan/scripts/board.mjs status <N> "In review"`.
- **Issues found:** post them as PR comments (`gh pr comment <PR#> --body ...` or a review),
  leave the card in **In progress**, and flag in the report. Never advance to In review on
  red.

The worker already did the isolated visual look inside its own worktree, so Phase C needs
no shared browser and every PR verifies independently.

## Report

A single table, most-important-first:

| Issue | PR | Gate | Code review | Status |
|-------|----|------|-------------|--------|
| #12 | #NN | green | clean | In review |
| #16 | #NN | green | 1 HIGH → commented | In progress |
| #19 | — | — | — | skipped (not Ready) |

Then stop. The user reviews the In-review PRs (gate #2) and merges → admin sets Done.

## Concurrency notes

- Cap 3 concurrent workers. If given >3, run the first 3 and tell the user the rest wait.
- Ports 3101–3103 keep each worker's dev server isolated; never reuse 3100 (the default
  `test:visual` port) to avoid clashing with a stray harness run.
