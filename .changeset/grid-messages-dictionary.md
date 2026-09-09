---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Every user-facing string the grid renders now comes from one dictionary, and `messages` replaces
any part of it.

Before this there was no point at which a consumer could change a single word: the text was
hardcoded across the react package and both kits — visible labels, `placeholder`s, the operator
labels, and 23 `aria-label`s. A non-English app shipped a grid whose screen-reader text stayed in
another language than its UI, which is the half of the problem nobody sees until it matters.

```tsx
<DataGrid
	data={data}
	columns={columns}
	messages={{ pagination: { rowsPerPage: 'Строк на странице' } }}
/>
```

- `GridMessages` is nested by feature, the way the config is: `messages.pagination.*`,
  `messages.filtering.*`, `messages.operators.date.*`. `defaultMessages` is the English default and
  the only place a string is written.
- Overrides merge **per entry**, through the three existing option layers — set a locale once on
  `DataGridOptionsProvider`, override one string on a single grid.
- Entries whose text depends on the render take a typed context and return a string
  (`filtering.placeholder({ columnId })`, `selection.count({ count })`, `draft.sorts({ count })`),
  so a plural rule is `Intl.PluralRules` in your own function rather than something the grid
  guesses.
- Both kits read the dictionary through the new `useGridMessages()`, which falls back to
  `defaultMessages` outside a `<DataGrid>` rather than throwing.
- An ESLint rule fails the build on any new user-facing literal in the react package or either
  kit's `blocks/`, so the dictionary cannot quietly go stale.

Ships **English only** — no bundled locales while the key set is still settling.

**Breaking:**

- `buildPaginationLabel(label, model)` and `buildColumnMenuSections(header, capabilities)` take the
  relevant dictionary group as a final argument: `buildPaginationLabel(label, model, messages.pagination)`,
  `buildColumnMenuSections(header, capabilities, messages.columnMenu)`. Both are exported for kits
  that re-render the label or the menu themselves.
- `DATA_GRID_DEFAULTS.globalFiltering.placeholder` is gone — the default lives at
  `messages.globalFiltering.placeholder`, where it can be replaced. The `globalFiltering.placeholder`
  option is unchanged.
