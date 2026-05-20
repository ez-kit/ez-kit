# Implementation Plan: Data-Grid Documentation Site

**Branch**: `001-data-grid-docs` | **Date**: 2026-05-19 | **Spec**: [./spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-data-grid-docs/spec.md`

## Summary

Add a "Data Grid" docs section under `apps/docs/content/docs/data-grid/`, parallel
to the existing `zu-store/` section, that documents all consumer-facing surfaces of
the data-grid packages (`@ez-kit/data-grid-shadcn`, `@ez-kit/data-grid-heroui`)
plus advanced/contributor reference for `@ez-kit/data-grid-core` and
`@ez-kit/data-grid-react`.

**Technical approach**: reuse the existing Fumadocs + Sandpack infrastructure
unchanged. The only new code is one MDX shortcode — `<DataGridDocsExample
exampleId="..." />` — that wraps the existing `DataGridSandpackExample`
(`apps/docs/shared/data-grid/sandpack/DataGridSandpackExample.tsx`) with an
in-page flavor toggle (shadcn ↔ heroui). Doc pages reference examples by their
manifest slug only; the
[examples manifest](../../apps/docs/shared/data-grid/examples/manifest.json)
remains the single source of truth (FR-007). No new examples are added in this
feature.

## Technical Context

**Language/Version**: TypeScript 5.x (workspace `tsconfig.base.json`), MDX
content authored as `.mdx` in `apps/docs/content/docs/data-grid/`.

**Primary Dependencies**: Fumadocs (`fumadocs-core` 16.8.5, `fumadocs-ui`
16.8.5, `fumadocs-mdx` 14.3.2), Next.js 16.2.4, React 19.2, Sandpack
(`@codesandbox/sandpack-react` 2.20). All already installed in
`apps/docs/package.json` — no new dependencies needed.

**Storage**: N/A. Content is filesystem-only (mdx files under
`apps/docs/content/docs/`). Examples manifest is `manifest.json`.

**Testing**:

- Vitest in `apps/docs` for the new `<DataGridDocsExample>` MDX shortcode
  (smoke render + prop contract).
- Playwright visual regression (already configured at
  `apps/docs/playwright.config.ts`) for at least one representative data-grid
  doc page in light and dark themes.
- `pnpm docs:build` (which runs `sandpack:build` then `next build`) as the
  build-cleanliness gate per FR-013.

**Target Platform**: Static-export-friendly Next.js docs site (whatever
hosting target `apps/docs` currently uses — same as the existing site).

**Project Type**: monorepo docs subproject (`apps/docs`).

**Performance Goals**:

- LCP < 2.5 s on data-grid landing.
- Sandpack first-paint < 3 s on data-grid pages with embedded examples
  (Sandpack bundles are heavy: 290 KB – 1.4 MB; see
  `apps/docs/shared/data-grid/sandpack/generated/`).
- No regression to the existing site's CWVs.

**Constraints**:

- NON-NEGOTIABLE constitution principles I–V apply (see Constitution Check).
- `pnpm docs:build` MUST stay green and report zero warnings.
- Doc pages MUST NOT duplicate example code into mdx (FR-003).
- mdx pages SHOULD stay 200–400 lines; MUST stay under 800 lines per
  Additional Constraints in the constitution.
- No I18n in scope.
- `@ez-kit/data-grid-native` out of scope.

**Scale/Scope**:

- ~27 pages targeted in FR-002.
- ~44 existing manifest entries to be referenced across those pages
  (SC-002 requires 100% reference coverage).
- 1 new shared MDX component (`DataGridDocsExample`).
- 1 new `meta.json` for the data-grid section.
- 1 edit to `apps/docs/content/docs/index.mdx` (top-level landing link).
- 1 edit to `apps/docs/components/mdx.tsx` to register the new shortcode.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution version evaluated: **0.1.0**.

| Principle / Constraint | Relevance | Pass? | Notes |
|---|---|---|---|
| I. Layered Headless Architecture (NON-NEGOTIABLE) | Indirect | ✅ | Feature touches docs only. No runtime code added to `packages/`. The new MDX shortcode reuses `DataGridSandpackExample` and the manifest unchanged. |
| II. No Style Bleed in Shared React Package | Indirect | ✅ | `packages/data-grid/react/react` is not modified. New styling lives in `apps/docs/`, not in the shared React package. |
| III. Vendored Primitives Are Immutable | Indirect | ✅ | `packages/data-grid/react/shadcn/src/components/ui/**` is not modified. |
| IV. Test-First Discipline (NON-NEGOTIABLE) | Direct | ✅ | The new `<DataGridDocsExample>` shortcode is code; a failing Vitest test will be written first, then the implementation. A Playwright visual test for one representative page covers end-to-end behavior. MDX prose content itself is not unit-tested — that is consistent with how the existing `zu-store` docs operate. |
| V. Breaking Changes Documented via Changesets | Indirect | ✅ | `apps/docs` is a private workspace package (`"private": true` per `apps/docs/package.json` defaults for monorepo apps) — it is not published, so no changeset is required for the docs app itself. Any data-grid package break documented inline must already have a changeset on its source package; this feature is downstream content. |
| Additional: ESM-only, TS strictness, lint --max-warnings=0 | Direct | ✅ | New code follows the same strict TS + ESM pattern as the rest of `apps/docs`. |
| Additional: Single public entry | N/A | ✅ | Not applicable to a docs subproject. |
| Additional: Size budgets | N/A | ✅ | `apps/docs` has no `size-limit` budget (`pnpm size` is a no-op for docs per its package.json). |
| Additional: Immutability | Direct | ✅ | New shortcode uses local `useState` and renders Sandpack; no shared mutation. |
| Additional: File size 200–400 typical, max 800 | Direct | ✅ | mdx pages will be authored to that envelope; the shortcode component is small (~50 LoC expected). |
| Additional: Docs sandbox parity | Direct | ✅ | This feature explicitly enforces parity (FR-006) by exposing both flavors via the new shortcode's toggle, and by reusing existing dual-flavor examples. |
| Workflow: TDD | Direct | ✅ | See Principle IV row. |
| Workflow: Local CI parity | Direct | ✅ | `pnpm ci` MUST pass before merge; FR-013 makes `pnpm docs:build` the doc-specific gate. |

**Gate result**: PASS. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-data-grid-docs/
├── plan.md              # This file (/speckit-plan output)
├── spec.md              # Feature specification (/speckit-specify output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── docs-page.md             # Authoring contract every mdx doc page must satisfy
│   └── data-grid-docs-example.md # MDX shortcode contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root, only files this feature touches)

```text
apps/docs/
├── content/
│   └── docs/
│       ├── index.mdx                          # EDIT: add link to data-grid section
│       └── data-grid/                         # NEW directory
│           ├── meta.json                      # NEW: navigation + learning order
│           ├── index.mdx                      # NEW: Overview
│           ├── getting-started.mdx            # NEW
│           ├── architecture.mdx               # NEW
│           ├── installation/
│           │   ├── meta.json
│           │   ├── shadcn.mdx
│           │   └── heroui.mdx
│           ├── columns/
│           │   ├── meta.json
│           │   ├── index.mdx                  # Defining columns
│           │   ├── column-helper.mdx
│           │   ├── column-visibility.mdx
│           │   ├── column-pinning.mdx
│           │   └── resizing.mdx
│           ├── sorting.mdx
│           ├── filtering/
│           │   ├── meta.json
│           │   ├── index.mdx                  # Basic filtering
│           │   ├── operators.mdx
│           │   ├── panel.mdx
│           │   ├── date-range.mdx
│           │   ├── multi-value.mdx
│           │   └── global.mdx
│           ├── pagination.mdx                 # Uses base-full example (see research.md)
│           ├── selection/
│           │   ├── meta.json
│           │   ├── index.mdx
│           │   ├── selection-bar.mdx
│           │   └── delete-confirmation.mdx
│           ├── row-pinning.mdx
│           ├── virtualization.mdx
│           ├── cells/
│           │   ├── meta.json
│           │   ├── cell-types.mdx
│           │   ├── custom-cell-types.mdx
│           │   └── date-cell.mdx
│           ├── expanding/
│           │   ├── meta.json
│           │   ├── sub-content.mdx
│           │   ├── tree.mdx
│           │   └── controlled.mdx
│           ├── controlled-state.mdx
│           ├── editing/
│           │   ├── meta.json
│           │   ├── index.mdx                  # Inline editing (base-editing)
│           │   ├── crud-server.mdx
│           │   ├── crud-client.mdx
│           │   ├── creating.mdx
│           │   └── validation.mdx
│           ├── fallbacks.mdx                  # Loading / empty / error
│           ├── sticky-header.mdx
│           ├── theming.mdx                    # Reference prose only — no example
│           ├── advanced/
│           │   ├── meta.json
│           │   ├── core.mdx                   # @ez-kit/data-grid-core reference
│           │   └── react.mdx                  # @ez-kit/data-grid-react reference
│           └── migration.mdx                  # Breaking-change notes (FR-009)
├── components/
│   ├── mdx.tsx                                # EDIT: register DataGridDocsExample
│   └── data-grid-docs-example.tsx             # NEW: MDX shortcode (the only new component)
└── tests/                                     # NEW or extend existing
    └── data-grid-docs-example.test.tsx        # NEW: vitest for the shortcode

CLAUDE.md                                      # EDIT: SPECKIT START/END points at this plan
```

**Structure Decision**: This is an additive content-only feature inside an
existing Next.js docs app. We do **not** introduce a new package, route group,
or build pipeline. All content lives under
`apps/docs/content/docs/data-grid/`. One new shared MDX component lives at
`apps/docs/components/data-grid-docs-example.tsx`. Every embedded runnable
example reuses an existing entry from
`apps/docs/shared/data-grid/examples/manifest.json` — no new examples are
added in this feature.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This feature is content + one shared shortcode, fully aligned
with the constitution.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | — | — |
