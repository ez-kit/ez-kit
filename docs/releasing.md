# Releasing Packages

This monorepo uses [Changesets](https://github.com/changesets/changesets) to
version and publish packages to npm. Releases are **automated** — the flow below is
the normal path; manual commands are kept at the end as an escape hatch. This is a
maintainer guide; end-user docs live in the Fumadocs site under `apps/docs`.

## Branch model

- **`develop`** — integration branch. Every feature/fix branch forks from and
  merges into `develop`.
- **`main`** — the "published" pointer. It takes **no PRs**: the release workflow
  fast-forwards it to `develop` once a release has been published (or when nothing
  is waiting to be released). It is the Vercel production branch, so production
  docs never describe an unpublished API. `develop` and feature branches get
  Vercel preview URLs. Rationale: `openspec/decisions/0017-release-from-develop.md`.
- Both are protected with a required `verify` check. CI does not run on PRs into
  `main`, so such a PR can never be merged — hotfixes go through `develop` too.
- `main` is the GitHub default branch, but tooling pins base branches explicitly
  (`--base develop`), so open normal PRs against `develop`.

## The release cycle

1. **Add a changeset in your feature PR.** Run `pnpm changeset`, select the
   affected packages and bump type, write a summary, and commit the generated
   `.changeset/*.md` with your code. A changeset is an _intent to release_ — it
   doesn't change versions yet. Pre-1.0 packages take **minor** for breaking
   changes (see below).
2. **The version PR opens automatically.** Once changesets sit on `develop`, the
   `release` job keeps a **"chore: version packages"** PR open (mechanics below).
3. **Release = merge the version PR.** That push to `develop` leaves no pending
   changesets, so the `release` job runs `pnpm release`
   (`turbo run build && changeset publish`), publishing every package whose
   version is ahead of npm — with provenance, git tags, and GitHub Releases — and
   then fast-forwards `main` to the same commit, which deploys the production docs.

Every push to `develop` with no pending changesets takes the publish path, but
`changeset publish` only pushes packages whose local version is newer than npm, so
a docs-only merge publishes nothing and simply moves `main` (and production docs)
forward. While changesets are pending, `main` stays put until the release.

If a publish fails, `main` is not moved. Fix the cause on `develop`; the next push
retries both.

The job runs version **or** publish, never both: if any `.changeset/*.md` is on
`develop` when the version PR merges (a feature landed just before it), that run
opens a new version PR instead of publishing, and the release goes out with the
next merge. An `--empty` changeset counts as pending and never gets a version PR,
so one left behind keeps `main` from moving — delete it.

## How the version PR works

A single bot (`changesets/action`, in `.github/workflows/release.yml`) manages it
through one dedicated branch, `changeset-release/develop`.

**Trigger:** the `release` job runs on every push to `develop` (i.e. every merge).

**Each run with pending changesets:**

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
check that branch protection requires. The same PAT pushes to `main`: its owner is a
repo admin and `main`'s protection does not enforce admins, which is what lets the
fast-forward pass the required `verify`. Reissue it for a non-admin and publishing
still works but `main` stops moving.

## Publishing (trusted publishing / OIDC)

Publishing is **tokenless** via npm trusted publishing — no long-lived npm token.
The `release` job upgrades npm to ≥ 11.5.1 and relies on `id-token: write`;
provenance is automatic. The trusted publisher names the workflow file, not a
branch, so publishing from `develop` needs nothing on the npm side.

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

**`pnpm release` / the `release` job published more packages than expected.**
Stale changesets were pending. Run `pnpm changeset status` before releasing and
delete any `.changeset/*.md` created by mistake.

**A package you expected didn't publish.** Check it isn't `"private": true`, and
that its version in the version PR is actually ahead of npm.
