# 0010. `layout.classNames` is a nested bag whose keys accumulate

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)

## Decision

**`layout.classNames` is a nested bag, and its keys join across option layers** — the only option that does. No flat `wrapperClassName` / `scrollClassName`.

## Context, rationale and rejected alternatives

- **`layout.classNames` is a nested bag, and its keys accumulate.** Every other class option is
  a flat `<thing>ClassName` string (`headerClassName`, `cellClassName`, `footerClassName`), so
  `layout.wrapperClassName` / `layout.scrollClassName` was considered and rejected: those two are
  the two boxes of one shell, not two independent slots, and the bag keeps them named for the
  `data-slot` each one carries. The keys also **join** across option layers instead of replacing —
  the only option that does. A kit's frame and an app's addition are both wanted, and a layer
  cannot restate what it did not write, whereas naming `pageSize` is a decision that overrides the
  one below. Nothing de-conflicts the result: the package knows nothing about Tailwind, and a
  consumer that needs `border-0` to beat `border` runs its own value through `cn()` first.
  Note a kit that ships a stylesheet does **not** need this — a `[data-slot='table-scroll']` rule
  reaches both boxes, and the shadcn kit frames the grid that way. The option exists for the thing
  a stylesheet cannot do: class one grid rather than every grid.
