---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Add `partialize` to `withHistory`: the part of the state that history tracks.

`shouldRecord` decides which writes become history entries, but every step still snapshots, and
`undo` restores, the whole state. So a store that mixes data with UI state (a selection, an error
flag, a pending dialog) had that UI state rolled back by every `undo`. With
`partialize: (state) => ({ nodes: state.nodes, edges: state.edges })`:

- a step holds only the slice, so it also costs memory only for what it tracks;
- `undo` / `redo` / `goto` merge the slice back (`set(slice)` in zu-store, assigned onto the proxy
  in va-store) instead of replacing the state, so fields outside it stay as they are;
- a write that leaves the slice shallow-equal records no step and keeps the redo stack.

`defaultPasts`, `defaultFutures` and `shouldRecord` are typed over the slice, and so are
`store.history`, `useHistory` and `useTimeline` (whose `current` is now the slice). Without
`partialize`, behaviour and types are unchanged: the new `TSlice` type parameter defaults to the
full state.

`@ez-kit/store-core/history` exports the shared `PartializeOption` type and the `isSameSlice` check
both bindings use.
