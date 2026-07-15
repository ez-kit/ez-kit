# Dev-flow & Release Branching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ez-kit a release-oriented repo: `develop` = integration, `main` = release, with consolidated formatting, fast enforced git hooks, real GitHub Actions CI, and refreshed docs.

**Architecture:** Local file/tooling changes land first on a `chore/dev-flow-setup` branch; then `develop` is created and made the default branch, with branch protection requiring CI. `main` stays the Vercel production branch and future npm release point.

**Tech Stack:** pnpm 10.18.0, Turborepo, husky v9, lint-staged, commitlint (`@commitlint/config-conventional`), GitHub Actions, Prettier (via `scripts/prettier.mjs`), ESLint flat config.

## Global Constraints

- Node: **22.18.0** (pin in `.nvmrc`; `engines.node` = `>=22`).
- Package manager: **pnpm@10.18.0** (already pinned via `packageManager`).
- Conventional commit types: `feat, fix, refactor, docs, test, chore, perf, ci, build, revert, style`.
- Hooks must stay fast — pre-commit operates on **staged files only**.
- Vercel Production Branch stays `main` (documentation only, no repo change).
- No release automation and no Dependabot in this plan (out of scope).

---

### Task 1: Consolidate format commands

**Files:**
- Modify: `package.json` (root scripts)
- Modify: `turbo.json` (remove format tasks)
- Modify: `packages/zu-store/package.json`, `packages/valtio-kit/package.json`, `packages/store-core/package.json`, `packages/data-grid/core/package.json`, `packages/data-grid/react/react/package.json`, `packages/data-grid/react/shadcn/package.json`, `packages/data-grid/react/heroui/package.json`, `packages/data-grid/react/native/package.json`, `apps/docs/package.json` (remove per-package `format`/`format:check`)

**Interfaces:**
- Produces: root scripts `format` = `node ./scripts/prettier.mjs --write`, `format:check` = `node ./scripts/prettier.mjs --check`. No `format:write`, no `prettier:check`, no Turbo `format*` tasks.

- [ ] **Step 1: Confirm which package.json files declare a format script**

Run: `grep -rl '"format"' packages/*/package.json packages/data-grid/**/package.json apps/*/package.json`
Expected: the list of per-package files to edit (use the actual output as the authoritative list).

- [ ] **Step 2: Rewrite root format scripts**

In `package.json`, replace the four format-related script lines with exactly two:

```json
"format": "node ./scripts/prettier.mjs --write",
"format:check": "node ./scripts/prettier.mjs --check",
```

Remove `"format:write"` and `"prettier:check"` entirely.

- [ ] **Step 3: Remove Turbo format tasks**

In `turbo.json`, delete the `"format"` and `"format:check"` task entries from `tasks`.

- [ ] **Step 4: Remove per-package format scripts**

In each package.json from Step 1, delete the `"format"` and `"format:check"` script lines (they only existed to feed the Turbo tasks).

- [ ] **Step 5: Verify format:check still covers the whole repo**

Run: `pnpm format:check`
Expected: Prettier runs once from the root and reports all files formatted (exit 0). If it reports unformatted files, run `pnpm format` then re-run.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: consolidate prettier scripts to root format/format:check"
```

---

### Task 2: Add lint-staged + commitlint git hooks

**Files:**
- Create: `.lintstagedrc.json`
- Create: `commitlint.config.mjs`
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`
- Modify: `package.json` (devDependencies)

**Interfaces:**
- Consumes: root `scripts/prettier.mjs`, root ESLint flat config.
- Produces: pre-commit runs `lint-staged`; commit-msg runs `commitlint`.

- [ ] **Step 1: Install dev dependencies**

Run: `pnpm add -Dw lint-staged @commitlint/cli @commitlint/config-conventional`
Expected: three packages added to root `devDependencies`.

- [ ] **Step 2: Create lint-staged config**

Create `.lintstagedrc.json`:

```json
{
  "*.{ts,tsx,js,jsx,mjs,cjs}": [
    "node ./scripts/prettier.mjs --write",
    "eslint --fix --max-warnings=0"
  ],
  "*.{json,jsonc,md,mdx,css,yml,yaml}": [
    "node ./scripts/prettier.mjs --write"
  ]
}
```

- [ ] **Step 3: Create commitlint config**

Create `commitlint.config.mjs`:

```js
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'perf', 'ci', 'build', 'revert', 'style'],
		],
	},
}
```

