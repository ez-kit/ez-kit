# Dev-flow & release branching for ez-kit

**Date:** 2026-07-15
**Status:** Approved (design) — pending implementation plan

## Goal

Turn ez-kit into a production-ready development repo with a release-oriented
branch model, enforced-but-fast git hooks, real CI, and consolidated tooling.
`main` becomes a release-only branch (Vercel production + npm release point);
`develop` becomes the day-to-day integration branch.

## Decisions (locked)

- **Branch model:** `develop` = integration, `main` = release.
- **Vercel:** stays connected with Production Branch = `main`. Production docs
  deploy only on release; `develop` + feature branches get preview URLs. No repo
  change — documentation only.
- **CI:** add GitHub Actions running the full gate on PRs.
- **Commit hooks:** `lint-staged` (pre-commit) + `commitlint` (commit-msg).
- **task-flow skills:** retargeted to `develop`.
- **Extras in scope:** repo/.github hygiene, gitignore cleanup, docs refresh,
  Node pinning.
- **Extras out of scope (for now):** changesets release automation, Dependabot.

## Design

### 1. Branch strategy

- Create `develop` from current `main`; push it; set it as the **GitHub default
  branch** so PRs target it by default.
- **Branch protection** via `gh api`:
  - `develop`: require PR, require passing CI status checks, block force-push.
  - `main`: require PR (the `develop → main` release PR), require passing CI.
- Feature branches fork from and merge into `develop`. Releases are a manual
  `develop → main` PR.
- Vercel: confirm Production Branch = `main` (unchanged). Documented, not coded.

### 2. Format command consolidation

Current state has two mechanisms formatting the whole repo: Turbo per-package
tasks (`format`, `format:check`) and root scripts (`format:write`,
`prettier:check`). The Turbo route adds process overhead and caches nothing
(no `outputs`).

**Target — two root verbs only:**

- `format` → `node ./scripts/prettier.mjs --write`
- `format:check` → `node ./scripts/prettier.mjs --check`

Remove: root `format:write` + `prettier:check`; Turbo `format` + `format:check`
tasks in `turbo.json`; per-package `format` + `format:check` scripts. Repoint
husky and CI to the two survivors.

### 3. Git hooks (husky) — must stay fast

- **pre-commit** → `lint-staged` on staged files only:
  - `*.{ts,tsx,js,jsx,mjs,cjs}` → prettier write + `eslint --fix --max-warnings=0`
  - `*.{json,md,mdx,css,yml,yaml}` → prettier write
- **commit-msg** → `commitlint` with `@commitlint/config-conventional`
  (allowed types match existing convention: feat, fix, refactor, docs, test,
  chore, perf, ci).
- **pre-push** → keep `pnpm ci:fast` as a local safety net.

New dev deps: `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`.
New files: `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.mjs`,
`lint-staged` config (in root `package.json` or `.lintstagedrc.json`).

### 4. GitHub Actions CI

`.github/workflows/ci.yml`:

- Triggers: `pull_request` into `develop` and `main`.
- Steps: checkout, pnpm setup, Node from `.nvmrc`/`packageManager`,
  `pnpm install --frozen-lockfile`, Turbo cache (`actions/cache`), then the full
  gate `pnpm ci` (lint → typecheck → test → build → size).
- **fumadocs `.source` gotcha:** docs lint/typecheck need generated `.source`
  from a real `next build`. `pnpm ci` runs lint/typecheck _before_ build, so CI
  must generate `.source` first (build docs / run `fumadocs-mdx` up front) or the
  docs steps flake. Resolve in the workflow.
- Concurrency group to cancel superseded runs per branch.

### 5. task-flow retarget

Update `task-flow-plan` / `task-flow-execute` skills and their references so new
task branches fork from and PR into `develop`, and any "base = main" assumptions
become `develop`. `main` is release-only.

### 6. Extras

- **B. .github hygiene:** `.github/pull_request_template.md`, `CODEOWNERS`.
- **C. Node pinning:** `.nvmrc` + `engines.node` in root `package.json`
  (aligned with the CI Node version and `packageManager` pnpm pin).
- **D. gitignore hygiene:** ensure `.playwright-mcp/` and `.omc/` are ignored;
  untrack any committed scratch files.
- **F. Docs:** update `CLAUDE.md` + `AGENTS.md` with the branch model, new format
  commands, hooks, CI gate, and release flow (`develop → main` PR).

## Out of scope

- changesets `changesets/action` npm publish automation (revisit later; needs
  `NPM_TOKEN`).
- Dependabot / Renovate.
- Turbo remote caching.

## Risks / notes

- Switching the default branch mid-flight: existing open feature branches were
  cut from `main`; they still merge cleanly into `develop` (identical tip at
  branch creation). Future branches use `develop`.
- pre-push `ci:fast` on a monorepo can feel slow; CI is now the authoritative
  gate, so pre-push can be lightened later without losing coverage.
- Branch protection changes require repo-admin token/permissions for `gh api`.
