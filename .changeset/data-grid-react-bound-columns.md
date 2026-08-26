---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/data-grid-native': minor
---

Type-check what a column's renderers return.

`header`, `footer`, `cell.component`, `filtering.component`, `editing.component` and
`creating.component` all returned `unknown`. That is the honest type in core, which is
framework-agnostic and never calls them — but it reached React unchanged, so a renderer could
return anything at all, JSX inside one was unchecked, and there was no autocomplete.

`ColumnDef` (and `CellDef`, `ColumnFilteringConfig`, `ColumnEditingConfig`,
`ColumnCreatingConfig`, `createColumns`, `createColumnHelper`) take a `TNode` parameter,
defaulted to `unknown`. `@ez-kit/data-grid-react` re-exports `ColumnDef` / `CellDef` /
`ColumnHelper` / `createColumns` / `createColumnHelper` with `TNode` bound to `ReactNode`, and
every kit inherits that through its bound factory. This is the same technique `ExpandingConfig`
already used for `renderExpanded`, and for the same reason: a hand-written React twin of the
column def could only ever drift out of sync with core.

The slot type is `ColumnRenderer<TProps, TNode>` — a function returning `TNode`, **or** an
`ExoticComponentLike` (`{ $$typeof: symbol }`), which is what `memo(...)` and `forwardRef(...)`
produce. They already worked at runtime; now they typecheck too.

Nothing to migrate: a renderer returning `ReactNode` still satisfies core's `unknown`, so React
columns stay assignable to `TableConfig['columns']`. A renderer that was returning something
which is _not_ a valid `ReactNode` becomes a compile error — which is the point.
