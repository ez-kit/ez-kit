---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** `editing`, `creating`, `deleting` and `rowActions` join the `boolean | Config` row.

Every other feature on the grid config is `boolean | SomeConfig`. These four were object-only, so
a grid under a defaults layer that had configured them app-wide could not opt out: `editing: false`
was a compile error, and `rowActions` had no off switch at all — not `false`, not `enabled`, and
`deepMerge` will not drop an object that came from below.

```ts
createDataGrid({ defaults: { editing: { mode: 'modal' }, rowActions: { variant: 'menu' } } })
// this grid is read-only
useDataGrid({ data, columns, editing: false, rowActions: false })
```

`rowActions: false` suppresses the actions column outright, built-in edit / delete / pin
affordances included. `RowActionsConfig` also gains `FeatureToggle`, so `{ enabled: false }` works
where the settings must survive but the feature must not. `true` on the three write features means
"yes, this grid too" over a defaults layer; without a resolved handler the feature still resolves
away rather than mounting a trigger that would throw on commit.
