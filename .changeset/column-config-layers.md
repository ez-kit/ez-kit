---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

A column's filter, editor and create field each take a config of their own — `filtering.config`,
`editing.config` and `creating.config` — laid over `cell.config` key by key. Every renderer of that
surface gets the one merged `config`: `filtering.component`, `editing.component`,
`creating.component` and a cell type's renderers, which already received `cell.config`, and now
also the kit's `MultiSelectFilter` and `BetweenInput`, as `config`. The filter model carries it as
`FilterModel.config`, and a filter field's `filtering.config` works the same way.

- The create field takes `cell.config`, then `editing.config`, then `creating.config` — the same
  inheritance as its value list. A key replaces the one beneath it whole.
- A layer never holds a value list: `items` / `useItems` stay their own options and win over it.
  A layer that carries one anyway warns in development and the key is dropped.
- The grid hands a layer on and reads none of it: matching stays the operator's `filterFn`.
- `createDataGrid({ columnConfig: defineColumnConfig<{ filtering?, editing?, creating? }>() })`
  declares the layers' type, and the bundle's columns — inline and from its builders — are checked
  against it. A surface it leaves out, every surface of a bundle without it, and the bare grid stay
  unchecked. The new type parameter is last everywhere and defaults to unchecked, so existing
  `DataGridBundle<…>` annotations keep compiling.

A column that sets no layer hands its renderers exactly the `config` it did before.
