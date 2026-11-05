# Proposal

## Why

The shadcn and HeroUI kits contain the same executable dnd-kit adapter. Sensors, event translation,
sortable registration, accessibility and drag guards have two maintenance sites even though neither
implementation imports kit components or authors styling. A shared optional entry can remove that
duplication while keeping each kit's adapter entry available for future customization.

## What Changes

- Add `@ez-kit/data-grid-react/dnd-kit` as the canonical adapter entry, exporting `adapter` and the
  existing adapter helpers and types.
- Replace both kit `dnd.tsx` implementations with compatibility re-exports, preserving current
  import paths and exports, including the installed shadcn file's path.
- Declare dnd-kit as optional peers of the React package and externalize all dnd-kit subpaths.
  Ordinary React and kit entries remain usable without those peers.
- Keep the separate `data-grid-dnd` registry item and its two dependency declarations. Ensure the
  installed React package version provides the new entry.
- Move adapter behavior coverage to the canonical implementation and retain kit compatibility,
  built-output isolation, registry and browser regression coverage.

## Capabilities

### New Capabilities

- `data-grid-dnd-kit-adapter`: Direct access to a shared dnd-kit adapter, compatible kit entry
  points, optional dependency isolation and delivery through the shadcn registry.

### Modified Capabilities

None. The existing `data-grid-reorder-mode` requirements and drag behavior remain unchanged.

## Impact

- React package: new adapter source, tests, package export, build entry, optional peer/dev
  dependencies, lockfile update and size budget.
- Both kits: adapter re-export modules and compatibility tests; visual components stay in place.
- Docs: adapter imports/documentation, registry generation and payload tests, tree-shaking tests,
  package-entry classification and relevant drag browser tests.
- Release: an additive React package release and compatible kit/docs release notes. The private
  shadcn package is never named in a changeset.
- Table lifecycle, column caching, forms, the component contract and vendored UI primitives are
  outside this change.
