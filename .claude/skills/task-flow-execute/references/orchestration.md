# Orchestration — running one task in the current worktree

How the main session runs Phase B + Phase C for a single task. There are no parallel workers
and no worktree creation: the main session implements the task in place, then verifies the PR
in a separate lane.

## Preflight

1. Resolve the single requested issue. `board.mjs show <N>` → confirm status is **Ready** and
   that a `## План выполнения` comment exists. If not, stop and report.
2. Confirm the current worktree is clean (`git status --porcelain` empty). If dirty, stop and
   report — do not mix uncommitted changes into the task branch.
3. Use `PW_PORT=3101` for the isolated dev server / browser during the visual check.

## Phase B — implement (in place)

The main session does the work itself in the current worktree, following
`references/worker-brief.md`. It creates the branch `issue-<N>-<slug>` from `main`, implements
the approved plan, runs the objective gate + (for visual tasks) the isolated visual check via
the deterministic wrapper scripts, commits, pushes, and opens the **draft** PR.

If the gate cannot go green, or the visual check reveals a real problem that can't be fixed,
**stop**: leave the card in **In progress**, do not open the PR on red, and report the exact
failing step with the tail from `.agent-logs/`.

## Phase C — verify the PR (separate lane)

Once the PR is open, run verification — the implementing context never approves its own work:

- Spawn a `code-reviewer` subagent on the diff (`gh pr diff <PR#>` / `gh pr view <PR#>`). Ask
  for severity-rated findings against the plan's intent and the ez-kit constraints.
- **Clean (no CRITICAL/HIGH):** mark the PR ready (`gh pr ready <PR#>`) and
  `node <repo>/.claude/skills/task-flow-plan/scripts/board.mjs status <N> "In review"`.
- **Issues found:** post them as PR comments (`gh pr comment <PR#> --body ...` or a review),
  leave the card in **In progress**, and flag in the report. Never advance to In review on
  red.

The isolated visual look already happened in Phase B, so Phase C needs only the code review.

## Report

A short summary, most-important-first:

| Issue | PR | Gate | Code review | Status |
|-------|----|------|-------------|--------|
| #12 | #NN | green | clean | In review |

Then stop. The user reviews the In-review PR (gate #2) and merges → admin sets Done.

## Notes

- Port `3101` keeps the visual dev server clear of `3100` (the default `test:visual` port) so
  a stray harness run doesn't clash.
- The whole run stays on `issue-<N>-<slug>` in the current worktree — `main` is never touched.