- [ ] **Step 4: Create the pre-commit hook**

Create `.husky/pre-commit` (match existing `pre-push` style — bare command, no boilerplate):

```sh
pnpm exec lint-staged
```

- [ ] **Step 5: Create the commit-msg hook**

Create `.husky/commit-msg`:

```sh
pnpm exec commitlint --edit "$1"
```

- [ ] **Step 6: Make hooks executable**

Run: `chmod +x .husky/pre-commit .husky/commit-msg`
Expected: no output.

- [ ] **Step 7: Verify commit-msg rejects a bad message**

Run: `echo "bad message" | pnpm exec commitlint`
Expected: FAIL — errors about missing type / subject-empty.

- [ ] **Step 8: Verify commit-msg accepts a good message**

Run: `echo "feat: add commit hooks" | pnpm exec commitlint`
Expected: PASS (exit 0, no output).

- [ ] **Step 9: Commit (exercises both hooks)**

```bash
git add .lintstagedrc.json commitlint.config.mjs .husky/pre-commit .husky/commit-msg package.json pnpm-lock.yaml
git commit -m "chore: add lint-staged and commitlint git hooks"
```
Expected: pre-commit runs lint-staged on staged files, commit succeeds.

---

### Task 3: Pin the Node version

**Files:**
- Create: `.nvmrc`
- Modify: `package.json` (add `engines`)

- [ ] **Step 1: Create .nvmrc**

Create `.nvmrc` with a single line:

```
22.18.0
```

- [ ] **Step 2: Add engines to root package.json**

Add to `package.json` (top level, after `"packageManager"`):

```json
"engines": {
	"node": ">=22"
},
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./package.json')"`
Expected: no output (valid JSON).

- [ ] **Step 4: Commit**

```bash
git add .nvmrc package.json
git commit -m "chore: pin node version via .nvmrc and engines"
```

---

### Task 4: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a `pull_request` check named **`verify`** used later by branch protection.

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      # Build first so dist/** and the fumadocs .source codegen exist before
      # lint/typecheck/test run (docs steps flake otherwise).
      - name: Build
        run: pnpm build

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Size
        run: pnpm size
```

- [ ] **Step 2: Validate the YAML locally**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!y.includes('name: verify')) throw new Error('job name missing'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI gate for PRs to develop and main"
```

---

### Task 5: .github hygiene

**Files:**
- Create: `.github/pull_request_template.md`
- Create: `.github/CODEOWNERS`

- [ ] **Step 1: Create the PR template**

Create `.github/pull_request_template.md`:

```markdown
## Summary

<!-- What does this PR change and why? -->

## Related issues

<!-- Closes #... -->

## Changes

-

## Test plan

- [ ] `pnpm ci` passes locally
- [ ] Relevant package tests added/updated
- [ ] Docs updated if public API changed

## Notes

<!-- Breaking changes, follow-ups, screenshots. -->
```

- [ ] **Step 2: Create CODEOWNERS**

Create `.github/CODEOWNERS`:

```
* @easylimeyep
```

- [ ] **Step 3: Commit**

```bash
git add .github/pull_request_template.md .github/CODEOWNERS
git commit -m "chore: add PR template and CODEOWNERS"
```

---

### Task 6: Refresh CLAUDE.md and AGENTS.md

**Files:**
- Modify: `CLAUDE.md` (add a "Branching & Release Flow" section; update commands)
- Modify: `AGENTS.md` (mirror the branch/command changes)

- [ ] **Step 1: Update the Commands block in both files**

In `CLAUDE.md` and `AGENTS.md`, update the format command references to the two survivors and note the hooks:

```bash
pnpm format            # Prettier write across the whole repo (scripts/prettier.mjs)
pnpm format:check      # Prettier check across the whole repo
```

Remove any mention of `format:write` / `prettier:check`.

- [ ] **Step 2: Add a "Branching & Release Flow" section to CLAUDE.md**

Insert after the top-level intro / before "## Commands":

```markdown
## Branching & Release Flow

- `develop` is the default integration branch — all feature branches fork from
  and merge into `develop`.
- `main` is release-only: a `develop → main` PR is a release. `main` is the
  Vercel **production** branch (docs deploy on release) and the npm release
  point. `develop` and feature branches get Vercel **preview** URLs.
- CI (`.github/workflows/ci.yml`) gates every PR into `develop` and `main` with
  `build → lint → typecheck → test → size`.
- Git hooks: pre-commit runs `lint-staged` (prettier + eslint on staged files),
  commit-msg enforces Conventional Commits via commitlint, pre-push runs
  `pnpm ci:fast`.
```

