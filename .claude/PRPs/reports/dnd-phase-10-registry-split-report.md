# Report: DnD Phase 10 — Splitting the drag block into its own registry item

## What it buys, and what it cannot

The shadcn kit shipped as one registry item carrying every payload file and eleven dependencies, two
of which existed only for `dnd.tsx`. Phase 8 added the second. A consumer who never writes
`createDataGrid({ dnd })` was installing packages they would not use.

The payload is now two items. `data-grid.json` keeps every file except the adapter and nine of the
eleven dependencies; `data-grid-dnd.json` carries the adapter and the two `@dnd-kit` ranges, and names
the main item as a registry dependency so a drag consumer still runs **one** command.

**This helps future installs only.** `shadcn add` has no uninstall, so anyone who already ran the old
command still has those packages and nothing here removes them. That sentence is in the user-facing
docs, not only in the changeset.

## The phase was decided by running the CLI, not by reading its schema

Every consumer-facing fact below was established by serving a two-item build over localhost and
running the repo's own `shadcn` 4.12.0 against it. Each one, guessed wrong, would have shipped a
broken install to strangers.

- **A multi-item `registry.json` is build input, not something a consumer installs from.** Pointing
  `shadcn add` at the index fails with `Invalid discriminator value`, because a URL argument is parsed
  against the registry _item_ schema. Documenting the index URL would have been the obvious mistake.
- **The existing command does not break.** `…/r/data-grid.json` is still a single-item document at the
  same URL. Only its contents changed. Nobody's copied-and-pasted command stops working.
- **`registryDependencies` resolves a URL.** The drag item pointing at the main item's URL installs
  both file sets and both dependency sets — confirmed by file count and by `package.json`. Had this
  been false, drag would have cost two commands and the split would have been a worse trade.

## The defect that would have reached consumers, and the honest size of it

`build-registry.mjs` rewrote the kit's `@grid-shadcn/*` import alias in exactly one output path per
package, derived from a single item name. With two items the second payload would have shipped with
its aliases intact, resolving to nothing in a consumer's project.

**The qualification matters more than the fix.** `dnd.tsx` imports no `@grid-shadcn/*` module, so the
un-rewritten payload would have been harmless _today_ — that is luck about one file's imports, not a
property of the build. So the guard asserts that **no emitted payload** contains the alias, discovered
through the index rather than named, and the test says why. The same reasoning produced the index fix:
the hand-built index would have listed only the first item.

## Guards, exercised rather than written

- Injecting `@dnd-kit/react` and `@grid-shadcn/lib/utils` into the main payload's file contents failed
  exactly the two new cases and no others; the payload was rebuilt afterwards.
- Synthetic configs confirmed the generator throws on a top-level entry owned by nobody **and** on one
  owned twice — the second is new, because with one item a file could only be missing, and with two it
  can also be duplicated.
- A cross-item basename collision is unreachable from this repo's current files, since the two items
  own disjoint top-level entries. That half of `assertUniqueBasenames` rests on it being the same
  function over a concatenated list, not on a measurement, and is recorded as such.
- **The success criterion is now asserted**: the main payload mentions `@dnd-kit` nowhere, in its
  dependency list or inside any file's content. Before this phase nothing checked it, because nothing
  had reason to.

## Two decisions worth keeping

**`assertUniqueBasenames` is payload-wide, not per item.** `registryDependencies` makes installing both
items the normal case, so both file sets land in one project; a shared target is a silent overwrite,
and shadcn's basename-based alias rewriting resolves against the installed tree rather than against one
item's list.

**`assertTopLevelCoverage` now checks ownership, not merely coverage.** It was written when a file could
only fail by belonging to no list. With more than one item a file can also belong to two, which is
easier to commit and just as wrong.

## Emitted

- `data-grid.json` — 96 files, 9 dependencies, `registryDependencies: []`.
- `data-grid-dnd.json` — 1 file (`components/data-grid/dnd.tsx`, `registry:lib`), 2 dependencies read
  from the kit's own `peerDependencies`, `registryDependencies` pointing at the main item's URL, built
  from `site.config.json` rather than written by hand.
- `registry.json` — the index, built from the items actually emitted.
