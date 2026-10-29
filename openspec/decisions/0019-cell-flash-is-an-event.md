# 0019. A cell flash is an event, carried by a private atom

- Status: Accepted
- Recorded: 2026-10-28
- Related: [0001-no-react-memo](./0001-no-react-memo.md), [0003-consumer-composed-features](./0003-consumer-composed-features.md)

## Decision

**A cell flash is never table state.** No slice, no `options.state` / `options.atoms` entry, nothing
in `onStateChange`, `useDataGridState`, `table.store.state` or the persist utilities. The phase a
cell is in is that cell's own React state. The automatic flash on a value change is decided inside
the rendered cell, by comparing the value with the one it showed before. The only shared piece is
`cellFlashingFeature`'s **private** request atom: `table.flashCells(params)` writes the last request
into it, and each rendered data cell subscribes to it in an effect and checks the address in the
callback, so only the cells a request names set state. The atom is made through
`storeReactivityBindings()` (no direct `@tanstack/store` dependency) and is not exported; the React
layer reaches it through `flashRequestsOf(table)`.

## Context, rationale and rejected alternatives

The feature serves grids fed by polling or a socket, where values change in place and the user
must notice which ones moved. A flash describes a moment, not data: it lasts a second, nothing
restores it, and nobody controls it from outside the way they control sorting.

- **A `state.flashing` slice** keyed by `rowId × columnId` was rejected. Every poll would write the
  store and wake every selector on it, reach the consumer's `onStateChange`, be eligible for the URL
  or storage through persist, and need its stale entries swept. That is the alternative most likely
  to be proposed again as a "simplification", which is why this is recorded.
- **A hand-written listener map** (`Map<rowId|colId, Set<fn>>` with a `subscribeCellFlash` table
  method) was the first draft. It re-implements what an atom's `subscribe` already does, with an
  extra public method to keep stable.
- **`flashCells` setting the attribute in the DOM itself**, by finding
  `td[data-row-id][data-column-id]`, was rejected: React overwrites the attribute on the next
  render, and the package does not search the DOM (ADR 0008).
- **`useSelector` on the atom** with a "seq if addressed to me" selector was tried and replaced by a
  subscription. The selector version had to start the flash with `setState` in an effect reacting to
  the selected value (`react-hooks/set-state-in-effect`), and needed a remembered baseline `seq` so
  a cell mounted after a request would not replay it. The atom's `subscribe` reports changes only,
  so a subscription in an effect needs neither.

Because the grid uses no `React.memo` (ADR 0001), every rendered cell already re-renders when `data`
changes, so the automatic path needs no channel at all — only a ref holding the last value. The
comparison runs in an effect after commit rather than during render, so StrictMode's double render
cannot read as a change.

Guards: `packages/data-grid/core/src/features/flashing/flashing.test.ts` (no state, no
`onStateChange`), `packages/data-grid/react/react/src/data-grid/cell-flash.test.tsx` (behaviour,
including "a cell mounted after a request does not replay it"), and the flashing cases in
`rerender-isolation.test.tsx` (only addressed cells re-render).
