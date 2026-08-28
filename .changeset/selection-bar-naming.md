---
'@ez-kit/data-grid-react': minor
---

**Breaking:** `selection.panel` → `selection.bar`, and one name for the action bar's render mode.

One concept had two nouns: the option was `panel` (`SelectionPanelConfig`, `SelectionPanelVariant`)
while the component, the compound member, the kit contract and the docs page were all `bar`
(`SelectionBar`, `DataGrid.SelectionBar`, `SelectionBarProps`). Searching for "panel" found
`FilterPanel`, which is something else entirely; searching for "bar" found no option.

- `selection.panel` → `selection.bar`
- `SelectionPanelConfig` → `SelectionBarConfig`, `SelectionPanelCallbackArgs` → `SelectionBarCallbackArgs`
- `SelectionPanelVariant` → `ActionBarVariant` — the selection section and the pending-draft
  section are one bar with two contents, and both already read this single value

`selection.bar` is now purely presentational (`variant`, `onClear`, `actions`). Its Delete button
is `deleting.bulk` — see the accompanying changeset.
