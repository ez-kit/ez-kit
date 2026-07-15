# Releasing Packages

This monorepo uses [Changesets](https://github.com/changesets/changesets) to
version and publish packages to npm. Releases are **automated** — the flow below is
the normal path; manual commands are kept at the end as an escape hatch. This is a
maintainer guide; end-user docs live in the Fumadocs site under `apps/docs`.

## Branch model

- **`develop`** — integration branch. Every feature/fix branch forks from and
  merges into `develop`.
- **`main`** — release-only. A `develop → main` PR **is** a release: `main` is the
  Vercel production branch and the npm publish point. `develop` and feature
  branches get Vercel preview URLs.
- Both are protected — a PR and a green `verify` CI check are required to merge.
- `main` is the GitHub default branch, but tooling pins base branches explicitly
  (`--base develop`), so open normal PRs against `develop`.

## The release cycle

1. **Add a changeset in your feature PR.** Run `pnpm changeset`, select the
   affected packages and bump type, write a summary, and commit the generated
   `.changeset/*.md` with your code. A changeset is an _intent to release_ — it
   doesn't change versions yet. Pre-1.0 packages take **minor** for breaking
   changes (see below).
2. **The version PR opens automatically.** Once changesets sit on `develop`, the
   `version` job keeps a **"chore: version packages"** PR open (mechanics below).
   Merge it when you want to cut a release — this applies version bumps and
   CHANGELOGs to `develop`, but does **not** publish.
3. **Release.** Open a `develop → main` PR and merge it. The `publish` job on
   `main` runs `pnpm release` (`turbo run build && changeset publish`) and
   publishes every package whose version is ahead of npm — with provenance, git
   tags, and GitHub Releases.

Not every merge to `main` publishes: `changeset publish` only pushes packages
whose local version is newer than npm. A `main` merge with no version change is a
no-op.

## How the version PR works

A single bot (`changesets/action`, in `.github/workflows/release.yml`) manages it
through one dedicated branch, `changeset-release/develop`.

**Trigger:** the `version` job runs on every push to `develop` (i.e. every merge).

**Each run:**

1. Check out `develop`.
2. If any `.changeset/*.md` exist, run `changeset version` — bump `package.json`
   versions, update `CHANGELOG.md`, delete the consumed changeset files.
3. Commit as `chore: version packages` and **force-push** to
   `changeset-release/develop`.
4. Create **or update** a PR from that branch into `develop`.

**Why it "updates" instead of stacking commits:** the branch is regenerated from
scratch each run (current `develop` + all pending changesets) and force-pushed, so
the PR always shows exactly what would ship if merged now. The same PR number keeps
refreshing as new changesets land.

**A new version PR is created (new number) when:**

- You **merge** the version PR — changesets are consumed and the branch deleted;
  the next changeset that lands on `develop` produces a fresh branch and PR.
- You **close** it without merging — the next run recreates it.

**No version PR exists** when there are zero pending `.changeset/*.md` files — one
reappears when a new changeset arrives.

The PR is created with the `CHANGESETS_TOKEN` PAT (the org blocks the default
Actions token from creating PRs), which also makes the PR trigger the `verify`
check that branch protection requires.

## Publishing (trusted publishing / OIDC)

Publishing is **tokenless** via npm trusted publishing — no long-lived npm token.
The `publish` job upgrades npm to ≥ 11.5.1 and relies on `id-token: write`;
provenance is automatic.

Each publishable `@ez-kit/*` package needs a trusted publisher on npmjs.com:

- Publisher: **GitHub Actions**
- Organization or user: `ez-kit`
- Repository: `ez-kit`
- Workflow filename: `release.yml`
- Environment: _(empty)_
- Allowed actions: **`npm publish`**

A brand-new package's first version must be **bootstrapped once** from a local
`pnpm release` — a trusted publisher can only be configured after the package
exists on npm. Afterwards, releases are fully automated from CI.

## Excluding a package from publishing

Set `"private": true` in the package's `package.json`. `changeset publish` skips
private packages, so the package stays in the monorepo (buildable, usable via
workspace deps) but is never pushed to npm. Remove the flag when ready to publish.
(`@ez-kit/data-grid-shadcn` is currently private for this reason.)

## Bump types

Pre-1.0 packages (the `data-grid-*` set) are still stabilising: ship breaking
changes as **minor**, not major — fits ez-kit's stance that breaking changes are
acceptable without compat shims.

| Type    | 1.0+ meaning              | Pre-1.0 (`0.x`) meaning             |
| ------- | ------------------------- | ----------------------------------- |
| `patch` | Bug fixes, no API change  | Bug fixes, no API change            |
| `minor` | Backwards-compatible adds | Features **and breaking changes**   |
| `major` | Breaking changes          | Avoid until intentionally going 1.0 |

## Preview what will be released

```bash
pnpm changeset status
```

Shows which packages have unreleased changesets and their next versions.

## Manual release (escape hatch)

The whole cycle can be run locally if CI automation is unavailable — this is also
how a brand-new package is bootstrapped before trusted publishing can be set up:

```bash
pnpm changeset        # create a changeset (or several)
pnpm version-packages # apply bumps + CHANGELOGs (= changeset version)
git commit -am "chore: version packages"
pnpm release          # turbo run build && changeset publish (asks for npm OTP)
git push --follow-tags
```

`pnpm release` publishes only packages whose version isn't yet on npm, so unrelated
packages are safe. Local publishes have no provenance (that requires CI OIDC).

Last-resort single-package publish, bypassing Changesets entirely:

```bash
cd packages/zu-store && npm publish --access public
```

> Not recommended — skips CHANGELOG generation and cross-package version sync.

## Troubleshooting

**`pnpm release` / the publish job published more packages than expected.**
Stale changesets were pending. Run `pnpm changeset status` before releasing and
delete any `.changeset/*.md` created by mistake.

**A package you expected didn't publish.** Check it isn't `"private": true`, and
that its version in the version PR is actually ahead of npm.
