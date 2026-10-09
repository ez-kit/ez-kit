# Implementation Report: DnD Phase 3 — heroui adapter + `/dnd` subpath

## Summary

`@ez-kit/data-grid-heroui/dnd` ships, exporting `adapter` — the first implementation of the Phase 2
port, built on `@dnd-kit/react@0.1.21` and delivered as the kit's **first optional peer
dependency**. Measured, not assumed: the kit root's size is byte-identical, nothing the root
exports reaches the drag library, and both halves of the library are externalised from
`dist/dnd.js` rather than inlined.

## Assessment vs Reality

| Metric        | Predicted (Plan) | Actual                                         |
| ------------- | ---------------- | ---------------------------------------------- |
| Complexity    | Medium           | Medium                                         |
| Files Changed | 7 + changeset    | 7 (2 created, 5 updated) + changeset           |
| New code      | —                | 118 lines adapter + 134 lines tests + 50 guard |
| Tests         | 12 cases         | 11 adapter cases + 3 bundle guards             |

## Tasks Completed

| #   | Task                            | Status      | Notes                                                       |
| --- | ------------------------------- | ----------- | ----------------------------------------------------------- |
| 1   | Install the optional peer       | ✅ Complete | 7 packages added, nothing else re-resolved                  |
| 2   | The adapter                     | ✅ Complete | `src/dnd.tsx`; `toDropEvent` extracted as a testable helper |
| 3   | Build entry, export map, budget | ✅ Complete | Regex `external`; budget 560 B against a measured 486 B     |
| 4   | The guard with teeth            | ✅ Complete | **Redesigned mid-task — see Deviations.** 3 cases           |
| 5   | Adapter tests                   | ✅ Complete | 11 cases                                                    |
| 6   | Changeset                       | ✅ Complete | `@ez-kit/data-grid-heroui` alone                            |

## Validation Results

| Level                 | Status  | Notes                                                                       |
| --------------------- | ------- | --------------------------------------------------------------------------- |
| Typecheck (kit)       | ✅ Pass | Zero errors                                                                 |
| Lint (repo, 28 tasks) | ✅ Pass | One `import/order` error fixed by `lint:fix`                                |
| Kit tests             | ✅ Pass | 11 new cases                                                                |
| Docs tests            | ✅ Pass | 39 cases, including the 3 new bundle guards                                 |
| Full repo tests       | ✅ Pass | 28 tasks                                                                    |
| Build                 | ✅ Pass | 15 tasks                                                                    |
| Size — kit root       | ✅ Pass | **14.81 kB, measured with and without the new entry: identical**            |
| Size — `dist/dnd.js`  | ✅ Pass | 486 B against a 560 B budget                                                |
| Externalisation       | ✅ Pass | `dist/dnd.js` carries bare `from "@dnd-kit/react"` and `…/sortable` imports |
| Containment           | ✅ Pass | `src/dnd.tsx` is the only source file in the kit naming the library         |
| Lockfile              | ✅ Pass | Only `@dnd-kit/*` (6) + `@preact/signals-core`; zero removed lines          |

## Files Changed

| File                                               | Action  | Lines                                  |
| -------------------------------------------------- | ------- | -------------------------------------- |
| `packages/data-grid/react/heroui/src/dnd.tsx`      | CREATED | +118                                   |
| `packages/data-grid/react/heroui/src/dnd.test.tsx` | CREATED | +134                                   |
| `packages/data-grid/react/heroui/package.json`     | UPDATED | exports, peer + meta + dev, size-limit |
| `packages/data-grid/react/heroui/tsup.config.ts`   | UPDATED | entry + regex external                 |
| `apps/docs/test/tree-shaking.test.ts`              | UPDATED | +50                                    |
| `pnpm-lock.yaml`                                   | UPDATED | 7 packages                             |
| `.changeset/dnd-heroui-adapter.md`                 | CREATED | +14                                    |

## Deviations from Plan

1. **The guard as planned had no teeth, and the negative control is what found it.** WHAT: Task 4
   specified `bundledCodeOf(KIT_ROOT, ['DataGrid'])`. Run against a real leak —
   `export { adapter } from './dnd'` appended to the kit's `index.ts` — **it passed**. WHY: esbuild
   shakes the unreferenced `adapter` back out, so the bundle is clean even though the package now
   names the peer. Two fallback checks were probed and also failed to discriminate: grepping
   `dist/index.js` / `dist/index.d.ts` misses it because `splitting: true` puts the import in a
   shared chunk, and grepping every `dist` file does not discriminate either — a chunk names the
   library in the clean build too, since that is where the adapter's own code lives. FIX: the root
   case bundles the **whole surface** (`bundledCodeOf(KIT_ROOT)` with no imports), which is the
   property that actually differs. Re-run against the same leak: **fails**, as it must. The
   reasoning is recorded in the test's own docblock so the weaker forms are not reintroduced.

2. **`src/dnd.tsx`, not `src/dnd.ts`.** WHAT: file extension. WHY: the module renders
   `<DragDropProvider>`. Anticipated in the plan's Notes.

3. **`SortableDragEndEvent` declared structurally instead of imported.** WHAT: the `dragend` payload
   type. WHY: dnd-kit's real type is `DragDropEvents<U, V, W>['dragend']`, generic over four
   parameters and exported from `@dnd-kit/abstract` — a transitive dependency this package does not
   declare and must not start declaring. Four fields are read; they are declared, and the cast at
   the single call site is scoped and commented.

4. **The size-limit note lives in the module docblock, not beside the entry.** WHAT: placement.
   WHY: `package.json` is JSON and cannot carry a comment. The note — that `size-limit` excludes
   peers, so the number measures the adapter's own code and says nothing about what drag costs a
   consumer — is in `src/dnd.tsx` where a reader of the adapter will meet it.

