# 0017. Release from `develop`; `main` is fast-forwarded, never merged into

- Status: Accepted
- Recorded: 2026-10-27

## Decision

Merging the "version packages" PR into `develop` **is** the release. On every push to `develop`,
`.github/workflows/release.yml` either opens/updates that PR (changesets pending) or runs
`pnpm release` and then fast-forwards `main` to the same commit (none pending). `main` takes no
PRs: it is the "published" pointer, the Vercel production branch, and always an ancestor of
`develop`. The promote step pushes without `--force`, so anything but a fast-forward fails rather
than rewriting `main`.

## Context, rationale and rejected alternatives

**Before.** A release took two PRs: the version PR into `develop`, then a `develop → main` PR
whose merge triggered `publish` on `main`. The second PR carried a tree `develop` had already
gated and added nothing but a step to forget. It also had to be merged with a merge commit: a
squash left `main` with a commit `develop` did not contain, so the next release PR took the old
merge base and conflicted on every file the previous release touched, with identical content on
both sides (#234 → #238). Recovery needed `git merge -s ours origin/main` on `develop`.

**Why the version commit must land on `develop`.** It deletes the consumed `.changeset/*.md`
files. Changesets accumulate on `develop`, so a version commit that lands only on `main` leaves
them in place on `develop`, and the next version run consumes them a second time — a double bump.
Every scheme that puts the bump on `main` alone therefore needs a `main → develop` back-merge
after each release. That rules out the obvious alternative of pointing the version PR (or a
separate release branch) at `main`: it trades one extra PR for one extra PR plus a back-merge.

**Why `main` survives at all.** Trunk-based (features and the version PR straight into `main`)
is the stock changesets flow, but `main` is the Vercel production branch, so the production docs
would document every merged API before it reaches npm. Keeping that guarantee would mean moving
production deploys to a deploy hook, and `close-linked-issues.yml` and the `integration/**`
holding branches are built around `develop`. A fast-forwarded `main` keeps the guarantee for
free: it only moves when the release queue is empty, and only after `pnpm release` succeeded.

**Consequences.**

- A docs-only or changeset-free merge with an empty queue reaches production docs at once
  (`changeset publish` is a no-op there). While changesets are pending, it waits for the release.
- Publishing runs only when `.changeset/` holds no changeset at the pushed commit — the action
  picks version _or_ publish, never both. If a feature's changeset lands after the version PR was
  last refreshed and before it is merged (or a queued run is superseded by a push carrying one),
  that run versions instead: the bumped versions sit on `develop` unpublished, `main` does not
  move, and the next version-PR merge publishes them together with the newer bumps. Nothing is
  lost or double-bumped; the release is delayed by one cycle. An `--empty` changeset counts as
  pending too, and version mode skips it without opening a PR, so one left on `develop` stalls
  promotion silently — delete it.
- The promote push needs to pass `main`'s classic branch protection (required `verify`). It
  does so because `CHANGESETS_TOKEN` belongs to a repo admin and `enforce_admins` is off. A PAT
  reissued for a non-admin breaks the promote step (publishing is unaffected); fix it with a
  bypass for that actor, not by turning off protection.
- npm trusted publishing trusts the workflow file (`release.yml`) with no environment, not a
  branch, so publishing from `develop` needed no npm-side change.
- `ci.yml` no longer triggers on PRs into `main`, so a stray PR there never gets its required
  `verify` and cannot be merged. Hotfixes go through `develop` like everything else.
- The one-time switch required fast-forwarding `develop` to `main`, whose last release merge
  commit `develop` did not contain (identical trees).
