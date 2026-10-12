# Implementation Report: DnD Phase 2 — The port

## Summary

`@ez-kit/data-grid-react` now hosts the drag-and-drop **port**: the `DndAdapter` contract, the
`DragSpec` / `DragAxis` / `SortableItemHandle` / `DndDropEvent` / `DndProviderProps` vocabulary, a
no-op default, `dnd` on `CreateDataGridOptions`, and a two-layer provider so **every grid root
publishes its own adapter — or an explicit none — and never inherits one**. The package names no
drag library, takes no new dependency, and renders byte-identical DOM for every existing consumer.

## Assessment vs Reality

| Metric        | Predicted (Plan) | Actual                                                 |
| ------------- | ---------------- | ------------------------------------------------------ |
| Complexity    | Medium           | Medium — as scoped                                     |
| Files Changed | 10 + changeset   | 11 (5 created, 5 updated, 1 changeset)                 |
| New code      | —                | 272 lines source + 207 lines tests                     |
| Tests         | 10 cases         | 8 new cases in `dnd.test.tsx` + 3 assertions elsewhere |

## Tasks Completed

| #   | Task                             | Status      | Notes                                                      |
| --- | -------------------------------- | ----------- | ---------------------------------------------------------- |
| 1   | The port's types                 | ✅ Complete | `types.ts`, 127 lines, `DragAxis` as const-object + union  |
| 2   | The no-op adapter                | ✅ Complete | Deviated — `.tsx`, not `.ts` (see below)                   |
| 3   | The two contexts and the hooks   | ✅ Complete | `context.tsx`, dev identity warning included               |
| 4   | The barrel                       | ✅ Complete | Values then types, per `keyboard-navigation/index.ts`      |
| 5   | `dnd` on `CreateDataGridOptions` | ✅ Complete | Beside `keyboardNavigation`; `DndBundleProvider` outermost |
| 6   | The grid root provides its own   | ✅ Complete | In `DataGridControlled`, above the factory-defaults reset  |
| 7   | Export the port                  | ✅ Complete | Bundle handshake deliberately not exported                 |
| 8   | Tests                            | ✅ Complete | 8 cases; all six plan criteria covered                     |
| 9   | The "no `@dnd-kit`" guard        | ✅ Complete | Deviated — strips comments first (see below)               |
| 10  | Closed-set / public-API asserts  | ✅ Complete | `DragAxis.Row` and `DragAxis.Column`                       |
| 11  | Changeset                        | ✅ Complete | `@ez-kit/data-grid-react` minor, alone                     |

## Validation Results

| Level                  | Status  | Notes                                                                        |
| ---------------------- | ------- | ---------------------------------------------------------------------------- |
| Type check (package)   | ✅ Pass | `tsc --noEmit`, zero errors                                                  |
| Lint (repo, 28 tasks)  | ✅ Pass | `--max-warnings=0`; includes `check-changesets.mjs` and `check-site-url.mjs` |
| Unit tests (package)   | ✅ Pass | 90 files / 873 tests                                                         |
| Full repo tests        | ✅ Pass | 28 tasks, every package                                                      |
| Docs guards            | ✅ Pass | `tree-shaking.test.ts` 36/36 — entry-point sets unchanged; `e2e-slots` 5/5   |
| Build                  | ✅ Pass | 15 tasks                                                                     |
| Size                   | ✅ Pass | Root entry 28.67 kB / 29 kB limit — **124 B headroom, see Risks**            |
| Guard negative control | ✅ Pass | Planting `'@dnd-kit/react'` in a source file fails the new test              |

## Files Changed

| File                                           | Action  | Lines     |
| ---------------------------------------------- | ------- | --------- |
| `…/react/react/src/data-grid/dnd/types.ts`     | CREATED | +127      |
| `…/react/react/src/data-grid/dnd/context.tsx`  | CREATED | +99       |
| `…/react/react/src/data-grid/dnd/noop.tsx`     | CREATED | +35       |
| `…/react/react/src/data-grid/dnd/index.ts`     | CREATED | +11       |
| `…/react/react/src/data-grid/dnd/dnd.test.tsx` | CREATED | +207      |
| `…/react/react/src/create-data-grid.tsx`       | UPDATED | +45 / −19 |
| `…/react/react/src/data-grid/data-grid.tsx`    | UPDATED | +42 / −23 |
| `…/react/react/src/index.ts`                   | UPDATED | +15       |
| `…/react/react/src/headless-contract.test.ts`  | UPDATED | +48       |
| `…/react/react/src/closed-sets.test.ts`        | UPDATED | +2        |
| `…/react/react/src/public-api.test.ts`         | UPDATED | +1        |
| `.changeset/dnd-port.md`                       | CREATED | +15       |

