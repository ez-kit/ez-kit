---
description: 'Task list for Data-Grid Documentation Site'
---

# Tasks: Data-Grid Documentation Site

**Input**: Design documents from `specs/001-data-grid-docs/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories),
`research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: REQUIRED. Per ez-kit's constitution v0.1.0 Principle IV
(NON-NEGOTIABLE Test-First Discipline) and the explicit "MUST FAIL before
implementation" clause in `contracts/data-grid-docs-example.md`. Tests are
NOT optional for the new shared component. MDX prose pages have no unit
tests — their gate is `pnpm docs:build` (SC-005) plus Playwright visual
regression on representative pages.

**Organization**: Tasks are grouped by user story to enable independent
implementation and incremental delivery. Each user story is a complete,
independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Maps task to a user story (US1, US2, US3) — required for
  user-story-phase tasks only; setup, foundational, and polish tasks have
  no story label
- All file paths are repo-relative

## Path Conventions

This is a monorepo docs subproject. All implementation paths are under
`apps/docs/`. Spec artifacts live under `specs/001-data-grid-docs/`. See
[plan.md → Project Structure](./plan.md#project-structure) for the
canonical layout.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the docs app for new content + the new MDX shortcode.

- [x] T001 Verify workspace is current by running `pnpm install` at repo root
- [x] T002 Regenerate Sandpack bundles by running `pnpm docs:sandpack` (must succeed before any data-grid example renders in the new pages)
- [x] T003 Create new directory `apps/docs/content/docs/data-grid/` with an initial `apps/docs/content/docs/data-grid/meta.json` containing `{ "title": "Data Grid", "description": "Headless data grid with shadcn and HeroUI flavors", "pages": [] }`
- [x] T004 [P] Confirm `DataGridSandpackExampleId` is exported from `apps/docs/shared/data-grid/sandpack/DataGridSandpackExample.tsx`; if not, add an `export type` line (no other changes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build and wire the `<DataGridDocsExample />` MDX shortcode that
every doc page in Phase 3+ will use. CRITICAL: no user story work can begin
until this phase is complete.

**TDD discipline (Principle IV — NON-NEGOTIABLE)**: T005 MUST be written and
MUST fail before T006 is started. Verify the failure by running
`pnpm --filter @ez-kit/docs test` and observing the test for
`DataGridDocsExample` fail with "module not found" or equivalent.

- [x] T005 Write Vitest tests for `<DataGridDocsExample />` in `apps/docs/test/data-grid-docs-example.test.tsx` (path adjusted from `tests/` to `test/` to match the workspace `vitest.shared.ts` include pattern; Playwright owns `tests/`). Covers (a) default render uses `type='shadcn'` and renders the toggle, (b) `defaultType='heroui'` initial render uses `'heroui'`, (c) clicking the HeroUI control switches the rendered `DataGridSandpackExample`'s `type` prop to `'heroui'`, (d) `lockFlavor=true` hides the toggle, (e) `lockFlavor=true` without `defaultType` throws at runtime with the contracted message, (f) toggle exposes correct ARIA attributes per `contracts/data-grid-docs-example.md`. Verified all six FAIL before T006.
- [x] T006 Implement `<DataGridDocsExample />` in `apps/docs/components/data-grid-docs-example.tsx` to make T005 tests pass. Followed `contracts/data-grid-docs-example.md`. Also updated `apps/docs/vitest.config.ts` to set `esbuild.jsx: 'automatic'` (one-line config change so JSX in tests/components doesn't need explicit React import). All six tests PASS.
- [x] T007 Register `DataGridDocsExample` in `apps/docs/components/mdx.tsx` by importing it and adding it to the components map exported from that file (so mdx pages can use it without a per-file `import`)
- [x] T008 [P] Update `apps/docs/content/docs/index.mdx` to add a bullet linking to the new Data Grid section
- [x] T009 [P] Add a Playwright visual-test scaffold file at `apps/docs/tests/data-grid-docs.visual.spec.ts` (filename uses `.visual.spec.ts` suffix to match the existing vitest-exclude pattern). One placeholder test visits `/docs/data-grid` and asserts the page responds with < 400 and `<h1>` is visible.

**Checkpoint**: Foundation ready — `<DataGridDocsExample />` is implemented,
registered, and unit-tested. User story implementation can now begin.

---

## Phase 3: User Story 1 - First-time install and ship (Priority: P1) 🎯 MVP

**Goal**: A developer with no prior ez-kit knowledge can land on the docs
site, choose a flavor, follow Getting Started, and ship a working grid in
under 10 minutes.

**Independent Test**: From a fresh Next.js or Vite project, follow only the
new Overview → Getting Started → Installation (chosen flavor) pages and
arrive at a rendering grid within 10 minutes (SC-001). All three pages
build clean (SC-005).

### Implementation for User Story 1

- [x] T010 [P] [US1] Author `apps/docs/content/docs/data-grid/index.mdx` (Overview)
- [x] T011 [P] [US1] Author `apps/docs/content/docs/data-grid/getting-started.mdx`
- [x] T012 [P] [US1] Author `apps/docs/content/docs/data-grid/architecture.mdx`
- [x] T013 [P] [US1] Author `apps/docs/content/docs/data-grid/installation/shadcn.mdx`
- [x] T014 [P] [US1] Author `apps/docs/content/docs/data-grid/installation/heroui.mdx`
- [x] T015 [US1] Create `apps/docs/content/docs/data-grid/installation/meta.json`
- [x] T016 [US1] Update the top-level `apps/docs/content/docs/data-grid/meta.json` to `["index", "getting-started", "architecture", "installation"]`
- [x] T017 [US1] Extend `apps/docs/tests/data-grid-docs.visual.spec.ts` with three Playwright assertions (landing 200, getting-started flavor toggle, sidebar presence — also covers FR-012 per analysis finding U1)
- [x] T018 [US1] `pnpm --filter @ez-kit/docs build` — **GREEN**. ✓ Compiled successfully in 13.7s, 160/160 static pages prerendered, zero warnings. Required 7 pre-existing fixes (5 vendored shadcn `exactOptionalPropertyTypes` violations + 1 react-day-picker v10 ClassNames key removal + 1 `shared/DataGrid.tsx` TS2742 inferred-type annotation).

**Checkpoint**: User Story 1 (MVP) is shippable. A first-time user can
install and render a grid using only these pages.

---

## Phase 4: User Story 2 - Looking up a specific capability (Priority: P2)

**Goal**: Every documented capability has its own findable, searchable page
with a runnable example, so day-2 users get answers in one click or one
search.

**Independent Test**: Each FR-011 query ("columns", "filtering", "sorting",
"pagination", "selection", "row pinning", "cell types", "controlled state",
"loading", "custom cell") returns a top-result data-grid page that contains
the corresponding live example (SC-006). 100% of manifest entries are
referenced by at least one page (SC-002).

> **Per-page authoring contract**: every task in this phase MUST follow
> [`contracts/docs-page.md`](./contracts/docs-page.md) — frontmatter,
> section order, `<DataGridDocsExample />` usage, source bullets, length
> budget. A task is "done" only when its page also passes the Authoring
> Checklist at the bottom of that contract.

### Implementation for User Story 2 — Columns group

- [x] T019 [P] [US2] Author `apps/docs/content/docs/data-grid/columns/index.mdx` (Defining columns). Embed `<DataGridDocsExample exampleId='columns-combined' />`. Source bullets to `@ez-kit/data-grid-core` column types.
- [x] T020 [P] [US2] Author `apps/docs/content/docs/data-grid/columns/column-helper.mdx`. Embed three examples: `<DataGridDocsExample exampleId='column-helper' />`, `<DataGridDocsExample exampleId='column-helper-custom-view' />`, `<DataGridDocsExample exampleId='column-helper-registered' />`.
- [x] T021 [P] [US2] Author `apps/docs/content/docs/data-grid/columns/column-visibility.mdx`. Embed `<DataGridDocsExample exampleId='column-visibility' />` and reference `base-column-visibility` as well.
- [x] T022 [P] [US2] Author `apps/docs/content/docs/data-grid/columns/column-pinning.mdx`. Embed `<DataGridDocsExample exampleId='column-pinning' />`. Add a Notes section calling out the immutable shadcn-primitive rule from constitution Principle III as the reason pinning overrides live in `blocks/`.
- [x] T023 [P] [US2] Author `apps/docs/content/docs/data-grid/columns/resizing.mdx`. Embed `<DataGridDocsExample exampleId='resizing' />`.
- [x] T024 [US2] Create `apps/docs/content/docs/data-grid/columns/meta.json` listing `["index", "column-helper", "column-visibility", "column-pinning", "resizing"]`. (Depends on T019–T023.)

### Implementation for User Story 2 — Sorting

- [x] T025 [P] [US2] Author `apps/docs/content/docs/data-grid/sorting.mdx`. Embed three examples in order: `<DataGridDocsExample exampleId='base-sorting' />`, `<DataGridDocsExample exampleId='sorting' />`, `<DataGridDocsExample exampleId='sort-toolbar' />`. Description MUST contain the word "sorting" for FR-011.

### Implementation for User Story 2 — Filtering group

- [x] T026 [P] [US2] Author `apps/docs/content/docs/data-grid/filtering/index.mdx` (basic filtering). Embed `<DataGridDocsExample exampleId='base-filtering' />` and `<DataGridDocsExample exampleId='filter-popover' />`. Description MUST contain "filtering" for FR-011.
- [x] T027 [P] [US2] Author `apps/docs/content/docs/data-grid/filtering/operators.mdx`. Embed `<DataGridDocsExample exampleId='filter-operators' />`.
- [x] T028 [P] [US2] Author `apps/docs/content/docs/data-grid/filtering/panel.mdx`. Embed `<DataGridDocsExample exampleId='filter-panel' />`. Also reference `<DataGridDocsExample exampleId='filter-chips' />` for chip-based active filter display.
- [x] T029 [P] [US2] Author `apps/docs/content/docs/data-grid/filtering/date-range.mdx`. Embed `<DataGridDocsExample exampleId='filter-date-range' />`.
- [x] T030 [P] [US2] Author `apps/docs/content/docs/data-grid/filtering/multi-value.mdx`. Embed `<DataGridDocsExample exampleId='filter-multi-value' />`.
- [x] T031 [P] [US2] Author `apps/docs/content/docs/data-grid/filtering/global.mdx`. Embed `<DataGridDocsExample exampleId='global-filtering' />`.
- [x] T032 [US2] Create `apps/docs/content/docs/data-grid/filtering/meta.json` listing `["index", "operators", "panel", "date-range", "multi-value", "global"]`. (Depends on T026–T031.)

### Implementation for User Story 2 — Pagination

- [x] T033 [P] [US2] Author `apps/docs/content/docs/data-grid/pagination.mdx`. Per research.md Decision 2, embed `<DataGridDocsExample exampleId='base-full' />` and call out in prose where pagination appears in the example. Description MUST contain "pagination" for FR-011.

### Implementation for User Story 2 — Selection group

- [x] T034 [P] [US2] Author `apps/docs/content/docs/data-grid/selection/index.mdx`. Embed `<DataGridDocsExample exampleId='base-selection' />`. Description MUST contain "selection" for FR-011.
- [x] T035 [P] [US2] Author `apps/docs/content/docs/data-grid/selection/selection-bar.mdx`. Embed `<DataGridDocsExample exampleId='selection-bar' />` and `<DataGridDocsExample exampleId='selection-bar-inline' />`.
- [x] T036 [P] [US2] Author `apps/docs/content/docs/data-grid/selection/delete-confirmation.mdx`. Embed `<DataGridDocsExample exampleId='delete-confirmation' />`.
- [x] T037 [US2] Create `apps/docs/content/docs/data-grid/selection/meta.json` listing `["index", "selection-bar", "delete-confirmation"]`. (Depends on T034–T036.)

### Implementation for User Story 2 — Row pinning + Virtualization

- [x] T038 [P] [US2] Author `apps/docs/content/docs/data-grid/row-pinning.mdx`. Embed `<DataGridDocsExample exampleId='row-pinning-plain' />` and `<DataGridDocsExample exampleId='row-pinning-sticky-header' />`. Description MUST contain "row pinning" for FR-011.
- [x] T039 [P] [US2] Author `apps/docs/content/docs/data-grid/virtualization.mdx`. Embed `<DataGridDocsExample exampleId='virtualized' />`.

### Implementation for User Story 2 — Cells group

- [x] T040 [P] [US2] Author `apps/docs/content/docs/data-grid/cells/cell-types.mdx`. Embed `<DataGridDocsExample exampleId='cell-types' />`. Description MUST contain "cell types" for FR-011.
- [x] T041 [P] [US2] Author `apps/docs/content/docs/data-grid/cells/custom-cell-types.mdx`. Embed `<DataGridDocsExample exampleId='custom-cell-types' />`. Cross-reference the typed `CellTypeDefinition` contract documented at the API level. Description MUST contain "custom cell" for FR-011.
- [x] T042 [P] [US2] Author `apps/docs/content/docs/data-grid/cells/date-cell.mdx`. Embed `<DataGridDocsExample exampleId='date-cell' />`.
- [x] T043 [US2] Create `apps/docs/content/docs/data-grid/cells/meta.json` listing `["cell-types", "custom-cell-types", "date-cell"]`. (Depends on T040–T042.)

### Implementation for User Story 2 — Expanding group

- [x] T044 [P] [US2] Author `apps/docs/content/docs/data-grid/expanding/sub-content.mdx`. Embed `<DataGridDocsExample exampleId='expanding-sub-content' />`.
- [x] T045 [P] [US2] Author `apps/docs/content/docs/data-grid/expanding/tree.mdx`. Embed `<DataGridDocsExample exampleId='expanding-tree' />`.
- [x] T046 [P] [US2] Author `apps/docs/content/docs/data-grid/expanding/controlled.mdx`. Embed `<DataGridDocsExample exampleId='expanding-controlled' />`.
- [x] T047 [US2] Create `apps/docs/content/docs/data-grid/expanding/meta.json` listing `["sub-content", "tree", "controlled"]`. (Depends on T044–T046.)

### Implementation for User Story 2 — Controlled state

- [x] T048 [P] [US2] Author `apps/docs/content/docs/data-grid/controlled-state.mdx`. Embed `<DataGridDocsExample exampleId='controlled-state' />`. Description MUST contain "controlled state" for FR-011. Reference the recent controlled-state change in source bullets.

### Implementation for User Story 2 — Editing group

- [x] T049 [P] [US2] Author `apps/docs/content/docs/data-grid/editing/index.mdx` (inline editing). Embed `<DataGridDocsExample exampleId='base-editing' />`.
- [x] T050 [P] [US2] Author `apps/docs/content/docs/data-grid/editing/crud-server.mdx`. Embed `<DataGridDocsExample exampleId='crud-server' />`.
- [x] T051 [P] [US2] Author `apps/docs/content/docs/data-grid/editing/crud-client.mdx`. Embed `<DataGridDocsExample exampleId='crud-client' />`.
- [x] T052 [P] [US2] Author `apps/docs/content/docs/data-grid/editing/creating.mdx`. Embed `<DataGridDocsExample exampleId='creating' />` and `<DataGridDocsExample exampleId='creating-validation' />`.
- [x] T053 [P] [US2] Author `apps/docs/content/docs/data-grid/editing/validation.mdx`. Embed `<DataGridDocsExample exampleId='editing-validation' />` and cross-link to the `creating-validation` page.
- [x] T054 [US2] Create `apps/docs/content/docs/data-grid/editing/meta.json` listing `["index", "crud-server", "crud-client", "creating", "validation"]`. (Depends on T049–T053.)

### Implementation for User Story 2 — Standalone capability pages

- [x] T055 [P] [US2] Author `apps/docs/content/docs/data-grid/fallbacks.mdx`. Embed `<DataGridDocsExample exampleId='fallbacks' />`. Description MUST contain "loading" for FR-011 (the surface covers loading / empty / error states).
- [x] T056 [P] [US2] Author `apps/docs/content/docs/data-grid/sticky-header.mdx`. Embed `<DataGridDocsExample exampleId='base-sticky' />` and `<DataGridDocsExample exampleId='sticky-header' />`.
- [x] T057 [P] [US2] Author `apps/docs/content/docs/data-grid/theming.mdx`. Per research.md Decision 3, NO `<DataGridDocsExample />` — reference prose only. Document CSS-token / `data-*` attribute surface for both flavors. Source bullets to each flavor's CSS entry point.
- [x] T058 [P] [US2] Author `apps/docs/content/docs/data-grid/migration.mdx`. Per research.md Decision 8, initial content covers (a) custom cell types refactor and (b) controlled state semantics. Mirror `apps/docs/content/docs/migration-v2.mdx` structure. Each entry: short "what changed" + before/after code snippet.

### Verification & wiring for User Story 2

- [x] T059 [US2] Update `apps/docs/content/docs/data-grid/meta.json` `pages` array to append, after the US1 slice, the full US2 ordering per research.md Decision 6: `["index", "getting-started", "architecture", "installation", "columns", "sorting", "filtering", "pagination", "selection", "row-pinning", "virtualization", "cells", "expanding", "controlled-state", "editing", "fallbacks", "sticky-header", "theming", "migration"]`.
- [x] T060 [US2] Write a verifier script `apps/docs/scripts/verify-manifest-coverage.mjs` that reads `apps/docs/shared/data-grid/examples/manifest.json`, greps every `.mdx` under `apps/docs/content/docs/data-grid/` for `exampleId='<id>'`, and exits non-zero if any manifest `id` is not referenced. Wire it into the docs `lint` script (or a new `pnpm --filter @ez-kit/docs verify:manifest`). Run it — MUST pass (SC-002).
- [x] T061 [US2] Run `pnpm --filter @ez-kit/docs build` and confirm zero warnings and zero broken internal links (SC-005). Fix any reported issues in the offending mdx file.
- [ ] T062 [US2] Extend `apps/docs/tests/data-grid-docs.spec.ts` with Playwright visual regression for one representative capability page per group: `cells/cell-types`, `filtering/date-range`, `selection/index`, `row-pinning`. Test light theme + dark theme. Regenerate baselines.
- [ ] T063 [US2] Smoke-check Fumadocs search by running `pnpm --filter @ez-kit/docs dev`, opening the search UI, querying each FR-011 term ("columns", "filtering", "sorting", "pagination", "selection", "row pinning", "cell types", "controlled state", "loading", "custom cell"), and asserting at least one data-grid page appears in the top results (SC-006). Record any miss in a follow-up issue.

**Checkpoint**: User Story 2 complete. Every capability has its own page,
every manifest example is referenced, search resolves all FR-011 queries.

---

## Phase 5: User Story 3 - Understanding the architecture (Priority: P3)

**Goal**: Contributors and power users can read advanced/reference pages
for `@ez-kit/data-grid-core` and `@ez-kit/data-grid-react`, understand the
three-layer model in depth, and decide where to extend.

**Independent Test**: A reader unfamiliar with the source can read
`advanced/core.mdx` and `advanced/react.mdx`, answer "which package owns
which responsibility", and locate the symbols `createDataGrid`,
`createColumns`, and `useDataGrid` without grep (acceptance scenarios in
spec US3). All pages build clean.

### Implementation for User Story 3

- [x] T064 [P] [US3] Author `apps/docs/content/docs/data-grid/advanced/core.mdx`. Frontmatter title "Core (advanced)". Body: the headless contract — what `@ez-kit/data-grid-core` exports, how it composes TanStack Table, and the rule that it MUST NOT import React. Per `contracts/docs-page.md`, this page has `appliesTo: 'core'` — NO `<DataGridDocsExample>`; use fenced code blocks for any code samples. Source bullets to `packages/data-grid/core/src/index.ts` and `packages/data-grid/core/README.md`.
- [x] T065 [P] [US3] Author `apps/docs/content/docs/data-grid/advanced/react.mdx`. Frontmatter title "React adapter (advanced)". Body: how `@ez-kit/data-grid-react` adapts core, what `useDataGrid` / `createColumns` / context surfaces look like, and how to build your own UI flavor (the "Build your own flavor" content from spec US3). Per `contracts/docs-page.md`, this page has `appliesTo: 'react'` — NO `<DataGridDocsExample>`. Source bullets to `packages/data-grid/react/react/src/index.ts` and the existing shadcn/heroui `createDataGrid` call sites as reference implementations.
- [x] T066 [US3] Create `apps/docs/content/docs/data-grid/advanced/meta.json` listing `["core", "react"]` with `title: "Advanced"`. (Depends on T064 and T065.)
- [x] T067 [US3] Update `apps/docs/content/docs/data-grid/meta.json` `pages` array to insert `"advanced"` immediately before `"migration"` (per research.md Decision 6).
- [ ] T068 [US3] Extend `apps/docs/tests/data-grid-docs.spec.ts` with one Playwright visual test for `advanced/react` in light theme. Regenerate baseline.

**Checkpoint**: User Story 3 complete. Architecture and contributor
documentation are present and discoverable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanliness sweep before the feature is declared done.

- [ ] T069 [P] Run the full docs-app CI gate: `pnpm --filter @ez-kit/docs lint && pnpm --filter @ez-kit/docs typecheck && pnpm --filter @ez-kit/docs test && pnpm --filter @ez-kit/docs build`. All four MUST pass with zero warnings (constitution Workflow rule 4 + SC-005).
- [x] T070 [P] Audit every new mdx file for line count using `find apps/docs/content/docs/data-grid -name '*.mdx' -exec wc -l {} +`. Any file > 800 lines MUST be split into a sub-page; flag any file > 400 lines for a follow-up split decision (constitution: file size).
- [ ] T071 [P] Manual accessibility pass on the new `<DataGridDocsExample />` toggle: keyboard reach via Tab from the preceding heading, arrow-key or Enter activation, screen-reader announces the active flavor, color-contrast meets WCAG AA (does NOT rely on color alone). Record any failure as a bug-fix task before checkpoint.
- [ ] T072 [P] Walk every page and verify the Authoring Checklist at the end of `contracts/docs-page.md` (frontmatter present, sections in order, exampleId values resolve, source bullets present, FR-011 keyword discipline, flavor-divergence notes where applicable, parent `meta.json` 1:1 agreement).
- [x] T073 Re-run `apps/docs/scripts/verify-manifest-coverage.mjs` after all phases — final SC-002 confirmation.
- [ ] T074 Final review against the success criteria in `spec.md`: SC-001 (10-minute install + render — manual time-box test), SC-002 (manifest coverage — automated), SC-003 (every public surface has an example — manual audit), SC-004 (flavor parity — manual audit), SC-005 (build clean — automated), SC-006 (search — manual smoke), SC-007 (≤ 3 clicks from landing — manual). Record each as PASS/FAIL.
- [ ] T075 Stage and commit using Conventional Commits — one logical group per commit (`docs(data-grid): add overview + getting started`, `docs(data-grid): add columns pages`, ..., `docs(data-grid): add advanced reference pages`). No changeset required (`apps/docs` is private per the plan's Constitution Check).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories (the new `<DataGridDocsExample />` must exist before any mdx page can use it).
- **User Story 1 (Phase 3, P1)**: Depends on Foundational. Independent of US2 and US3.
- **User Story 2 (Phase 4, P2)**: Depends on Foundational. Independent of US1 and US3 — can start in parallel with US1 if the team has capacity, but the MVP-first delivery strategy below recommends US1 first.
- **User Story 3 (Phase 5, P3)**: Depends on Foundational. Independent of US1 and US2.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1**: depends only on Phase 2. No cross-story dependency.
- **US2**: depends only on Phase 2. No cross-story dependency.
- **US3**: depends only on Phase 2. No cross-story dependency.

### Within Each User Story

- Page authoring tasks ([P] within a group) are parallel-safe — each touches a different `.mdx` file.
- The group's `meta.json` task is NOT parallel with its page tasks — it lists those pages and is authored after them.
- The top-level `data-grid/meta.json` is touched in three tasks (T016 for US1 slice, T059 for US2 extension, T067 for US3 insertion). These three MUST be sequential — they are NOT marked [P] and must run in their phase order.

### Parallel Opportunities

- **Within Phase 1**: T004 is `[P]` — runs alongside T001/T002/T003 sequence.
- **Within Phase 2**: T008 and T009 are `[P]` — can run alongside T005 → T006 → T007.
- **Within US1**: T010, T011, T012, T013, T014 are all `[P]` and authorable in parallel — five mdx files, no shared state.
- **Within US2**: Each "group" task block is parallel-safe internally. The columns group (T019–T023), filtering group (T026–T031), selection group (T034–T036), cells group (T040–T042), expanding group (T044–T046), and editing group (T049–T053) are all parallel-safe within themselves. The standalone capability pages (T055–T058 and T025, T033, T038, T039, T048) are all parallel-safe with each other and with the groups, modulo the rule that `meta.json` tasks (T024, T032, T037, T043, T047, T054) follow their groups.
- **Within US3**: T064 and T065 are `[P]`.
- **Within Phase 6**: T069, T070, T071, T072 are all `[P]`.

---

## Parallel Example: User Story 2 — Filtering group

```bash
# Launch all six filtering pages in parallel (different files, no
# cross-dependencies — the meta.json task waits until they're done):
Task: "T026 Author apps/docs/content/docs/data-grid/filtering/index.mdx"
Task: "T027 Author apps/docs/content/docs/data-grid/filtering/operators.mdx"
Task: "T028 Author apps/docs/content/docs/data-grid/filtering/panel.mdx"
Task: "T029 Author apps/docs/content/docs/data-grid/filtering/date-range.mdx"
Task: "T030 Author apps/docs/content/docs/data-grid/filtering/multi-value.mdx"
Task: "T031 Author apps/docs/content/docs/data-grid/filtering/global.mdx"

# Then run T032 to assemble the group meta.json.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T009 — TDD-first on T005 before T006)
3. Complete Phase 3: User Story 1 (T010–T018)
4. **STOP and VALIDATE**: Open `/docs/data-grid` in dev, follow the user-story-1 acceptance scenarios manually
5. Ship MVP — the landing, overview, getting-started, architecture, and per-flavor installs are live

### Incremental Delivery

1. **MVP**: Phase 1 → Phase 2 → Phase 3 → checkpoint → ship US1.
2. **Add depth**: Phase 4 (US2) — large but parallel-safe. Ship in batches by group if helpful (e.g., commit columns group as one PR, filtering group as another).
3. **Add contributor docs**: Phase 5 (US3).
4. **Polish**: Phase 6 — final CI gate, accessibility audit, manifest coverage check.

### Solo-developer Strategy (most likely path)

Because the project is currently solo-maintained per the constitution's
governance section, the parallelism above is opportunistic, not required.
A reasonable solo path:

1. T001 → T002 → T003 → T004
2. T005 (watch it fail) → T006 (watch it pass) → T007 → T008 → T009
3. US1 pages in priority order, ending with T015 → T016 → T017 → T018
4. US2 group by group: pages then the group's meta.json, repeat
5. T059 → T060 → T061 → T062 → T063
6. US3: T064 → T065 → T066 → T067 → T068
7. Phase 6 in order, end with T075 (commit batch)

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies.
- `[Story]` label maps a task to its user story for traceability and
  independent-test reporting.
- Tests are written before implementation for the new MDX shortcode
  (Principle IV — NON-NEGOTIABLE). See T005 → T006 ordering.
- MDX page authoring tasks have no per-file unit test. Their gates are
  `pnpm docs:build` (SC-005), the manifest-coverage verifier (SC-002), and
  representative Playwright visual regressions per group.
- The top-level `data-grid/meta.json` is updated **three times** (T016,
  T059, T067) — once per user story phase, never in parallel.
- No changeset is required for any task in this feature. `apps/docs/` is a
  private workspace package (constitution Principle V applies only to
  published packages).
- Commits follow Conventional Commits format. Suggested scope:
  `docs(data-grid)`.
- Avoid: vague tasks, same-file conflicts marked `[P]`, cross-story
  dependencies that would break independent delivery.
