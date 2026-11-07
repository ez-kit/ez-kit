# Proposal

## Why

Filter debounce currently depends on the rendering branch: fallback text inputs and global search wait, while standard registered text and number editors commit every change. With `draft: true`, the additional input-local delay lets Apply use stale values and lets a pending search reappear after reset.

## What Changes

- Give built-in text and single-number filter inputs one shared React-layer commit policy across header filters, filter panels, standalone filters, filter fields, and global search. Keep immediate visual feedback and preserve numeric value types.
- Without `draft`, debounce typing and keyboard deletion using the existing 250 ms default, target-level override, and global-search override. A delay of `0` commits immediately.
- With `draft: true`, write input changes into the table draft immediately; The Apply button and programmatic apply use the latest draft without flushing input timers.
- Make explicit clear/reset and external replacement invalidate pending input work, including a clear/reset whose table value is already empty. Changing the operator cancels work for the previous operator.
- Keep select, boolean, date, range, multi-select, and custom editors immediate. Keep model/table setters and panel batch writes synchronous.
- Preserve configured `FilterModel.debounce` as metadata even when draft mode bypasses the delay; do not add required kit slots or a new public timing option.
- **BREAKING (observable timing):** standard text and single-number editors that previously bypassed a nonzero debounce will now wait; draft inputs will commit into the internal draft immediately. Existing option names and the 250 ms default remain unchanged; `debounce: 0` preserves immediate non-draft commits.

## Capabilities

### New Capabilities

- `data-grid-filter-input`: built-in filter input timing, cancellation, number preservation, draft application, and kit/surface parity.

### Modified Capabilities

- `data-grid-filter-model`: distinguish configured debounce metadata from effective input timing, and explicitly preserve synchronous single-target and batched setters.

## Impact

- Shared React input handling in `packages/data-grid/react/react/src/data-grid/`, including `filter-text-input.tsx`, `global-filter-input.tsx`, `render-filter-input.tsx`, `filter-model.ts`, and clear/reset integration; internal core reset/write notifications may be needed to invalidate same-value commands.
- Standard text/number filter integration and regression coverage in both shadcn and HeroUI. Their editing/creating renderers retain their current behavior; vendored shadcn primitives are untouched.
- Timing docblocks, filtering/defaults/deferred-apply documentation, and a release changeset for affected published packages. No changes to `packages/form`, request libraries, public filter value shapes, or dependencies.
- Durable decisions will be recorded as an ADR and linked from `AGENTS.md` during implementation, before archival.