## Deviations from Plan

1. **`noop.ts` → `noop.tsx`.** WHAT: the no-op's file extension. WHY: `noopDndAdapter.Provider` is
   a component returning `<>{children}</>`, and JSX needs `.tsx`. The plan named `.ts` for a module
   it also specified as containing a component — an oversight in the plan, not a design change.

2. **The `@dnd-kit` guard strips comments before matching.** WHAT: the plan said "no file contains
   the string `@dnd-kit`"; the implementation removes block and line comments first. WHY: the
   port's own docblocks cite `@dnd-kit/react@0.1`'s eight-member `useSortable` return to justify
   why `SortableItemHandle` has three — the kind of prose that is the reason to keep a docblock,
   not a dependency. `apps/docs/test/e2e-slots.test.ts` strips comments for exactly this reason
   ("a spec explaining in prose which slot a kit stamps is not addressing it"), so this follows an
   established convention here rather than weakening the guard. The negative control confirms a
   real reference still fails.

3. **A `walkAll` helper beside the existing `walk`.** WHAT: a second file collector in
   `headless-contract.test.ts`. WHY: the existing `walk` skips `styles/` and `utils/`, which is
   right for the style rules and wrong for a dependency guard — a stray import could hide in
   `utils/`. The two existing cases keep their current file sets, so their meaning is unchanged.

4. **Test capture uses an effect-written wrapper object.** WHAT: the delegation test records the
   returned handle in `useEffect` rather than assigning during render. WHY: `react-hooks/globals`
   rejects reassigning an outer variable during render. `renderGrid` in `test-utils.tsx` already
   solves this the same way, so the test now mirrors it.

## Issues Encountered

- **Two lint errors on first pass**, both fixed: an `import/order` violation on the new `./dnd`
  import in `data-grid.tsx`, and the render-time reassignment above. No functional issue.
- **A pre-existing React warning** (`Received \`false\` for a non-boolean attribute \`pinned\``)
appears in the new test's stderr. It comes from `testComponents` and is present in the baseline
  render too — untouched, and out of scope.

## Tests Written

