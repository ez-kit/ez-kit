# Phase 0 Research: Data-Grid Documentation Site

**Branch**: `001-data-grid-docs` | **Date**: 2026-05-19 | **Plan**:
[./plan.md](./plan.md)

This document resolves every open question raised by the plan and the spec
before Phase 1 design.

---

## Decision 1 — Which embed mechanism do data-grid doc pages use?

**Decision**: Use `DataGridSandpackExample`
(`apps/docs/shared/data-grid/sandpack/DataGridSandpackExample.tsx`) wrapped in
a thin new MDX shortcode `<DataGridDocsExample exampleId="..." />` that adds
an in-page flavor toggle (shadcn ↔ heroui).

**Rationale**:

- The existing `zu-store` docs use a different shortcode, `<LivePreview path="..." />`
  (`apps/docs/components/live-preview.tsx`), which dynamically `import()`s a
  React component out of `apps/docs/shared/examples/`. That mechanism is fine
  for `zu-store` because there is one flavor and a single example registry.
- The data-grid story is different: every example must render under **both**
  flavors (shadcn and heroui), and we want consumers to see the example
  running against the actual published package surface — i.e., they should
  see `@ez-kit/data-grid-shadcn` being imported and used, not a shorter dev
  shortcut.
- `DataGridSandpackExample` already bundles the package as a CodeSandbox
  workspace (per `apps/docs/scripts/build-sandpack.mjs`) and accepts a `type`
  prop of `'shadcn' | 'heroui'`. Reusing it preserves the constitution's
  "research & reuse first" workflow rule and respects FR-003 (no copy-paste
  of example code into mdx).
- A thin wrapper that holds a `useState<'shadcn'|'heroui'>` and renders the
  matching `DataGridSandpackExample` satisfies FR-006 (flavor parity) with
  zero changes to the Sandpack pipeline or to the examples themselves.

**Alternatives considered**:

- *Reuse `<LivePreview path="..." />` from `zu-store` and read directly from
  `apps/docs/shared/data-grid/examples/components/...`* — rejected. It would
  render the example component but **not** demonstrate the actual public
  package surface (consumers wouldn't see `import { DataGrid } from
  '@ez-kit/data-grid-shadcn'`). It also can't switch flavors without
  duplicating registry indirection that `DataGridSandpackExample` already
  solves.
- *Create per-flavor route trees (`/docs/data-grid/shadcn/...` and
  `/docs/data-grid/heroui/...`)* — rejected. ~2× page count, ~2× drift risk,
  ~2× maintenance. The in-page toggle is the proven pattern from the
  existing sandbox routes (`apps/docs/app/sandbox/data-grid/shadcn/page.tsx`
  and `.../heroui/page.tsx` both render the same `DataGridTabsExample`).
- *Use Fumadocs `<Tabs>` with two `DataGridSandpackExample` instances side by
  side* — rejected. Doubles the Sandpack render cost on every page. The
  toggle approach renders only the active flavor.

---

## Decision 2 — How does the pagination doc page show pagination?

**Decision**: The pagination page references the existing `base-full`
manifest entry, which renders a full grid that includes pagination. No new
example is added.

**Rationale**:

- Adding a new example would require updating `manifest.json`, writing the
  component, and re-running `pnpm docs:sandpack` — work that the
  constitution's research-and-reuse rule discourages when an existing
  example already demonstrates the surface adequately.
- `base-full` is a "full kitchen sink" example and is already in the
  manifest. Pagination is one of its visible behaviors.
- If a dedicated pagination example becomes valuable later, it is a small
  follow-up feature — out of scope here.

**Alternatives considered**:

- *Add a new `pagination` example to the manifest and Sandpack bundle* —
  rejected for v1 of this feature; possible follow-up.
- *Skip the pagination page entirely* — rejected. SC-006 / FR-011 / FR-002
  all require pagination to be discoverable and documented.

---

## Decision 3 — How is the Theming page documented (no example exists)?

**Decision**: The Theming page is reference-prose-only. It documents the
styling contract for each flavor — CSS tokens, the `data-*` attribute surface
that flavors target, and how to override the included styles — without
embedding a Sandpack example.

**Rationale**:

- Per Principle II of the constitution, all styling lives in UI-kit packages,
  not in the shared React package. The styling contract is therefore a
  reference, not a demo.
- A live Sandpack example would imply "edit the CSS here" — which is not how
  consumers actually use the kit (they import the package's CSS or override
  it in their own design system).
- This is an explicit exception to FR-003 for the Theming page only; the
  page MUST still link to source (FR-004) so readers can read the actual
  token list.

**Alternatives considered**:

- *Build a theming sandbox* — rejected. Out of scope and risks drifting from
  the package's real styling contract.

---

## Decision 4 — How is the flavor toggle persisted within a session?

**Decision**: The toggle uses local React `useState` only. The selection
does **not** persist across pages or reloads.

**Rationale**:

- Persistence (localStorage / cookie / URL param) is a UX feature, not a
  documentation feature, and adding it now would invent state the rest of
  the docs site doesn't have.
- The existing sandbox routes (`/sandbox/data-grid/shadcn` and `/heroui`)
  already give consumers a per-flavor preference at the URL level.
- A future feature can add persistence (likely URL `?flavor=` or theme
  context) without breaking this contract.

**Alternatives considered**:

- *Sync flavor via URL search param* — rejected for now; documented as a
  follow-up opportunity.
- *Sync flavor via theme context* — rejected; entangles content with theme.

---

## Decision 5 — Source linking from each doc page

**Decision**: Each doc page ends with a small "Source" section listing the
package name and the repo-relative file path(s) that implement the surface.
Plain text + a hyperlink to the file via the repository's GitHub URL (if the
repo has a remote) or just text + a relative `code` span if not.

**Rationale**:

- FR-004 requires a source link from every page. The simplest form is a
  monospace path; if the repo has a GitHub remote, we add a clickable link.
- We do not auto-generate this — the doc author writes the link. Auto-
  generation requires symbol resolution that is out of scope here.

**Alternatives considered**:

- *Auto-generate from TypeScript types* — rejected; explicit non-goal in the
  spec's Assumptions.

---

## Decision 6 — Navigation order and grouping

**Decision**: `meta.json` files declare order and groups. The top-level
`apps/docs/content/docs/data-grid/meta.json` orders pages as:

```text
Overview
Getting Started
Architecture
Installation (subgroup)
  shadcn
  heroui
Columns (subgroup)
  Columns
  Column Helper
  Column Visibility
  Column Pinning
  Resizing
Sorting
Filtering (subgroup)
  Basic
  Operators
  Panel
  Date Range
  Multi-value
  Global
Pagination
Selection (subgroup)
  Selection
  Selection Bar
  Delete Confirmation
Row Pinning
Virtualization
Cells (subgroup)
  Cell Types
  Custom Cell Types
  Date Cell
Expanding (subgroup)
  Sub-content
  Tree
  Controlled
Controlled State
Editing (subgroup)
  Inline Editing
  CRUD (Server)
  CRUD (Client)
  Creating
  Validation
Fallbacks
Sticky Header
Theming
Advanced (subgroup)
  Core
  React
Migration
```

**Rationale**:

- The order is "follow a learning path": overview → install → columns →
  sorting/filtering/pagination → selection/pinning → cells/expanding →
  controlled/editing → fallbacks/styling → advanced → migration.
- Subgroups mirror the manifest's existing `groupLabel` values where
  possible, so authors don't have to invent new taxonomies.

**Alternatives considered**:

- *Single flat list of ~27 pages* — rejected; defeats discoverability.
- *Mirror the manifest exactly* — rejected; the manifest is task-oriented,
  not reading-oriented.

---

## Decision 7 — API reference depth (v1)

**Decision**: Hand-authored prose in each page's "Props/Options" section.
No auto-generated TypeScript-derived reference in v1.

**Rationale**:

- The spec Assumptions explicitly state v1 is hand-authored.
- Auto-generation (e.g., via `typedoc`, `react-docgen`, `extractor`, or
  Fumadocs' own type extraction) is a separate feature with its own
  tradeoffs (build cost, pipeline complexity, link stability).
- Hand-authored prose is the same approach `zu-store` docs use today
  (`apps/docs/content/docs/zu-store/create-context-store.mdx`).

**Alternatives considered**:

- *Auto-generate now* — rejected; explicit non-goal.
- *Skip API reference entirely and link to types* — rejected; violates
  FR-010 ("MUST NOT be a stub that links away").

---

## Decision 8 — Migration page initial content

**Decision**: Create `migration.mdx` with the structure (sections per
breaking change, format mirroring `apps/docs/content/docs/migration-v2.mdx`)
but minimal initial content. As of the feature start, the recent breaking
changes in memory are (a) custom cell types refactor and (b) controlled
state semantics — both of which become brief entries.

**Rationale**:

- FR-009 requires migration content live alongside the section.
- Pre-1.0 ez-kit will have ongoing breaks; the page becomes the durable
  home for them. Starting empty would let the page drift; starting full
  would overstate stability.

**Alternatives considered**:

- *Postpone the migration page to a separate feature* — rejected. FR-009
  requires it now.
- *Embed migration notes inside each individual page* — rejected. Migration
  notes are time-sequenced; pages are topic-sequenced. Two different axes.

---

## Decision 9 — Search behavior (SC-006 / FR-011)

**Decision**: Rely on Fumadocs' built-in search (`fumadocs-core` /
`fumadocs-ui`). No custom search index for data-grid is built. Page titles,
descriptions, and prose body are tuned so the listed FR-011 queries each
return at least one relevant page.

**Rationale**:

- The site already uses Fumadocs search globally; adding a custom index
  would diverge from the rest of the docs.
- The doc-page contract (see `contracts/docs-page.md`) prescribes
  frontmatter (title, description) and a leading paragraph that naturally
  contain the FR-011 query terms.

**Alternatives considered**:

- *Add Algolia / Orama / custom search* — rejected; out of scope and
  unnecessary for the spec's success criteria.

---

## Decision 10 — Testing strategy for the new MDX shortcode

**Decision**:

- Write a Vitest test first (Principle IV) in `apps/docs/tests/` (or co-
  located if that matches the existing docs-app test layout) for
  `<DataGridDocsExample>` that asserts: (a) it renders the toggle, (b) it
  switches between shadcn and heroui by changing the `type` prop fed to
  `DataGridSandpackExample`, (c) it errors clearly if `exampleId` is
  unknown.
- Add at least one Playwright visual test for a representative data-grid
  doc page (e.g., `cells/cell-types`) in light and dark themes, using the
  existing `apps/docs/playwright.config.ts`.
- Coverage threshold for the docs app is not part of the package coverage
  bar (the constitution's 80% applies to `packages/**`). Tests here exist
  for behavioral safety, not coverage accounting.

**Rationale**:

- Principle IV is non-negotiable for new behavior code. The shortcode is
  behavior code (state toggle + dynamic flavor injection).
- Visual regression is the right tool for "did the docs render?" testing
  per the user's web testing rules.
- MDX prose content does not get unit tests; the build (`pnpm docs:build`)
  is its check (FR-013, SC-005).

**Alternatives considered**:

- *Skip tests because "it's just docs"* — rejected; the new component is
  code under `apps/docs/components/`.
- *Snapshot the whole page* — rejected without behavioral assertions
  (Principle IV explicitly forbids "I clicked a thing" snapshot tests).

---

## Open items resolved

| Spec/plan item | Resolution |
|---|---|
| Embed mechanism for examples | Decision 1 |
| Pagination without dedicated example | Decision 2 |
| Theming page without example | Decision 3 |
| Per-page flavor toggle behavior | Decisions 1, 4 |
| Source linking | Decision 5 |
| Navigation order | Decision 6 |
| API reference depth | Decision 7 |
| Migration page scope | Decision 8 |
| Search expectations | Decision 9 |
| Test strategy for new code | Decision 10 |

No `NEEDS CLARIFICATION` markers remain.
