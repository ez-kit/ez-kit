# Feature Specification: Data-Grid Documentation Site

**Feature Branch**: `001-data-grid-docs`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "need to add docs through fumadocs for data-grid packages"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - First-time install and ship (Priority: P1)

A developer who has never used ez-kit lands on the docs site, picks the UI kit
that matches their stack (shadcn or HeroUI), follows a "Getting Started" page,
and ends up with a working data grid — sortable, filterable, paginated — in
their own application.

**Why this priority**: This is the MVP slice. Without it, the rest of the doc
content has no entry point. Every other story assumes the user has already
completed this one.

**Independent Test**: A developer with no prior knowledge of ez-kit can open
the docs landing, navigate to "Data Grid → Getting Started", choose a flavor,
copy the install + minimal example, and have a grid rendering in a fresh
Next.js or Vite app within 10 minutes — without reading any source files.

**Acceptance Scenarios**:

1. **Given** the docs site is live, **When** a user opens it and clicks the
   data-grid section, **Then** they see a single "Getting Started" page that
   asks them to pick a flavor and presents flavor-specific install + minimal
   usage instructions side by side or via a selector.
2. **Given** a user has chosen a flavor, **When** they follow the copy-paste
   snippet, **Then** the snippet renders a working grid identical to the
   example shown in the docs.
3. **Given** a user is on Getting Started, **When** they scroll to "Next
   steps", **Then** they see links to Columns, Sorting, Filtering, Pagination,
   and Selection.

---

### User Story 2 - Looking up a specific capability (Priority: P2)

A returning user has a concrete question ("how do I add a date filter?",
"how do I pin a column?", "how do I make selection persistent?") and wants
to find the answer with one search or one click from the nav.

**Why this priority**: This is the day-2 value. Once people are shipping,
they need fast reference, not tutorials. Strong search + per-capability
pages keep the kit usable as it grows.

**Independent Test**: For each of these search queries — "columns",
"filtering", "sorting", "pagination", "selection", "row pinning",
"cell types", "controlled state" — Fumadocs returns at least one relevant
data-grid page in the top results, and each result page contains a
runnable example demonstrating that capability.

**Acceptance Scenarios**:

1. **Given** a user is on any docs page, **When** they search "date filter",
   **Then** the top result is a page documenting date filtering with a live
   example.
2. **Given** a user clicks a sidebar link for "Cell Types", **When** the
   page loads, **Then** they see prose describing the API plus an embedded
   live example pulled from the shared examples manifest.
3. **Given** a user wants to compare two capabilities, **When** they open
   two pages, **Then** code style, API style, and example style are
   consistent across all pages (no per-page improvisation).

---

### User Story 3 - Understanding the architecture (Priority: P3)

A contributor (or a power user planning a custom UI flavor) reads the docs
to understand the three-layer model — `core` (headless) → `react` (adapter)
→ UI-kit flavor — and decides where to extend.

**Why this priority**: This unlocks community/internal extension but is not
required for someone who just wants a working grid. It is the depth layer
that makes the project credible for adoption beyond shadcn/heroui.

**Independent Test**: A contributor unfamiliar with the codebase reads the
"Architecture" page and can answer: which package owns headless state, which
package owns React adaptation, which package owns visual rendering, and
where they would add a third UI kit — without opening the source.

**Acceptance Scenarios**:

1. **Given** the docs site is live, **When** a user opens "Architecture",
   **Then** they see a diagram or labeled description of the three layers
   and the one-way dependency rule.
2. **Given** a user wants to build a new UI flavor, **When** they read the
   "Build your own flavor" page, **Then** they see what `createDataGrid`
   expects and how the existing shadcn/heroui flavors use it.
3. **Given** a user wants to write a custom cell type, **When** they open
   "Custom Cell Types", **Then** they see the typed `CellTypeDefinition`
   contract and a runnable example.

---

### Edge Cases

- **Flavor divergence**: Some capabilities or theming knobs differ between
  shadcn and HeroUI. Each affected page must explicitly state the difference
  rather than silently document one flavor's behavior. If a capability is
  unsupported by one flavor, the page must say so.
- **Examples already exist**: ~25 examples live under
  `apps/docs/shared/data-grid/examples/components/` and are registered in
  `manifest.json`. Doc pages must **embed** these existing examples via the
  Sandpack pipeline, not duplicate the code into mdx.
- **Recently changed APIs**: Controlled-state and custom-cell-type surfaces
  changed in recent commits. Doc pages must reflect current HEAD behavior,
  not legacy behavior. No back-versioned doc trees are maintained for v0.x.
- **Sandpack regeneration**: Any example referenced by a doc page must be
  present in the regenerated Sandpack bundles. Docs must build with
  `pnpm docs:build` cleanly.
- **Empty or loading states**: Docs must demonstrate fallbacks (empty, loading,
  error) with their own page — these are easy to miss and commonly asked
  about.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The docs site MUST expose a top-level "Data Grid" section under
  `/docs`, peer to the existing `zu-store` section, with its own ordered
  navigation (`meta.json`).