| Test File                        | Tests        | Coverage                                                                                                                                                                                                          |
| -------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data-grid/dnd/dnd.test.tsx` | 8            | inert handle identity; identical DOM without an adapter; `useDndEnabled` both ways; delegation with the spec intact; **nested-grid isolation**; dev warning fires on an identity change and stays quiet otherwise |
| `src/headless-contract.test.ts`  | +1           | No drag library named anywhere in the package (comments stripped)                                                                                                                                                 |
| `src/closed-sets.test.ts`        | +1 assertion | `DragAxis.Row === 'row'` — the const-object form survives                                                                                                                                                         |
| `src/public-api.test.ts`         | +1 assertion | `DragAxis` reachable from the package root as a value                                                                                                                                                             |

## Risks Carried Forward

- **Size headroom on the root entry is 124 B** (28.67 kB against a 29 kB budget). The port did not
  cause this — the budget was already close — but Phase 4's handle and commit land on the same
  entry, so the budget will likely need raising then. Flagging it now rather than discovering it
  as a CI failure.
- **`DndProviderProps.onDrop` is unused until Phase 4.** It carries ids only, by the Phase 1
  convention. If the commit path turns out to need more, widening a props type is additive.

## Next Steps

- [ ] Code review via `/code-review`
- [ ] Phase 3 — heroui adapter + `/dnd` subpath (`/prp-plan`), which is what proves the port's shape

---

## Review Round (separate lane, Opus reviewer)

**Verdict: approve-with-warnings.** No CRITICAL, no HIGH. The reviewer traced the two-context
design across controlled, uncontrolled, nested-bare, nested-bound, expanded-row and in-cell grids
and found the provider nesting correct; confirmed the dev warning is correctly shaped (ref written
after the check, so once per change, and once under StrictMode's double-invoke); and confirmed the
hook read before the dev `throw` is the component's first hook with no conditional hooks after it.
All four declared deviations were judged justified. Every finding below is **fixed**.

| ID  | Severity | Finding                                                                                                                                                                                                                                         | Fix                                                                                                                                                                                                        |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | MEDIUM   | `DndAdapter.Provider` is never mounted and `onDrop` never called, yet the docblocks assert both and the API ships as a public minor                                                                                                             | `@remarks` on `DndProviderProps` and `DndAdapter.Provider` stating the port is not end-to-end until the commit phase; same paragraph added to the changeset                                                |
| M2  | MEDIUM   | Exporting `noopDndAdapter` made it bindable: `createDataGrid({ dnd: noopDndAdapter })` is a natural way to switch drag off, and it sets `useDndEnabled()` to `true` — a handle behind every inert item, exactly what the gate exists to prevent | Dropped from `src/index.ts`. It has no consumer outside this package's own tests; re-adding an export later is cheap, un-exporting is a major. The comment now says switching drag off is `dnd: undefined` |
| M3  | MEDIUM   | `DndAdapterProvider` was exported inviting a placement that silently does nothing — a root republishes the context, so wrapping `<DataGrid>` from outside is overwritten                                                                        | One sentence in both docblocks: mount it **below** a root, e.g. around `children`                                                                                                                          |
| L1  | LOW      | `stripComments` had a **demonstrated** false negative: a `/*` inside a string literal opens a match that runs to the next real terminator, swallowing a genuine import with it                                                                  | A raw-source `DRAG_IMPORT_RE` now carries the guarantee (prose cannot match an import shape); the stripped scan stays as the wider net. Probed with the reviewer's own snippet — the guard now fails       |
| L2  | LOW      | The guard read source only, and only `@dnd-kit`, while calling itself "names no drag library"                                                                                                                                                   | Second case asserts the package manifest declares no drag package; `DRAG_PACKAGES` now lists five                                                                                                          |
| L3  | LOW      | Plan Task 8 case 2 was half-implemented — only the plain bundle was rendered, not the adapter-bound one, and the report claimed full coverage. As written it would have passed with the DnD providers deleted outright                          | Third render with `dnd: adapter` asserted against the same baseline. That is the half the changeset's "nothing renders differently" actually claims                                                        |
| L4  | LOW      | No bound-inside-bound case — the nested test used a bare inner grid                                                                                                                                                                             | New case: two bundles with two adapters, asserting the inner grid's spec reaches the **inner** adapter and the outer one records nothing                                                                   |

### Re-validation after the fixes

| Check                    | Result                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| Typecheck / package lint | ✅                                                                      |
| Package tests            | ✅ 90 files / **875** tests (was 873)                                   |
| Full repo tests          | ✅ 28 tasks                                                             |
| Repo lint                | ✅ 28 tasks                                                             |
| Build                    | ✅ 15 tasks                                                             |
| Size                     | ✅ 28.64 kB / 29 kB (marginally smaller after M2)                       |
| Guard negative controls  | ✅ both new halves fail on a planted import and on a planted dependency |

**Correction to the original report**: the "Tests Written" table above claimed all six plan
criteria were covered. L3 shows one was covered by half. It is now covered in full.

### Correction to the review: provider order does not matter, and the archived plan says it does

L4 argued the bound-inside-bound case earns its keep because swapping the two providers — grid
layer outside, bundle reset inside — would leave the bare-nested test passing while the new one
failed. **Probed: the swap changes nothing.** Both providers are ancestors of the same children, so
two _different_ contexts nested either way present identical values to everything below; and
`bundleDndAdapter` is read in the component body, above the JSX, where no provider in that JSX can
reach it. With the providers swapped, all nine cases still pass.

Two consequences worth recording rather than leaving implied:

- The new case is kept, on its own merit — a second bundle nested in the first is a real
  arrangement (a docs page switching kits, an app running two), and nothing else covers it. It is
  not, however, a guard on provider order, and no test can be.
- **The archived plan's Task 6 GOTCHA is wrong**: it says `DndBundleProvider adapter={null}` must
  be outside `DndAdapterProvider` "or the grid-level read would see the closed value". The read
  happens before either provider exists. The current nesting is fine and reads top-down in the
  order the two layers are conceptually applied, so it stays — but a future reader should not
  inherit the belief that it is load-bearing. The shipped source comment does not make that claim.
