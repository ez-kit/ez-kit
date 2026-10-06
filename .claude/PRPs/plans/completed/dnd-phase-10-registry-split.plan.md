# Plan: DnD Phase 10 — Split the drag block into its own registry item

## Summary

The shadcn kit ships as one registry item carrying every payload file and eleven dependencies, two of
which — `@dnd-kit/react` and `@dnd-kit/dom` — exist only for `dnd.tsx`. Phase 8 added the second of
those, and AGENTS.md records the trade: a consumer who never writes `createDataGrid({ dnd })` installs
six packages they will not use, and `shadcn add` has no uninstall.

This phase takes that back for **future** consumers. It cannot take it back for anyone who has already
installed, and nothing here pretends otherwise.

## What a probe settled before any code was written

All of this was confirmed by serving a two-item build over localhost and running the repo's own
`shadcn` 4.12.0 against it — not by reading the schema.

- **`shadcn add` cannot pick one item out of a multi-item file.** A URL argument is parsed against the
  registry **item** schema, so the index fails with `Invalid discriminator value`. The multi-item
  `registry.json` is build input only; the CLI writes one `<name>.json` per item and those are the
  URLs consumers use.
- **Today's documented command keeps working and keeps its meaning.**
  `npx shadcn add …/r/data-grid.json` still installs a single-item document from the same URL. What
  changes is its contents: no `dnd.tsx`, no `@dnd-kit` names. **No existing consumer's command
  breaks.**
- **`registryDependencies` resolves a URL.** A dnd item pointing at the main item's URL installs both,
  confirmed by file count and by both dependency sets landing in `package.json`. So the drag-wanting
  consumer still types **one** command, against a different URL.
- **Nothing couples the two.** `dnd.tsx` imports no `@grid-shadcn/*` file, and no payload file imports
  `dnd.tsx`. So the main item can genuinely be `@dnd-kit`-free, and the dependency between items is a
  convenience we choose rather than one the imports force.

## Problem → Solution

| Problem                                                    | Solution                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Everyone installs `@dnd-kit`, most never drag              | A second item carrying `dnd.tsx` and those two dependencies        |
| The generator hardcodes a one-element `items` array        | Config becomes a list of items; files partition between them       |
| The build rewrites aliases for one output path per package | Rewrite every item's output                                        |
| The hand-built index assumes one item                      | Build it from the items that were actually emitted                 |
| Four payload assertions are written against "the item"     | Re-point them at the dnd payload, and assert the main one is clean |

## Metadata

- **Complexity**: Medium, and almost all of it is in two scripts rather than in the kit.
- **Confidence**: 9/10 — unusually high because the consumer-facing behaviour was executed rather than
  reasoned about. The risk left is in our own build, not in the CLI.
- **Risk**: This ships to strangers and `shadcn add` has no uninstall, so a broken payload is not
  fixable for whoever already ran it. That is what the guards below are for.

## Mandatory Reading

- `scripts/generate-shadcn-registry-manifest.mjs:149-165` — the hardcoded single-element `items`, and
  `:66-78` (`assertTopLevelCoverage`), `:92-111` (`assertUniqueBasenames`), which must keep meaning
  something once files are split across items.
- `apps/docs/scripts/build-registry.mjs:71-91` — the per-package loop: it rewrites exactly
  `${outputDir}/${itemName}.json` and then **overwrites** the CLI's index with a hand-built one.
- `packages/data-grid/react/shadcn/registry.config.mjs:116-147` — `rootFiles`, `excludeTopLevel`,
  `fileTypeOverrides`, `typeByTopDir`, and the dependency list whose last two entries read the kit's
  own `peerDependencies`.
- `apps/docs/test/registry-payload.test.ts` — all five cases; four break, each in the right direction.

## Patterns to Mirror

### RANGE_READ_NOT_WRITTEN_TWICE

The `@dnd-kit` ranges are read from the kit's `peerDependencies`, never typed into the config. The
second item inherits that, and the payload test asserts the equality rather than a literal.

### ORIGIN_FROM_SITE_CONFIG

The dnd item's `registryDependencies` needs the main item's **URL**, and an origin written by hand is
exactly what `scripts/check-site-url.mjs` exists to catch. Take it from `site.config.json`.

## Step-by-Step Tasks

### Task 1: The generator emits a list

- **IMPLEMENT**: the config carries items, each with its own `name`, `type`, `title`, `description`,
  `dependencies`, `registryDependencies` and `targetPrefix`; files are partitioned between them.
- **GOTCHA**: `assertTopLevelCoverage` checks a file is _accounted for_, never by which item. Keep that
  property across the split — a file silently belonging to neither item, or to both, is the failure
  this guard exists to prevent, and it gets easier to commit once there is more than one list.
- **GOTCHA**: `assertUniqueBasenames` currently runs over one item's targets. Decide whether uniqueness
  is per item or across the payload and say which; two items writing different files to the same target
  is a consumer-visible collision.

### Task 2: The build rewrites every item

- **IMPLEMENT**: alias rewriting over each emitted `<name>.json`, and an index built from the items
  actually emitted rather than from a single name.
- **GOTCHA**: this is the defect that would have shipped. With two items the current loop rewrites one
  file and leaves the other carrying `@grid-shadcn/*` imports, which resolve to nothing in a consumer's
  project. Assert in a test that **no** emitted payload contains that alias.

### Task 3: Two items in the kit's config

- **IMPLEMENT**: the main item loses `dnd.tsx` and the two `@dnd-kit` dependencies; a `data-grid-dnd`
  item carries `dnd.tsx`, both dependencies, and `registryDependencies` pointing at the main item's URL
  so one command still installs everything.
- **MIRROR**: RANGE_READ_NOT_WRITTEN_TWICE, ORIGIN_FROM_SITE_CONFIG.

### Task 4: The guards

- **IMPLEMENT**: re-point the three `@dnd-kit` assertions at the dnd payload, mirror the
  "no test files, no barrel" case onto it, update the dependency snapshot to the main item's eight, and
  **add the assertion this phase's success criterion names**: the main payload mentions no `@dnd-kit`
  anywhere. That one is currently asserted nowhere.

### Task 5: Documentation

- **IMPLEMENT**: the second command beside the first in `installation/shadcn.mdx` (both the install and
  the `--diff` occurrence) and in the kit's `README.md`; correct the now-stale claims in
  `drag-and-drop.mdx` about what the install brings; update the payload paragraphs in `AGENTS.md` and
  the kit's `CLAUDE.md`, which currently describe one item. Changeset on `@ez-kit/docs` — the registry
  JSON is served from there — and **never naming `@ez-kit/data-grid-shadcn`**, which is private and
  changesets-ignored.
- **GOTCHA**: say plainly that this helps future installs only. Someone who already ran the old command
  has the packages, and no command removes them.

## NOT Building

- **A per-item install for anything else.** The split is drag-shaped because the dependency is;
  partitioning the kit further is a different question with no evidence behind it.
- **Dropping `registryDependencies` to make the items fully independent.** It costs the drag consumer a
  second command and buys nothing — the probe confirmed one URL installs both.
