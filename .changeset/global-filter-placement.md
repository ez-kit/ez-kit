---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**`globalFiltering.toolbar` now says which end of the toolbar holds the search box.**

`true` / omitted still mounts it at the trailing end, beside the sort and column-visibility
triggers. `'start'` moves it to the leading end, **before** the panel variant's filter chips — the
search-then-filters order most issue trackers use, and the one layout the option set could not
produce without composing the whole toolbar by hand:

```tsx
globalFiltering={{ placeholder: 'Search titles…', toolbar: 'start' }}
filtering={{ variant: 'panel', panel: 'toolbar', faceted: true }}
```

Scalar-or-object, like `pagination.pageSizer` and `filtering.panel`: the scalar **is** the
placement, `{ placement: 'start' }` spells it out, `false` still mounts nothing. Logical
`start` / `end` rather than `left` / `right`, because the toolbar's two slots swap sides under RTL.

The option stays named `toolbar` rather than being renamed for the control it mounts, unlike
`pagination.pageSizer`: the search box still has exactly one home, and these values name the two
ends of it, not a second container.

**Breaking for a kit reading the resolved options:** `grid.globalFiltering.toolbar` is now
`{ placement } | undefined` instead of `boolean` — the shape `pagination.pageSizer` and
`filtering.toolbar` already had. `Boolean(grid.globalFiltering?.toolbar)` keeps answering the
question it used to.
