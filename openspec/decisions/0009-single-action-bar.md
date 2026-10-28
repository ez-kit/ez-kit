# 0009. Exactly one action bar

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0008-layouts-and-optional-slots](./0008-layouts-and-optional-slots.md)

## Decision

**Exactly one action bar, with a live section per concern — do not split it again.** `DataGrid.ActionBar` / `core.ActionBar` is required and in `GridFeature.Core`; selection and draft sections are live at once and bulk actions stay enabled beside a dirty draft. Guard: `apps/docs/e2e/packages/data-grid/selection/action-bar.spec.ts`.

## Context, rationale and rejected alternatives

- **There is exactly one action bar, with a live section per concern — do not split it again.**
  `<DataGrid.ActionBar />` / `core.ActionBar` owns the chrome for both the current selection and
  the pending draft. It replaced a `DataGrid.SelectionBar` / `DataGrid.DraftBar` pair, each of
  which drew a whole bar — its own sticky anchor, surface and shadow — and which were kept apart
  by a `return null` inside the selection one. That gate read `rowSelection` and nothing else, so
  a draft edit (a sort, a column filter, a search term) never re-ran it and both bars mounted at
  the same sticky position, overlapping. **The fix is the single component, not the subscription
  width:** two pieces of chrome pretending to be one bar can only agree while every gate hiding
  one of them re-runs in lockstep with the other, and one component has no second gate to fall
  out of step with. The bar nonetheless subscribes broadly (`useDataGridState((s) => s)`), which
  is a simplification riding along rather than the thing that makes it correct — it reads five
  slices (`rowSelection`, plus `sorting` / `columnFilters` / `globalFilter` / `applied` behind
  `draft.isDirty()`), and five narrow calls would be just as correct. What is impossible is
  **one** narrow selector: a selector that stitches those slices into an object returns a fresh
  object every time, which is the infinite-loop case the store contract forbids. The cost is
  real and accepted: a grid with selection alone used to re-render the bar on `rowSelection`
  and now re-renders it on every keystroke in a filter, every sort and every page change. One
  small subtree, bounded, not a defect.

  **Both sections are live at once, and the old mutual exclusion is retired rather than
  pending.** The selection used to stand down during a draft on the grounds that applying a query
  can drop the selected rows, leaving bulk actions on a stale set. The hazard is real and is
  already handled one level down: the selection is valid against the **applied** query — which is
  what the user is looking at — and `table.draft.apply()` clears the row selection in the same
  state change. So bulk Delete stays enabled beside a dirty draft, and the count is interactive.
  `DraftBarProps.selectedCount` and the `draft-bar-selected-chip` slot went with that decision;
  the count is rendered once, by the section that owns it.

  `GridFeature.Selection` and `GridFeature.Draft` are gone with their only member each —
  `ActionBar` is in `GridFeature.Core`, because a grid with `draft` and no `rowSelectionFeature`
  still renders the bar and must not depend on a kit advertising selection support. It is
  **required**, not a member of `FEATURE_OPTIONAL_COMPONENTS`: unlike `TableWrapper` /
  `TableScroll` / `Layout`, the package has no correct fallback for it.
  `apps/docs/e2e/packages/data-grid/selection/action-bar.spec.ts` is the guard — it is the only
  spec that drives selection and a draft in one grid, which is the state either defect needs.