## Issues Encountered

- **The guard defect above**, found by the negative control the plan mandated. Worth stating
  plainly: had the control been skipped, a guard that passes unconditionally would have shipped,
  and the phase's central claim would have been protected by nothing.
- **One `import/order` error**, fixed by `lint:fix`.

## Findings Recorded Against the PRD

- **`import/no-extraneous-dependencies` is not enabled in this repo.** `eslint.config.mjs`
  configures `import/resolver` and `import/order` only. The PRD's _Typing and lint_ paragraph
  anticipated configuring it; nothing was needed.
- **The peer range question is settled**: `^0.1.21` (`>=0.1.21 <0.2.0`). Listed as open in the PRD.
- **The port needed no changes.** Phase 3 is the first real test of the Phase 2 contract, and it
  fit: `DragSpec`'s four fields map onto `useSortable`'s `id` / `index` / `type`+`accept` /
  `disabled`, and `SortableItemHandle`'s three members are three of the eight the hook returns.

## Tests Written

| Test File                             | Tests | Coverage                                                                                                                                                                                                                |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/…/heroui/src/dnd.test.tsx`  | 11    | Port shape; the three-member handle under a real provider; a disabled item; and the drop translation — both axes, numeric-id stringification, and all four refusals (cancel, no target, self-drop, foreign/absent type) |
| `apps/docs/test/tree-shaking.test.ts` | +3    | Nothing the kit root exports reaches the drag library; the subpath does (positive control); the subpath specifier is externalised rather than inlined                                                                   |

## Risks Carried Forward

- **`jsdom` cannot drive a real drag**, so the pointer path is untested until Playwright reaches it
  in Phase 4. Designed around: the refusals live in a pure function that is tested directly.
- **The adapter's `Provider` is still not mounted by the grid**, so the M1 caveat from Phase 2
  stands for one more phase. Both the changeset and the port's `@remarks` say so.

## Next Steps

- [ ] Code review via `/code-review`
- [ ] Phase 4 — row drag: the handle, the commit through `dropRow`, and the first rendered affordance

---

## Review Round (separate lane, Opus reviewer)

**Verdict: approve-with-warnings.** No CRITICAL, no HIGH. `SortableDragEndEvent` was verified
field-for-field against `@dnd-kit/abstract`'s real `dragend` payload, the numeric/symbol/foreign-type
refusals were confirmed correct (`1 === '1'` is false, so no false self-drop), `dist/dnd.d.ts` names
no `@dnd-kit` type so a consumer without the peer type-checks clean, and the optional-peer wiring
conforms to AGENTS.md. All six findings are **fixed**.

| ID  | Severity | Finding                                                                                                                                                                                                                                                                      | Fix                                                                                                                                                                                                                                                                                          |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | MEDIUM   | The guard covered **one** entry of sixteen. A `./dnd` import added to a block reached by `./core` or `./visibility` — the plausible homes for a drag handle in a later phase — but not by the root's own surface would have passed                                           | The guard now reads the kit's `exports` map and asserts every published entry but `./dnd`. 23 cases, generated from the manifest so a new subpath is covered the day it is added. Negative control: a leak planted in `./core` alone now **fails**                                           |
| M2  | MEDIUM   | `toDropEvent` validated `source.type` only. Correctness rested entirely on `accept` gating collisions — real today, but it cannot gate a droppable registered without one (a trash zone, a group header), and such a drop would have committed a foreign `targetId` silently | A fifth refusal: `target.type !== axis`. **Probed before adding it** — a sortable's droppable does carry the `type` its item was registered with (`droppableType: "row"`), so the check is safe and does not break ordinary drops. The docblock says why it is not redundant with `accept`   |
| M3  | MEDIUM   | The `disabled` case was vacuous — it asserted `isDragging === false`, true of every item, and would have survived deleting the mapping outright                                                                                                                              | Replaced with two cases that spy on `useSortable` and assert the **input the adapter builds**. This is the adapter's only real decision and was previously asserted nowhere. Mutation-checked both ways: removing `accept` fails the first, removing the conditional spread fails the second |
| L1  | LOW      | Prose claimed `canceled` covers "released outside any target"; dnd-kit reports that as `canceled: false` with a null target — the _second_ refusal                                                                                                                           | Corrected in both the adapter docblock and the test comment                                                                                                                                                                                                                                  |
| L2  | LOW      | `not.toMatch(/…\|class Sortable\b/)` could never match esbuild's actual emission (`var Sortable = class extends …`), so that assertion was carried by its sibling alone                                                                                                      | Pattern covers the `var X = class` form; the reason is in a comment                                                                                                                                                                                                                          |
| L3  | LOW      | The handle test checked three members were present, not that only three were — leaving the "mapped member by member" claim unguarded                                                                                                                                         | `expect(Object.keys(handle).sort())`                                                                                                                                                                                                                                                         |

### Re-validation after the fixes

| Check                             | Result                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Typecheck / lint (repo, 28 tasks) | ✅ — one `@typescript-eslint/consistent-type-imports` error fixed on the way              |
| Kit tests                         | ✅ 13 (was 11)                                                                            |
| Docs tests                        | ✅ **61** (was 39) — the guard grew from 1 entry to 23                                    |
| Full repo tests                   | ✅ 28 tasks                                                                               |
| Build                             | ✅ 15 tasks                                                                               |
| Size                              | ✅ kit root 14.81 kB unchanged; `dist/dnd.js` 498 B / 560 B (the fifth refusal cost 12 B) |
| Negative controls                 | ✅ leak in `./core` fails the guard; both mapping cases fail under mutation               |