- [ ] **Step 3: Mirror a short version into AGENTS.md**

Add the same branching summary (condensed) under an "## Architecture" or new "## Branching" heading in `AGENTS.md`.

- [ ] **Step 4: Format the docs**

Run: `pnpm format`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "docs: document branch/release flow, hooks, and format commands"
```

---

### Task 7: Retarget task-flow skills to `develop`

**Files:**
- Modify: task-flow skill references that assume `main` as the base branch (locate first).

- [ ] **Step 1: Find every `main` base-branch assumption in the task-flow skills**

Run: `grep -rniE '\bmain\b' .claude/skills/task-flow-plan .claude/skills/task-flow-execute 2>/dev/null`
Expected: a list of references. Only the ones that mean "base branch to fork from / PR into" get changed — leave prose like "main goal" alone.

- [ ] **Step 2: Replace base-branch references with `develop`**

For each genuine base-branch reference (branch-from, PR base, `git checkout main`, `--base main`, etc.), change `main` → `develop`. Keep release-only references to `main` where they describe the release target.

- [ ] **Step 3: Grep-verify no stale base references remain**

Run: `grep -rniE 'base.*main|--base main|checkout main|from main' .claude/skills/task-flow-plan .claude/skills/task-flow-execute 2>/dev/null`
Expected: no results (or only intentional release-target mentions).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/task-flow-plan .claude/skills/task-flow-execute
git commit -m "chore: retarget task-flow skills to develop base branch"
```

---

### Task 8: Create `develop`, wire GitHub, verify Vercel

**⚠️ Outward-facing / hard-to-reverse — CHECKPOINT with the user before this task.**

**Files:** none (git + GitHub settings).

- [ ] **Step 1: Push the setup branch and open a PR into `main` OR fast-forward develop**

Because `develop` does not exist yet, create it from the current tip (which now
includes Tasks 1–7) so its first state already has CI + hooks:

```bash
git push origin HEAD:refs/heads/chore/dev-flow-setup
```

- [ ] **Step 2: Create `develop` from the setup branch tip**

```bash
git branch develop
git push -u origin develop
```

- [ ] **Step 3: Set `develop` as the GitHub default branch**

```bash
gh repo edit ez-kit/ez-kit --default-branch develop
```
Expected: confirmation. New PRs now target `develop`.

- [ ] **Step 4: Trigger a first CI run so the `verify` check exists**

Open a trivial PR (or push the setup branch as a PR into `develop`) so the
`verify` check runs once — branch protection can only require a check GitHub has
seen:

```bash
gh pr create --base develop --head chore/dev-flow-setup --title "chore: dev-flow setup" --body "Bootstrap CI, hooks, branching." 2>/dev/null || echo "adjust if branches already merged"
```

- [ ] **Step 5: Protect `develop`**

After the `verify` check has run once:

```bash
gh api -X PUT repos/ez-kit/ez-kit/branches/develop/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```
Expected: JSON response describing the protection. If it errors that context `verify` is unknown, re-run after CI finishes.

- [ ] **Step 6: Protect `main`**

```bash
gh api -X PUT repos/ez-kit/ez-kit/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```
Expected: JSON response. (If the token lacks admin on `ez-kit/ez-kit`, hand these two `gh api` commands to the user to run.)

- [ ] **Step 7: Confirm Vercel production branch**

Vercel is dashboard-configured. Confirm (with the user) that Project → Settings →
Git → Production Branch = `main`, and that preview deployments are enabled for
other branches. No repo change. Record the outcome in the PR description.

---

## Self-Review

- **Spec coverage:** Branch strategy → Task 8; format cleanup → Task 1; hooks → Task 2; CI → Task 4; task-flow retarget → Task 7; extras B → Task 5, C → Task 3, D → verified already-ignored (noted, no task needed), F → Task 6. Vercel = documentation in Task 6/8. All spec sections covered.
- **Placeholder scan:** No TBD/TODO; all configs and commands are literal.
- **Type/name consistency:** CI job/check name `verify` is defined in Task 4 and reused verbatim in Task 8 branch-protection `contexts`. Format script names `format`/`format:check` consistent across Tasks 1 and 6.
- **Note on D:** `.playwright-mcp` and `.omc` are already in `.gitignore` and untracked (verified 2026-07-15); no untracking task required.
