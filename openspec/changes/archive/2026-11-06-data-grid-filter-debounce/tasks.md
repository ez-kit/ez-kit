# Tasks

## 1. Shared scalar input timing

- [x] 1.1 Add failing regression cases beside `filter-text-input.test.tsx` and `column-filter-debounce.test.tsx` for registered text and single-number editors, table/target/search precedence, `0`, rapid typing, and keyboard deletion; verify the nonzero registry timing cases fail for the current implementation.
- [x] 1.2 Implement the shared edit-driven commit hook and mounted scalar controller; route fallback text, registered text/number filter branches, and `GlobalFilterInput` through it using `FilterModel.editor`. Verify the timing cases pass and numbers remain numeric in plain and operator-bearing values.
- [x] 1.3 Add lifecycle coverage for Strict Mode mount, unmount, callback changes, unrelated rerenders, and timing-mode changes; verify no mount-time, duplicate, stale, or restarted-deadline commit occurs. Remove superseded duplicated debounce state/effects and verify no remaining consumer needs the old helper before deleting it.
- [x] 1.4 Update filtering-related docblocks in React options/types, core column options, and `FilterModel.debounce` to describe text/number eligibility, configured metadata, keyboard deletion, and `0`; verify existing defaults/model resolution tests remain unchanged except for new assertions.

## 2. Command cancellation and external synchronization

- [x] 2.1 Add failing cases for same-value clear, reset before expiry, changed controlled replacement, delayed controlled echo, operator switches across both matching and different `input` kinds, and two independently pending targets; verify each exposes the missing cancellation or synchronization behavior it is intended to cover.
- [x] 2.2 Add the private table-scoped command bridge at adapter state-handler/target-write and reset boundaries, with scoped invalidation and input-origin tracking. Cover model/column setters, full filter-array writes, global search, axis resets, and `table.reset()`; verify all cases in 2.1 pass, updater functions run only as intended, and no extra query callback is emitted by invalidation.
- [x] 2.3 Verify synchronous single-target and panel batch setters with nonzero debounce, including mixed column/field targets, omission removal, preservation of plain filters, and scoped clear. Extend model/panel tests so immediate reads and exactly one non-draft batch callback prove the existing setter contract.
- [x] 2.4 Document clear/reset versus keyboard deletion, external replacement, and unmount cancellation on the filtering docs page; verify the examples use existing public APIs and describe same-value explicit clear without requiring a new consumer reset counter.

## 3. Immediate draft input and guarded Apply

- [x] 3.1 Extend `data-grid/draft.test.tsx` to assert freshly entered text, numeric filters, and search in the applied snapshot, with pending sorting and configured debounce 800. Cover Apply button, and `table.draft.apply()`; verify the current stale-search case fails before integration.
- [x] 3.2 Bypass input delay in draft mode and write valid emitted values synchronously to the table draft. Verify draft reads update immediately, outward callbacks stay silent until Apply, one combined state notification includes all latest values, and advancing timers leaves the draft clean.
- [x] 3.3 Keep Enter behavior native for registry text/number editors, fallback input, and search; verify Enter leaves the draft pending and explicit Apply uses current values.
- [x] 3.4 Cover `draft.reset()`, `draft.resetAxis()`, and table reset after scalar/search edits, plus a mode transition with pending local input. Verify affected values return to the correct applied/reset values without delayed reappearance, unrelated axes are preserved for axis reset, and configured model debounce remains intact.
- [x] 3.5 Update `apps/docs/content/docs/data-grid/state/defaults.mdx` and deferred-apply guidance in `production.mdx` and any dedicated deferred-apply page present. Verify they distinguish configured 250 ms timing from immediate internal draft edits and explain Apply with one outward query notification.

## 4. Real-kit parity and integration

- [x] 4.1 Add shadcn and HeroUI tests using their real registered text/number editors across header filters and panel/standalone filter fields. Verify scalar timing, numeric type/empty behavior, explicit clear, and explicit draft application; include the existing supported intermediate numeric behavior without introducing a parser.
- [x] 4.2 Add regression assertions that select, boolean, date, numeric range, multi-select, custom filtering components, and custom model consumers retain immediate writes. Verify the same shared text/number renderers retain their current editing/creating behavior.
- [x] 4.3 Extend existing filtering/deferred-apply browser coverage for both kits with rapid text/number typing, immediate Apply, and clear/reset before expiry; verify applied values and callback/request counts rather than only visible text or dirty flags. Keep keyboard/composition coverage where actual kit event behavior requires it.
- [x] 4.4 Record the design's Durable decisions in a new ADR with an `AGENTS.md` link and add a release changeset naming affected published packages only. Verify the ADR explains timing ownership and command invalidation, the release note calls out observable timing and `debounce: 0`, and `scripts/check-changesets.mjs` accepts the package selection.
- [x] 4.5 Run the targeted React/core/kit tests, existing render-isolation and feature-optionality tests, applicable React 18 coverage, and both kits' filtering browser cases. Run `pnpm verify:affected` with the repository's prescribed build prerequisites; verify lint, types, tests, registry payload checks, and documented option checks pass. Run the full sequential gate once if committing the implementation.

## Workflow follow-up

- Review the implementation and its timing migration notes before archival.
- Archive through OpenSpec after review so both delta specs are reconciled into the main capability specs.
