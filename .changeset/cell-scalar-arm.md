---
'@ez-kit/data-grid-core': minor
---

`cell` takes the bare type id: `cell: 'date'` is `cell: { type: 'date' }`.

The same scalar-or-object shape `align`, `width` and `pinning` already use — one word for the
common case, the object for the exception that carries a `config` or a `component`. The scalar is
checked against the kit's registry exactly as `type` is. Not breaking; the object form is unchanged.
