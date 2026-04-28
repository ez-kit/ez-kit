# Releasing Packages

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing to npm.

## Full release flow (all changed packages)

```bash
pnpm changeset        # Create a changeset — describe what changed and select affected packages
pnpm version-packages # Apply version bumps and update CHANGELOGs
git add . && git commit -m "chore: version packages"
pnpm release          # Build and publish to npm
```

## Release a single package

When you only want to bump one package (e.g. `@ez-kit/zu-store`):

**1. Create a targeted changeset**

```bash
pnpm changeset
```

In the interactive prompt:

- Use arrow keys + **space** to select **only** the package you want to release
- Leave all other packages unselected
- Choose the bump type: `patch` / `minor` / `major`
- Write a short description of what changed

This creates a file like `.changeset/some-random-name.md`.

**2. Apply version bumps**

```bash
pnpm version-packages
```

Only packages that have a pending changeset will have their `package.json` and `CHANGELOG.md` updated.

**3. Commit the version bump**

```bash
git add .
git commit -m "chore: release @ez-kit/zu-store"
```

**4. Publish**

```bash
pnpm release
```

`pnpm release` publishes only packages whose version has changed and is not yet on npm — so unrelated packages are safe.

## Check what will be released

Before publishing, inspect pending changesets:

```bash
pnpm changeset status
```

Output shows which packages have unreleased changesets and what the next version will be.

## Bump types

| Type    | When to use                                      |
| ------- | ------------------------------------------------ |
| `patch` | Bug fixes, internal refactors, no API changes    |
| `minor` | New features, backwards-compatible API additions |
| `major` | Breaking changes                                 |

## Manual publish (escape hatch)

If you need to bypass Changesets entirely:

```bash
cd packages/zu-store
npm publish --access public
```

> **Not recommended** — skips CHANGELOG generation and version synchronisation across the monorepo.

## Troubleshooting

**Problem:** `pnpm release` published more packages than expected.  
**Cause:** Other packages had open changesets from previous runs.  
**Fix:** Run `pnpm changeset status` before releasing to review what is pending. Remove stale `.changeset/*.md` files if they were created by mistake.

---

**Related commands**

```bash
pnpm changeset        # Create changeset
pnpm version-packages # Bump versions
pnpm release          # Publish to npm
pnpm changeset status # Preview what will be released
```
