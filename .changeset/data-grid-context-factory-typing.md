---
'@ez-kit/data-grid-react': minor
---

**Breaking:** the grid context is typed from a value, not from a program-wide declaration. The
`GridContext` interface is removed. It was one type shared by every grid in the program, so two
grids could not carry different contexts, and every key had to be optional because the interface
could not know which grid received a value.

- `createDataGrid` takes a new `context` option, the factory default for every grid from the
  bundle. Its type is inferred from the value and becomes the bundle's context type.
- The bundle gets a `useGridContext` member that reads that type with every key present. Its
  `DataGrid` and `useDataGrid` take `context` as a `Partial` of it, so a grid names only the keys it
  overrides. `DataGridBundle` gets a third type parameter, `TContext`, which defaults to "no
  context", so existing annotations keep their meaning.
- `useGridContext.withTypes<T>()` derives a typed reader for a grid without a factory of its own.
  It is an unchecked assertion and the same hook at runtime.
- Where no factory context is bound (a kit's prebuilt `DataGrid`, a bare `useDataGrid`,
  `DataGridOptionsProvider`, the package-level `useGridContext`), the context is typed
  `Record<string, unknown>`. `GridContextRecord` and `GridContextReader` are exported.
- **Breaking:** `createDataGrid({ defaults })` no longer accepts `context`. Move it to the factory's
  own `context` option. `DataGridOptionsProvider` still takes `context` in its `defaults`.

The merge is unchanged: factory < `DataGridOptionsProvider` < instance, instance wins, with nested
plain objects merged key by key. The docs used to say a named key was replaced, which was never what
the code did.

**A leftover `declare module` keeps compiling and silently stops typing anything.** Search for
`interface GridContext` and migrate each one:

```tsx
// before
declare module '@ez-kit/data-grid-react' {
	interface GridContext {
		permissions: { canEdit: boolean }
	}
}

// after, with a factory
export const { DataGrid, useDataGrid, useGridContext } = createDataGrid({
	components,
	context: { permissions: { canEdit: false } },
})

// after, without one
const useAppGridContext = useGridContext.withTypes<{ permissions: { canEdit: boolean } }>()
```
