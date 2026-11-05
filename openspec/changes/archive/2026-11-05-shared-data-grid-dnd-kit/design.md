# Design

## Context

See `proposal.md` for motivation and `specs/data-grid-dnd-kit-adapter/spec.md` for the contract.

Both kit adapter modules have identical executable sources. They import only React, dnd-kit and
the shared grid contract. Each exports seven runtime values and ten types, with `AnchorSide`
occupying both namespaces. Their adapter object is constructed once at module scope.

The React package currently has no drag peer dependencies or dedicated adapter entry. Both kits
declare `@dnd-kit/react` and `@dnd-kit/dom` at `^0.5.3` as optional peers and development
dependencies. Kit builds already externalize `/^@dnd-kit\//`, including the sortable subpath.

ADR 0002 requires separate grid and drag registry items; ADR 0014 requires built-output
tree-shaking evidence. Neither decision is superseded. Existing `data-grid-reorder-mode`
requirements remain unchanged. The existing tree-shaking loop constructs its non-drag entry list
from the HeroUI manifest for both kits; this change must make that enumeration kit-specific.

## Goals / Non-Goals

**Goals:** One implementation of the library binding; compatible kit imports; opt-in installation
and bundling; one place to maintain behavior tests; continued React 18 support for the shared entry.

**Non-Goals:** New adapter configuration knobs, an adapter factory, a drag library replacement,
reordering algorithm changes, UI styling, new component slots or exporting unrelated utilities.
The adapter contract remains the extension seam for future kit-specific implementations.

## Decisions

### 1. Durable: The library binding has one optional public entry

Place the canonical implementation in `packages/data-grid/react/react/src/dnd-kit/adapter.tsx`
with an explicit export entry at `src/dnd-kit/index.ts`. Publish it as
`@ez-kit/data-grid-react/dnd-kit` through a dedicated tsup entry and package export. Preserve
the current module-level `adapter` object, helper semantics and structural public types.

Import grid values and types from internal contract modules, rather than importing this package's
root back into itself. The React root, `kit`, cell-types and other ordinary entries must never
re-export or import the implementation. The shared code authors no visual styling.

Alternatives: Adding the binding to the ordinary `kit` barrel would expose drag peers to unrelated
consumers. A new package adds release and installation machinery for a binding that already fits
the React adapter's optional entry model. Keeping only a collection of shared helpers leaves the
provider and sortable-hook logic duplicated. A factory has no current differing configuration to
serve; consumers can compose or replace the existing `DndAdapter` members when needed.

### 2. Durable: Kit paths remain compatibility and customization seams

Make both kit `src/dnd.tsx` modules explicit value/type re-exports from the new entry. Preserve all
existing names, including both namespaces of `AnchorSide`; the helper exports are already public
through these paths. Keep the HeroUI `./dnd` build/export and the installed shadcn file at
`components/data-grid/dnd.tsx`. Preserve the shadcn import recipe in its wrapper's docblock.

Handles, table primitives and DOM-ref forwarding stay in the kits. Each kit can later replace its
wrapper with a genuinely different implementation without changing the grid's adapter contract.
No kit is imported by the shared implementation.

Alternative: Rewriting all consumers to the shared path would remove the kit extension seams and
unnecessarily break existing imports. A bare `adapter` re-export alone would drop public helpers
and types.

### 3. Durable: Optional peers and build boundaries move with the implementation

Add both dnd-kit packages to the React package's optional peers and development dependencies using
the currently supported ranges. Retain the compatible kit peer declarations and test range
alignment between the owner and wrappers. Do not upgrade the library in this change. Edit
manifests and run plain `pnpm install` to update the lockfile.

Externalize all dnd-kit specifiers in the React build using the existing kit regex approach.
Keep root declarations independent of drag peer types. Add a measured size budget to the new
entry, excluding its runtime dependencies as other package budgets do. Kit adapter budgets then
measure their compatibility wrappers, with the React dependency ignored.

Alternatives: Ordinary dependencies would install drag support for every grid. Externalizing only
`@dnd-kit/react` can inline `@dnd-kit/react/sortable`; inspecting output from the new entry is
required in addition to inspecting consumer bundles.

### 4. Durable: Registry delivery keeps its two-item contract

Retain `data-grid` and `data-grid-dnd`, the existing per-item URLs, file target and both drag
dependencies. The drag item contains only its compatibility wrapper. Its grid dependency already
declares `@ez-kit/data-grid-react` directly in the consumer's project.

Keep supported peer ranges aligned with the shared implementation. The grid item's React range
is generated from the package version, and must have a lower bound at a release containing
`./dnd-kit`. Use the existing version/release process rather than manually changing version fields;
test registry imports against the corresponding built/packed React package. Production registry
deployment follows publication of that release under the existing develop release flow.

Alternative: Removing the drag item loses the established install path and its explicit opt-in.
Keeping a React range that admits an older package can strand consumers with a missing subpath.

### 5. Behavior tests belong to the implementation; compatibility tests belong to the wrappers

Consolidate the union of the existing kit adapter scenarios under `src/dnd-kit/adapter.test.tsx`.
Retain kit tests for runtime export identity and type compatibility through both established paths.
Exercise the canonical tests under React 18 as well as the standard environment.

Extend built-output checks to enumerate every non-adapter JavaScript entry from each package's
own manifest, covering React and both kits. Add positive adapter controls, externalization checks,
and a consumer import/type-check check with drag resolution unavailable for ordinary entries.
Update entry classification when the new built entry is added, without broadly relaxing expected
reachability. Keep the shadcn payload checks and existing browser drag suites for both kits.

Alternative: Retaining two full copied behavior suites preserves unnecessary maintenance work;
testing only re-export equality misses an adapter regression. Source-import checks alone cannot
establish the reachability of emitted chunks or declarations.

## Risks / Trade-offs

- Shared chunks accidentally make drag reachable from ordinary entries -> test built output for
  every non-adapter entry, with positive controls for the optional adapter entries.
- Sortable code is silently vendored -> externalize the complete dnd-kit namespace and inspect
  emitted output as well as a consumer bundle.
- Registry users resolve an older React release -> enforce the generated minimum version and
  test the installed wrapper against the matching package artifacts.
- Moving tests loses a scenario or changes mocking boundaries -> migrate the union of existing
  cases, then run compatibility tests, React 18 and both kits' browser suites.
- A kit needs different behavior later -> keep the adapter interface and both kit entry points;
  introduce a customization only when that difference exists.

## Migration Plan

1. Add the canonical entry, optional peers, build entry and tests; retain the existing public
   structural types and supported library versions.
2. Replace kit implementations with compatible wrappers and verify old imports and browser flows.
3. Regenerate the registry and verify its content, dependencies and package-version requirement.
4. Update documentation to explain the direct shared import and both compatible kit paths. Add
   an additive minor changeset for the React package and patch notes for HeroUI and docs as needed;
   never name the private shadcn package in a changeset.
5. Before archiving, record decisions marked Durable in a new ADR referencing ADRs 0002 and 0014,
   and add its concise rule to `AGENTS.md`. Leave accepted ADR decisions intact.

Before publication, rollback can revert this DnD change while preserving unrelated branch work.
After publication, retain the new public subpath and existing kit paths and fix forward; rolling
back the supplying package while serving registry wrappers that import it would break consumers.