- **FR-002**: The Data Grid section MUST include, at minimum, the following
  pages: Overview, Getting Started, Architecture, Installation per flavor
  (shadcn, HeroUI), Columns, Column Helper, Column Visibility, Column
  Pinning, Sorting, Filtering (basic), Filter Operators, Filter Panel, Date
  Filter, Multi-value Filter, Global Filtering, Pagination, Selection, Row
  Pinning, Virtualization, Cell Types, Custom Cell Types, Controlled State,
  Editing / CRUD, Fallbacks (loading / empty / error), Sticky Header,
  Resizing, and Theming/Styling per flavor.
- **FR-003**: Every page that documents a capability with an existing live
  example MUST embed that example via the existing Sandpack pipeline rather
  than copy-pasting code into mdx.
- **FR-004**: Every page MUST link to the corresponding source location
  (package name + file path) for the surface it documents, so readers can
  jump from doc to implementation in one click.
- **FR-005**: The Data Grid section MUST include a `meta.json` file listing
  every page in a deliberate learning order (Getting Started → Columns →
  Sorting/Filtering/Pagination → Selection/Pinning → Advanced).
- **FR-006**: Pages MUST clearly distinguish flavor-agnostic behavior from
  flavor-specific behavior. Flavor-specific pages MUST either be split into
  per-flavor variants or use an in-page flavor selector to switch the
  rendered example and code snippet.
- **FR-007**: `apps/docs/shared/data-grid/examples/manifest.json` MUST remain
  the single source of truth for which examples exist. Doc pages MUST
  reference examples by their manifest slug, not by re-importing or
  re-defining them.
- **FR-008**: The top-level docs landing (`content/docs/index.mdx`) MUST
  link to the new Data Grid section.
- **FR-009**: Breaking-change and migration notes MUST live alongside the
  Data Grid section (mirroring the existing `migration-v2.mdx` pattern) so
  consumers find them without leaving the docs site.
- **FR-010**: Each documented public API surface MUST list its accepted
  options/props with short descriptions. The reference content lives in
  prose on the page; it MUST NOT be a stub that links away.
- **FR-011**: Built-in Fumadocs search MUST return at least one relevant
  Data Grid page for each of these queries: "columns", "filtering",
  "sorting", "pagination", "selection", "row pinning", "cell types",
  "controlled state", "loading", "custom cell".
- **FR-012**: The Data Grid section MUST be discoverable from the global
  sidebar, not only via direct URL.
- **FR-013**: `pnpm docs:build` MUST complete with zero warnings or broken
  internal links once the section is in place. Any new example added by
  this feature MUST be regenerated via `pnpm docs:sandpack` before build.
- **FR-014**: Documentation for `@ez-kit/data-grid-core` and
  `@ez-kit/data-grid-react` MUST be present but scoped as advanced /
  contributor material. Consumer-facing depth lives on the flavor pages
  (shadcn, HeroUI).

### Key Entities

- **Doc page**: an mdx file under
  `apps/docs/content/docs/data-grid/`, owned by this feature and authored
  in prose + embedded example references.
- **Example**: an existing live component under
  `apps/docs/shared/data-grid/examples/components/`, registered in
  `manifest.json`, used unchanged by doc pages.
- **Page metadata**: an entry in a directory-local `meta.json`, declaring
  page order and group titles.
- **Flavor**: `shadcn` or `heroui`; some pages render identical content
  across both, others render flavor-specific content.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user can install one of the data-grid flavors
  and render a working sorted-filterable-paginated grid by following only
  the docs in under 10 minutes.
- **SC-002**: 100% of examples registered in the examples `manifest.json`
  are referenced from at least one doc page.
- **SC-003**: Every documented public API surface has at least one
  runnable example accessible from the page that documents it.
- **SC-004**: Both shadcn and HeroUI flavors are documented with
  equivalent depth — no capability is documented for one flavor only
  without an explicit "X is not supported in flavor Y" note on the page.
- **SC-005**: The docs site builds with `pnpm docs:build` with zero
  warnings and zero broken internal links.
- **SC-006**: Built-in search returns at least one relevant Data Grid
  page for each of the queries listed in FR-011.
- **SC-007**: A returning user can locate any documented capability page
  in three clicks or fewer from the docs landing.

## Assumptions

- The existing Fumadocs infrastructure (`apps/docs`, `source.config.ts`,
  `DataGridTypeProvider`, the Sandpack pipeline, the shared examples
  manifest) is the carrier for this feature. Choosing or replacing the
  docs framework is out of scope.
- The shared-examples model (one example component renders for both
  shadcn and HeroUI via `DataGridTypeProvider`) is the contract.
  Documentation reuses existing examples and does not introduce a parallel
  per-flavor copy.
- API reference content for v1 of this feature is hand-authored in mdx
  prose. Auto-generating API reference from TypeScript types may happen in
  a later feature, but is not in scope here.
- Per ez-kit's constitution (Principle V), the docs reflect the current
  HEAD API of each package. No back-versioned doc trees are maintained for
  v0.x; breaking changes are documented inline (changelog/migration page)
  and old docs are replaced, not preserved.
- `@ez-kit/data-grid-native` (the React Native variant) is **out of scope**
  for this feature. If/when it becomes a documented public surface, it
  will be added in a separate feature.
- I18n / multi-language docs are out of scope.
- The "Theming" page documents the styling contract for each flavor
  (CSS tokens, `data-*` attributes that flavors target) without prescribing
  a specific design system; it documents the hook points, not a theme.
