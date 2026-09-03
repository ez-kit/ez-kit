# Multi-file source panel for docs examples

**Date:** 2026-08-14
**Status:** Approved, ready for planning

## Problem

A docs example's source panel shows exactly one file — the entry component. Every example that
splits its code across files therefore reads as incomplete. `/docs/data-grid/production` is the
clearest case: `ProductionExample.tsx` imports `orderColumns` from `./data`, `useOrders` from
`./use-orders`, and that in turn imports `./server`. The column definitions — the part a reader
most wants to copy — are invisible, and the only way to make them visible today is to inline them
into the entry file, which makes the grid example itself noisy.

## Goal

Show every file an example is built from, as tabs above the code, with the entry file staying
minimal. Which files appear is derived from the imports — no per-example registration, no paths
written by hand.

## Design

### Collection

New server-only module `apps/docs/components/example-files.ts`:

```ts
collectExampleFiles(entryPath: string, rootDir: string): Promise<ExampleFile[]>
```

It parses the entry file with `typescript`, reads its **relative** import specifiers (`./`, `../`),
resolves each against the filesystem (`.tsx`, `.ts`, then `index.tsx` / `index.ts`), and repeats
for each resolved file — transitively, breadth-first, deduplicated, with a visited set that also
serves as cycle protection.

Excluded by construction:

- Non-relative specifiers (`react`, `@ez-kit/*`, `shared/DataGrid`) — those are packages a reader
  installs, not files they write.
- Anything resolving outside `rootDir`.
- Anything that is not `.ts` / `.tsx` (JSON manifests in particular).
- A dependency whose basename starts with `_` (`_data.ts`, `_memory-adapter.ts`) — in this repo
  that prefix already marks a shared internal fixture pulled in by many unrelated examples, not a
  file that belongs to the one being viewed. Its own imports are not traversed either. The entry
  file is exempt from this rule: it is what the reader asked for, regardless of its name.

An unresolvable relative import is skipped silently. The panel is display-only, exactly like
`extractExampleSource`, so failing a docs build over it would be the worse trade.

Result order: entry file first, then dependencies in BFS/import order.

### Data shape

```ts
type ExampleFile = {
	name: string // basename, e.g. "data.ts" — the tab label
	path: string // path relative to rootDir — disambiguates colliding basenames
	source: string // display-ready source
	language: string // from the extension: .ts → "ts", .tsx → "tsx"
}
```

### Slicing

The entry file keeps today's behaviour: `extractExampleSource` reduces it to the one export the
manifest names, so files holding several examples still show only the relevant one.

Dependency files are shown **whole**. A dependency file exists to hold one concern (the columns,
the hook, the mock server); slicing it would only hide part of what the reader came for.

### Consumers

Both example conventions go through the same collector:

- `apps/docs/components/example-source.ts` — `readExampleSource(id): string` becomes
  `readExampleFiles(id): ExampleFile[]`, with `rootDir` from `EXAMPLE_SOURCE_DIRS[entry.product]`.
- `apps/docs/components/live-preview.tsx` — same call, `rootDir = shared/examples`.

`rewriteExampleImports` runs per file, so a dependency importing `shared/DataGrid` displays the kit
package like the entry file does.

`kit-example.tsx` / `kit-example-client.tsx` / `example-preview.tsx` pass `files` where they passed
`source`.

### UI

`SourcePanel` takes `files: ExampleFile[]`.

- One file → renders exactly as today, no tab bar. Thanks to the `_`-prefix exclusion above, this
  covers not just the examples that were single-file before this change but also the ~58 examples
  that only ever imported a shared `_`-prefixed fixture — they too render unchanged.
- More than one → a shadcn `Tabs` bar (`apps/docs/components/ui/tabs.tsx`, already vendored) above
  the code block. Tab label is `name`; `path` is used only when two files share a basename.
- The entry file's tab is active on mount.
- Copy copies the active file.
- Collapse / "Show all" measures the active file, so switching tabs re-measures.

## Testing

Unit tests for `collectExampleFiles` in `apps/docs/test/`:

- transitive collection (entry → `use-orders` → `server`)
- import cycle terminates, each file appears once
- non-relative specifiers are not collected
- a relative import escaping `rootDir` is not collected
- unresolvable relative import is skipped without throwing
- ordering: entry first, then import order

Manual verification: `/docs/data-grid/production?kit=heroui` shows four tabs and the columns file
is readable; a single-file example (e.g. a zu-store `LivePreview`) is unchanged.

## Out of scope

- Changing which files an example is split into.
- The embed routes / live preview iframe — untouched.
- Showing files not reachable through imports.
