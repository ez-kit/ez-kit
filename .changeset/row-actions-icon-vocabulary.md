---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** a custom row action's `icon` is a named glyph or your own element, never a bare string.

`RowActionItem.icon` was `string` while the vocabulary the kits map is closed, so `icon: 'copy'`
compiled, ran, and rendered a label with no glyph and no error anywhere — the closed set lived in
the React package and the type a consumer writes against lived in core.

- `GridMenuIcon` and `isGridMenuIcon` move to `@ez-kit/data-grid-core` (still re-exported from the
  React package, so kit imports are unchanged). It is a semantic vocabulary, not a React value.
- `RowActionItem<TNode>` / `RowActionsConfig<TRow, TNode>` take the adapter's node type, the same
  parameter `ColumnRenderer` and `ExpandingConfig` take. React binds it to `ReactElement` via
  `ReactRowActionsConfig`, which `useDataGrid` uses.
- So `icon: 'delete'` autocompletes, `icon: <Copy />` works for an action the set has no honest
  name for, and `icon: 'copy'` is a compile error.

`GridMenuItem.icon` widens to `GridMenuIcon | ReactElement` to match; kits render it through the
new `renderGridMenuIcon` helper in their own `blocks/icons.tsx`.
