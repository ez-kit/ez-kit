# Tasks

## 1. Canonical optional adapter entry

- [x] 1.1 Add the existing supported `@dnd-kit/react` and `@dnd-kit/dom` ranges to the React package's development dependencies and optional peers, update the lockfile with plain `pnpm install`, and verify that no mandatory drag dependency or unrelated dependency upgrade was introduced.
- [x] 1.2 Move the adapter implementation into `react/react/src/dnd-kit/adapter.tsx`, add its explicit `index.ts` exports, and migrate the union of the existing kit behavior scenarios into `adapter.test.tsx`; verify that all migrated activation, cancellation, drop, displacement, accessibility and disabled-handle cases pass with the unchanged `DndAdapter` contract.
- [x] 1.3 Add the `./dnd-kit` package export, tsup entry and complete dnd-kit namespace externalization; verify the built entry's runtime and type imports and direct adapter binding, then add a measured size budget and verify it passes without raising unrelated budgets.
- [x] 1.4 Add direct-import documentation in the React README and `apps/docs/content/docs/data-grid/drag-and-drop/api.mdx`, including the required peers and explicit `createDataGrid({ dnd: adapter })` opt-in; verify examples type-check and the canonical adapter suite passes under both standard React and `vitest.react18.config.ts`.

## 2. Kit compatibility wrappers

- [x] 2.1 Replace both kit `src/dnd.tsx` implementations with explicit shared-entry value/type re-exports, retaining the installed shadcn path and its import recipe; replace duplicated behavior suites with compatibility tests proving all seven runtime exports are identical to the shared exports and all ten existing types, including `AnchorSide`, remain assignable through each kit path.
- [x] 2.2 Update the kit README and drag-and-drop documentation to describe the shared implementation while retaining existing kit/local imports and customization via the existing adapter contract; verify the kit builds, type checks and compatibility tests and confirm no kit visual component or vendored primitive changed.
- [x] 2.3 Run the existing row, column, virtual-row, column-panel, sort-builder and drag-announcement browser scenarios for both `shadcn` and `heroui` projects; verify accepted, refused, keyboard and pointer operations retain their previous outcomes and preserve evidence of any failures before changing implementation.

## 3. Optional dependency and registry delivery guarantees

- [x] 3.1 Extend `apps/docs/test/tree-shaking.test.ts` and its entry classification for the new built React entry; enumerate each package's own non-adapter exports, fix the existing HeroUI-only manifest lookup in the two-kit loop, and verify all ordinary entries exclude drag while all three adapter paths positively reach external dnd-kit modules without kit visuals or the all-in compound.
- [x] 3.2 Add a built-package consumer check that imports and type-checks ordinary React/kit entries with drag peer resolution unavailable, plus an adapter positive control with supported peers; verify both runtime modules and root declarations preserve optionality and that emitted adapter output keeps `@dnd-kit/react/sortable` external.
- [x] 3.3 Update registry generation metadata/comments for the shared adapter, preserve the two-item file/dependency contract, and test supported peer-range alignment between React and both kits; run `pnpm --filter @ez-kit/docs registry:build` and verify `registry-payload.test.ts` passes with no dnd-kit reference in the ordinary grid item.
- [x] 3.4 Add a versioned registry/package fixture that distinguishes a React release without `./dnd-kit` from the first release providing it; verify the generated React dependency lower bound selects the supplying release and the installed shadcn wrapper resolves all compatibility exports against its built/packed package. Keep package versions under the normal changesets workflow rather than manually bumping manifests.

## 4. Release notes and durable architecture record

- [x] 4.1 Add a minor React changeset for the public subpath and appropriate patch notes for the HeroUI and docs delivery changes, preserving unrelated pending changesets; verify `node scripts/check-changesets.mjs` accepts the files and none names the private shadcn package.
- [x] 4.2 Record the design's Durable decisions in a new ADR referencing ADRs 0002 and 0014 and add its concise rule to `AGENTS.md`; verify links resolve, existing accepted decisions are intact and documentation describes the implemented optional-entry and compatibility boundaries.

## 5. Cross-package verification

- [x] 5.1 Run `pnpm verify:affected --concurrency=2` and the core, React and published kit size checks after building the changed entries; verify dependent docs tests, package exports, declarations and all relevant budgets pass with the regenerated registry.
- [x] 5.2 Review the final diff against the spec's import, compatibility, optionality, delivery and behavior scenarios; verify all are covered and unrelated runtime changes on the branch are preserved. If committing, run the full sequential `pnpm ci` gate and the repository-required dependency audit before creating a commit.

## Workflow follow-up

- Review and verify the completed change before archiving it through the archive workflow.
- Publish through the existing develop release flow; serve the registry wrapper only alongside the published React release providing `./dnd-kit`.
