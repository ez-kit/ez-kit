# 0015. Persist excludes config-derived column state

- Status: Accepted
- Recorded: 2026-10-27
- Related: [0004-logical-vs-physical-pinning](./0004-logical-vs-physical-pinning.md)

## Decision

**The column rules the config implies are one API, `table.grid.columnState { enforce, strip, signature }`, and only the persist utilities strip.** A column the config forces — `forcedStart` / `forcedEnd` pinning (the system columns and any `pinning: 'start'` / `{ side }` column) and `alwaysVisible` — is removed from `columnPinning`, `columnOrder` and `columnVisibility` by `extractState` / `useExtractedState`, and put back by `enforce` on every input: the `initialState` seed, the slice handlers and the controlled `state` publish. `onChange.*`, `onStateChange`, `useDataGridState` and `table.store.state` report the store as it is, forced columns included — do not strip there. The criterion is _forced_, not _system_: a system column the config only seeds (`initialSide`, `pinning: false`) is the user's and is persisted. Forced columns always sit on the outer edge of their side, in `columnPinning` and `columnOrder` alike; forced end columns are never listed in `columnOrder`. The enforce functions stay internal to core; only the `ColumnStateApi` type is exported.

## Context, rationale and rejected alternatives

The question that started this was whether `__drag__`, `__selection__`, `__expand__` and
`__actions__` belong in the public `columnPinning` value at all. They are noise in a stored value —
a saved view changes when a feature is switched on — but the store needs them, because TanStack
renders the pinned region from `columnPinning`.

**Exported functions instead of `table.grid.columnState` — rejected.** Exporting
`enforceColumnInvariants`, a strip function and `table.grid.columnInvariants` grows the API by
three names and freezes the shape of the invariants under semver, for a set of consumers that is
exactly this repository's own packages. Methods bound to the table also mean no caller has to know
which columns are forced.

**Stripping in every callback — rejected.** Two problems. Selectors read the internal store, so
there would be two truths about the same slice. And a controlled consumer that mirrors
`onStateChange` into its `state` prop would hand back a stripped value; `enforce` rebuilds an
array, `isControlledEcho` compares slice **references**, does not recognise the echo, and the
notifications loop. Avoiding that needs a reference link `strip(enforce(x)) === x` through a
WeakMap — infrastructure for cosmetics. The persist utilities are one-way (restore goes through
`initialState`, where `enforce` runs), so they have no loop and the existing `useExtractedState`
cache keeps references stable.

**Stripping by a list of system ids — rejected.** It would lose the user's choice for an
`initialSide` system column, and keep statically pinned user columns as noise. Forced is the right
line: exactly what `enforce` can rebuild is what `strip` removes, so `enforce(strip(s))` reproduces
any state the grid reached itself. `column-invariants.table.test.ts` holds that property across
`pin`, `moveColumn`, `dropColumn` and writes that try to unpin or hide the system columns.

**Forced columns on the outer edge (4a).** The property test found that TanStack's
`column.pin('end')` appends **after** `__actions__`, so a user column pinned to the end landed
outside the actions column. A stored value without forced ids could then not say which side of
them a column stood on. Weakening the guarantee to "same side" was rejected: after a reload a
column pinned to the end would jump inside `__actions__`. So `enforce` re-places forced columns at
the edge even when the input already has them elsewhere — a visible fix, noted in its changeset.

**Forced end columns are not listed in `columnOrder`.** TanStack appends every column a non-empty
order omits, in declaration order. A forced start column must therefore be listed (or it drifts to
the end); a forced end column must **not** be: system end columns are declared last
(`buildColumnList`), and only their absence keeps them after a column the saved order never
mentioned. Listing `__actions__` put it before such a column (`['c', 'a']` gave
`[__selection__, c, a, __actions__, b]`). An empty order means the declared order and is left
alone.

**Controlled `state` is enforced before it is published, and a correction is not reported.** The
publish writes straight into the base atoms, past the slice handlers, so a controlled
`columnPinning: { start: [], end: [] }` used to unpin the system columns. The corrected value is
cached per slice by the consumer's slice reference **and** `columnState.signature` — the config can
change the forced set while the slice stays the same object — and it is what the echo filter
compares against, so `onStateChange` stays silent: fixing the input is not a change the user made,
the same treatment `loading` normalisation already gets. Reporting it once was rejected: a
consumer persisting `onStateChange` would get a write nobody made. `useExtractedState`'s cache
keys on the same `signature`. Guards: `controlled-column-invariants.test.tsx`,
`extract-state.columns.test.ts`, `round-trip.test.tsx`, `use-extracted-state.test.tsx`.
