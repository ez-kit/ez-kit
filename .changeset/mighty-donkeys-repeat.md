---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Add custom per-row actions: `rowActions.actions`

Bulk actions were already extensible through `selection.panel.actions`, but the per-row actions
column was closed — a "Duplicate" or "Send invoice" could only be added by replacing `ActionsCell`
grid-wide (reimplementing edit / delete / pin from scratch) or by adding a second column of buttons,
leaving the row with two action groups. `rowActions.actions` closes that asymmetry:

```tsx
rowActions={{
	actions: ({ row }) => [
		{ id: 'duplicate', label: 'Duplicate', onSelect: () => duplicate(row.original) },
	],
}}
```

The callback runs per row, so a row's entries can depend on the row. Custom entries live in the
overflow menu under both variants — with `variant: 'menu'` there is only the one menu, and with
`variant: 'inline'` they join the menu that already carries the pin actions, so the column grows by
one trigger rather than one button per action. The actions column is now injected for a grid whose
only per-row action is a custom one.

**Breaking for UI kit authors:** `GridMenuItem.icon` changed from `GridMenuIcon` to
`GridMenuIcon | undefined`. The built-in glyph names describe grid affordances (edit / delete /
pin / sort / hide) and an application action such as "Duplicate" has no honest member of that set,
so an entry may now carry none and render label-only. `GridMenuIcon` itself is unchanged — the
closed set stays closed.

Any kit that indexes its icon map with `item.icon` stops compiling and needs a guard:

```diff
-{GRID_MENU_ICONS[item.icon]}
+{item.icon && GRID_MENU_ICONS[item.icon]}
```

Both first-party kits are already updated. Every entry the grid itself builds still sets `icon`
unconditionally, so only consumer-supplied row actions ever omit it — render an icon-less entry
with the glyph's space reserved so its label stays aligned with its siblings.
