---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** validation timing has one spelling per level, and the per-column one moves under its feature.

`validateOn` could be written three ways: `editing.validateOn`, `editing.validate.validateOn` (only
reachable when `validate` was the `{ schema }` form, and silently the winner of the two), and
`column.validateOn` at the column root. So adopting a zod schema from another example quietly
re-timed the whole form, and the one per-column setting that configures `editing` / `creating` sat
outside them while `component` and `description` sat inside.

```ts
// before
editing: { validateOn: 'blur', validate: { schema, validateOn: 'change' } }   // 'change' won
{ accessorKey: 'email', validateOn: 'blur' }

// after
editing: { validateOn: 'blur', validate: { schema } }
{ accessorKey: 'email', editing: { validateOn: 'blur' } }
```

- `ValidateConfig`'s `{ schema }` arm no longer carries `validateOn` / `validateDebounceMs`.
- `ColumnEditingConfig` and `ColumnCreatingConfig` gain them; `ColumnDef` and `ColumnMeta` lose the
  root-level pair. A column's `creating.validateOn` falls back to its `editing.validateOn`, the
  same way `creating.component` falls back to `editing.component`.
