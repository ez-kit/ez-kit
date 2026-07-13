# Execution brief — one task in the current worktree

This is the contract for **Phase B**. The main session runs these steps itself in the
**current worktree** — it does **not** create a worktree and does **not** spawn a worker. It
is autonomous for one issue. Inputs: the **issue number**, the fixed **`PW_PORT=3101`**, the
**affected package filter(s)** (from the plan), and the ez-kit constraints below. Phase B ends
at the open draft PR; it does **not** self-verify past the objective gate and does **not** move
the card to In review — that's Phase C.

Every gate / visual / push step is a **deterministic wrapper script** under
`<repo>/.claude/skills/task-flow-execute/scripts/`. Call these scripts and never hand-roll the
underlying `pnpm`/`git` commands — the correct order, `--no-verify` policy, warm dev server,
and log-to-file (so build output never floods the context) are all baked into the scripts, not
left to judgement. Run every script from the **repo root** unless noted.

## Steps

1. **Claim** — `node <repo>/.claude/skills/task-flow-plan/scripts/board.mjs status <N> "In progress"`.
2. **Read the plan** — `gh issue view <N> --repo ez-kit/ez-kit --comments`. The approved
   plan is the latest `## План выполнения` comment. That plan is your spec.
3. **Branch** — confirm the working tree is clean (`git status --porcelain` empty), then create
   the task branch off `main` in the current worktree:
   `git switch main && git switch -c issue-<N>-<slug>`. Never edit on `main` directly.
4. **Implement** per the plan, honoring the ez-kit constraints below.
5. **Setup** — `pnpm install` (fast; shares the global pnpm store).
6. **Objective gate — one command, fail-fast:**
   ```bash
   node <repo>/.claude/skills/task-flow-execute/scripts/agent-gate.mjs \
     --pkg <pkgA> [--pkg <pkgB> ...] [--docs]
   ```
   Add `--pkg` for every affected package; add `--docs` if the task changes any rendered
   docs page. The script runs, in the only correct order, `build` (turbo, dependency-aware —
   required because package exports resolve to `./dist`) → `lint` → `typecheck` → `test`,
   then `docs:build` last when `--docs` (the Next production build that also produces the
   `.next` the visual step serves). Full output is in `.agent-logs/gate-*.log`; stdout shows
   one line per step and, on failure, the tail of the failing log. Green ends with
   `GATE: PASS`. On red: fix and re-run — do **not** proceed.
7. **Visual check — visual/UI/docs tasks only:**
   ```bash
   node <repo>/.claude/skills/task-flow-execute/scripts/agent-visual.mjs \
     --port <PW_PORT> <path> [<path> ...]
   ```
   Paths come from the plan (the page(s) the task affects). The script serves the
   already-built app via `next start` on your port (warm — no cold-compile timeouts), runs
   the isolated Chromium walkthrough, and tears the server down. Then **Read** the produced
   `apps/docs/.visual/*.png` and `summary.json` (HTTP status, title, console errors) and
   judge like a human would once: change present and correct, no broken layout, no
   unexpected console errors. `.visual/` is scratch — never commit it. Skip for non-visual
   tasks and say so in the result. (There is deliberately **no** separate `test:visual`
   run — that suite screenshots only `/sandbox/data-grid/*`, its baselines are gitignored,
   and cold `next dev` made it ~18 min of zero-signal timeouts.)
8. **Commit** — conventional message (`feat:`/`fix:`/`refactor:`/`docs:`…), scoped to this
   task only; do not sweep in unrelated files.
9. **Push — via the script only (never raw `git push`):**
   ```bash
   node <repo>/.claude/skills/task-flow-execute/scripts/agent-push.mjs \
     --pkg <pkgA> [--pkg <pkgB> ...]
   ```
   It re-runs fast `lint` + `typecheck` as a pre-push safety net, then pushes with
   `--no-verify` baked in (so the repo's husky full-monorepo `ci:fast` does not re-run — the
   authoritative gate already passed in step 6). Red linters → it refuses to push.
10. **Open the draft PR:**
    ```bash
    gh pr create --repo ez-kit/ez-kit --base main --head issue-<N>-<slug> --draft \
      --title "<type>: <summary>" \
      --body "Closes #<N>

    <what changed>

    ## Gate
    - agent-gate: PASS (build/lint/typecheck/test[/docs:build])
    - visual: <verdict, or 'не визуальная'>"
    ```
11. **Post the visual-verification comment (visual/UI/docs tasks only).** After the PR
    exists, publish the screenshots you looked at so the reviewer sees exactly what was
    checked. Runs from `apps/docs` (where `.visual/` lives):
    ```bash
    body=$(node <repo>/.claude/skills/task-flow-execute/scripts/visual-report.mjs \
      --in ./.visual --issue <N> --repo ez-kit/ez-kit \
      --verdict "<your one-line judgement>")
    gh pr comment <PR#> --repo ez-kit/ez-kit --body-file "$body"
    ```
    The script uploads each `.visual/*.png` to the shared `visual-artifacts` prerelease and
    writes the comment body (one section per path: embedded screenshot + HTTP status + title
    + console errors). Skip for non-visual tasks and say so in the result.
12. **Record** the result: `{ issue, branch, prUrl, gate: "PASS", visual: {...}, notes }` —
    this feeds Phase C. Do **not** move the card to In review yet — that happens after code
    review passes.

## ez-kit constraints

- No visual styling in `packages/data-grid/react/react` — only semantic `data-*` attrs.
- `packages/data-grid/react/shadcn/src/components/ui/**` is vendored & immutable; overrides
  live in `src/blocks/`.
- Public API only from `src/index.ts`; ESM-only; strict TS; `import type` for types.
- No magic strings — named constants / enums / lookup maps (see the project TS rules).
- Keep the commit scoped to this task; do not sweep in unrelated files.

## Honest reporting

If the gate cannot go green, or the visual check reveals a real problem you cannot fix,
**stop**: leave the card in **In progress**, do not open the PR on red, and return a failure
note with the exact failing step and the tail from `.agent-logs/`. A red gate reported
honestly is worth far more than a green-looking PR that isn't.
