# Phase 1 Data Model: Data-Grid Documentation Site

**Branch**: `001-data-grid-docs` | **Date**: 2026-05-19

This feature has no runtime database or persistent storage. The "data model"
here describes the **content entities** that the doc section is built from
and the relationships between them.

---

## Entity: `DocPage`

A single mdx file under `apps/docs/content/docs/data-grid/`.

| Field                 | Type                                                  | Notes                                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`                | string                                                | URL path segment derived from filename, e.g. `cells/custom-cell-types`.                                                                                                                        |
| `title`               | string                                                | Frontmatter `title`. Used in nav and search results. MUST be unique within the data-grid section.                                                                                              |
| `description`         | string                                                | Frontmatter `description`. Used in search snippets. Should contain a primary query keyword (e.g. "filtering", "selection") to satisfy FR-011.                                                  |
| `group`               | string \| null                                        | Subdirectory name when nested (e.g. `cells`, `filtering`). Top-level pages have `null`.                                                                                                        |
| `learningOrder`       | integer                                               | Implicit — derived from the `pages` array order in the enclosing `meta.json`.                                                                                                                  |
| `embeddedExampleIds`  | string[]                                              | Manifest slugs the page embeds via `<DataGridDocsExample>`. Empty allowed only for concept pages (Overview, Architecture, Theming, Migration, Installation/\*) — see "Validation rules" below. |
| `appliesTo`           | `'shadcn' \| 'heroui' \| 'both' \| 'core' \| 'react'` | Which flavor or layer the page documents. Most pages are `'both'`. Pages under `installation/` are flavor-specific. Pages under `advanced/` are `'core'` or `'react'`.                         |
| `sourceLinks`         | `{ pkg: string; path: string }[]`                     | One or more references to the package source for the surface this page documents. Renders as a "Source" section at the bottom of the page.                                                     |
| `requirementsCovered` | string[]                                              | The FR identifiers this page contributes to (e.g. `["FR-002", "FR-006"]`). Used only at planning / verification time; not rendered.                                                            |

### Validation rules

- `slug` MUST be lowercase kebab-case.
- `title` MUST be present.
- `description` MUST be ≥ 30 characters and ≤ 200 characters.
- A page whose `appliesTo` is `'both'` MUST embed examples via
  `<DataGridDocsExample>` (which renders a flavor toggle), not via a
  flavor-pinned shortcode.
- A page whose `appliesTo` is `'shadcn'` or `'heroui'` MAY pass
  `defaultType` to `<DataGridDocsExample>` to lock the toggle to that
  flavor, OR may omit the example entirely if no manifest entry exists for
  that flavor-specific surface.
- A page whose `appliesTo` is `'core'` or `'react'` MUST NOT embed
  `<DataGridDocsExample>` — those surfaces are not in the flavor manifest;
  use code blocks instead.
- `sourceLinks` MUST be non-empty for pages with `appliesTo ∈ {both,
shadcn, heroui, core, react}` (i.e. all pages that document a code
  surface). Exempt: Overview, Architecture, Getting Started, Migration.
- `embeddedExampleIds` values MUST exist in
  `apps/docs/shared/data-grid/examples/manifest.json` (FR-007).
- File body MUST stay under 800 lines (constitution: Additional
  Constraints — File size).

---

## Entity: `MetaEntry`

A `meta.json` file in any directory under
`apps/docs/content/docs/data-grid/`.

| Field         | Type                | Notes                                                                                                                                                       |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | string              | Display name for the group in the sidebar.                                                                                                                  |
| `description` | string \| undefined | Optional.                                                                                                                                                   |
| `pages`       | string[]            | Ordered list of slugs (filenames without extension, including subdirectory names for nested groups) that belong to this directory. Defines `learningOrder`. |

### Validation rules

- Every `.mdx` file in the directory MUST be listed in `pages` (no orphaned
  pages).
- `pages` MUST NOT contain entries that don't have a corresponding
  `.mdx` file or subdirectory `meta.json`.
- The top-level `data-grid/meta.json` MUST follow the order in
  research.md Decision 6.

---

## Entity: `ManifestExample` (read-only — already exists)

Each entry in `apps/docs/shared/data-grid/examples/manifest.json`.

| Field        | Type                | Notes                                                                              |
| ------------ | ------------------- | ---------------------------------------------------------------------------------- |
| `id`         | string              | Manifest slug. The value `DocPage.embeddedExampleIds[*]` references.               |
| `label`      | string              | Human-friendly name for the example.                                               |
| `group`      | string \| undefined | Manifest grouping (e.g. `base`, `filtering`).                                      |
| `groupLabel` | string \| undefined | Group display name.                                                                |
| `sourceFile` | string              | Path to the example component, relative to `apps/docs/shared/data-grid/examples/`. |
| `exportName` | string              | The named export the Sandpack bundle pulls in.                                     |

### Invariants this feature MUST preserve

- This feature does NOT modify the manifest. The constitution's
  research-and-reuse rule and FR-007 make the manifest a read-only source
  of truth for v1 of this feature.
- If a future feature adds an example, this docs section MUST be re-checked
  against SC-002 (100% manifest coverage) and the page that references the
  new example MUST be updated.

---

## Entity: `Flavor` (enum)

`'shadcn' | 'heroui'`

Used by `DataGridDocsExample` (the new MDX shortcode) for the in-page
toggle. See `contracts/data-grid-docs-example.md`.

---

## Relationships

```text
MetaEntry  1 ── *  DocPage
DocPage    * ── *  ManifestExample    (via embeddedExampleIds; manifest is read-only)
DocPage    1 ──    Flavor (appliesTo) (a page targets one flavor scope)
```

- Every DocPage belongs to exactly one MetaEntry (the `meta.json` of its
  directory).
- A DocPage may reference 0..N ManifestExamples by slug.
- A ManifestExample may be referenced by 0..N DocPages — except SC-002
  raises the lower bound to 1 once the feature ships (every manifest entry
  must be referenced by at least one page).

---

## State transitions

This feature has no runtime state machine. The closest analog is the
flavor toggle in `<DataGridDocsExample>`:

```text
[shadcn]  ──user clicks "HeroUI"──>  [heroui]
[heroui]  ──user clicks "shadcn"──>  [shadcn]
```

Initial state is whatever `defaultType` the page passes, or `'shadcn'` if
none is passed. State is local to the component instance — no persistence
(see research.md Decision 4).

---

## Out of scope for this feature

- Versioned doc trees (no `/docs/data-grid/v0`, `/v1`, ...). The
  constitution says HEAD-only.
- I18n / per-locale routing.
- Auto-generated API reference. v1 is hand-authored prose.
- Editing manifest entries or adding new examples.
- Documenting `@ez-kit/data-grid-native`.
