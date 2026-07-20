# Contract: Data-Grid Doc Page (mdx)

**Status**: authoritative for every `.mdx` file under
`apps/docs/content/docs/data-grid/`.

Every doc page authored by this feature MUST satisfy this contract. The
[checklist](#authoring-checklist) at the bottom is the verification gate.

---

## File location

```text
apps/docs/content/docs/data-grid/<group>?/<slug>.mdx
```

- `<group>` is an optional subdirectory (`cells`, `filtering`, `selection`,
  …). See [research.md Decision 6](../research.md#decision-6--navigation-order-and-grouping)
  for the canonical group set.
- `<slug>` MUST be lowercase kebab-case and match the filename without
  the extension.

## Frontmatter

```yaml
---
title: <Title Case string, ≤ 50 chars>
description: <30–200 char single sentence containing the primary search keyword for FR-011>
---
```

Both fields are REQUIRED.

## Section order

Pages MUST use these `##` sections in this order. Sections that do not
apply MUST be omitted (not left empty).

1. `## Usage` — required for pages whose `appliesTo` ∈ `{both, shadcn,
heroui}`. Contains the `<DataGridDocsExample />` invocation and the
   minimum prose needed to explain it.
2. `## Options` — required for any page that documents an API surface
   (props, options, types). Renders as a markdown table.
3. `## Notes` — required when behavior differs between flavors, when
   there are known caveats, or when the surface has accessibility
   implications.
4. `## See also` — required if there are sibling pages that someone reading
   this one will likely also want.
5. `## Source` — required for pages whose `appliesTo` ∈ `{both, shadcn,
heroui, core, react}`. See [Source section](#source-section).

Concept pages (Overview, Architecture, Getting Started, Migration,
Installation/\*, Theming) MAY use additional `##` sections appropriate to
their narrative, but MUST still start with a top-level paragraph that
states what the page is.

## Example embedding

Pages embed runnable examples using exactly the new MDX shortcode:

```mdx
<DataGridDocsExample exampleId='<manifest-id>' />
```

Optional flavor lock for flavor-specific pages only:

```mdx
<DataGridDocsExample
	exampleId='<manifest-id>'
	defaultType='shadcn'
/>
```

Rules:

- `exampleId` MUST exist in
  `apps/docs/shared/data-grid/examples/manifest.json` (enforced by
  TypeScript via `DataGridSandpackExampleId`).
- Do NOT copy the example's source into the mdx body. The shortcode
  handles both rendering and source visibility (FR-003).
- A page MAY include more than one `<DataGridDocsExample />` if the
  surface needs more than one demo, but each MUST reference a distinct
  manifest entry.
- A page MAY use plain fenced code blocks for **isolated code fragments**
  that illustrate a syntax or option (e.g., a `defineColumns` snippet);
  these do not count as "example embedding" and are not subject to
  manifest-only rules.

## Source section

Renders at the bottom of the page. Format:

```mdx
## Source

- `@ez-kit/data-grid-<pkg>` — [`<repo-relative-path>`](absolute-link-to-repo-blob)
```

- One bullet per package + path that owns the documented surface.
- The link target is `https://github.com/<org>/<repo>/blob/main/<path>` if
  the repo has a remote configured; otherwise the bullet is plain text
  (no broken link).
- When the surface lives partly in `core` and partly in `react`, list both.

## Length budget

- Target 200–400 lines.
- Hard cap 800 lines (constitution: Additional Constraints — File size).
- If you are approaching the cap, split the page into a group with
  sub-pages instead of stretching one page.

## Imports inside mdx

- The only custom React component allowed without an explicit `import` is
  `<DataGridDocsExample />` (registered globally via
  `apps/docs/components/mdx.tsx`).
- If a page needs another component, prefer adding it to the global
  components map rather than importing per-page — keeps mdx files pure
  prose.

## Flavor handling

| `appliesTo` | What the page does                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `both`      | Use `<DataGridDocsExample exampleId='…' />` without `defaultType`. The component renders the toggle.            |
| `shadcn`    | `<DataGridDocsExample exampleId='…' defaultType='shadcn' />`. Page prose explains the shadcn-specific behavior. |
| `heroui`    | Same as shadcn, with `defaultType='heroui'`.                                                                    |
| `core`      | No `<DataGridDocsExample>`. Use fenced code blocks.                                                             |
| `react`     | No `<DataGridDocsExample>`. Use fenced code blocks.                                                             |

If a capability differs between shadcn and heroui in a way the example
cannot demonstrate by toggle alone (rare), the page MUST add a `## Notes`
section that says, in plain language, what the difference is and where it
lives in source.

## Search-keyword discipline

For pages whose topic appears in FR-011, the page MUST contain the query
keyword in at least one of: title, description, first paragraph. Examples:

| FR-011 query       | Page that MUST contain it                          |
| ------------------ | -------------------------------------------------- |
| `columns`          | `columns/index.mdx` title or description           |
| `filtering`        | `filtering/index.mdx` title or description         |
| `sorting`          | `sorting.mdx` title or description                 |
| `pagination`       | `pagination.mdx` title or description              |
| `selection`        | `selection/index.mdx` title or description         |
| `row pinning`      | `row-pinning.mdx` title or description             |
| `cell types`       | `cells/cell-types.mdx` title or description        |
| `controlled state` | `controlled-state.mdx` title or description        |
| `loading`          | `fallbacks.mdx` description                        |
| `custom cell`      | `cells/custom-cell-types.mdx` title or description |

## Authoring checklist

A page is "done" when ALL of these are true:

- [ ] Frontmatter `title` and `description` present, description 30–200
      chars.
- [ ] Section order matches the rule above.
- [ ] At least one `<DataGridDocsExample />` if `appliesTo ∈ {both,
shadcn, heroui}` (or an explicit "no example — reason" note for
      Theming-style exceptions).
- [ ] All `exampleId`s resolve in `manifest.json`.
- [ ] `## Source` bullets present for code-surface pages.
- [ ] No example code copy-pasted into mdx (FR-003).
- [ ] No bare `<` `>` HTML tags from copy-paste; mdx-safe markup only.
- [ ] Page < 800 lines.
- [ ] Flavor-divergence note added if the surface differs between
      shadcn and heroui (FR-006).
- [ ] FR-011 keyword present where applicable.
- [ ] Parent `meta.json` lists the page in the right order.
- [ ] `pnpm docs:build` produces no warnings affecting this page.
