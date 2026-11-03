# 0024. Language dictionary subpaths export `messages`

- Status: Accepted
- Recorded: 2026-11-03
- Related: [0023-operator-labels-in-messages](./0023-operator-labels-in-messages.md)

## Decision

Each language subpath under `@ez-kit/data-grid-core/messages/*` exports its full dictionary as
the named export `messages`. The English export is the same object as `defaultMessages`, which
remains the grid's default and is exported from the core entry. This supersedes only the export
names in ADR 0023; its other decisions remain in force.

## Context, rationale and rejected alternatives

The language is already in the import path. A uniform named export makes the subpaths consistent,
including when loaded dynamically. Consumers importing several dictionaries can alias them to
`enMessages` and `ruMessages`; this also avoids collisions with calendar locales. A default export
would allow arbitrary local names, but a named export gives every module the same explicit contract.
The shipped-dictionaries and tree-shaking tests guard the exports and their independent bundles.
