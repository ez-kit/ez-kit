---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** a column's `pinning` keys are `side` / `initialSide`, and the common case is a scalar.

`pinning: { pin: 'left' }` stuttered — the feature's name was repeated inside its own config, and
`pin` named the feature where every neighbour names the state (`visibility: { initialHidden }`, not
`initialVisibility`). The value here is not a switch but an edge, so the key now says so:

```ts
{ accessorKey: 'id', pinning: 'left' }                   // static — no pin section in the menu
{ accessorKey: 'id', pinning: { initialSide: 'left' } }  // seed — the user may move it
{ accessorKey: 'id', pinning: false }                    // pinning disabled for this column
```

The scalar is the long `{ side: 'left' }`, normalized on the way into column meta, and it is the
same scalar-or-object shape `align` and `width` use: one word for the common case, an object only
where the scalar cannot say enough.

`ColumnPinSide` is exported as a const object plus a same-named union. It stays `'left' | 'right'`
rather than `'start' | 'end'` on purpose: a pinned column sticks to a viewport edge, and that edge
does not flip with the text direction.

Migration is a rename: `pin` → `side`, `initialPin` → `initialSide`, or drop the object entirely
where it held only `pin`.
