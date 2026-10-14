---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking: the layout presets no longer mount `SortMenuTrigger` or `ClearFiltersButton`.**

A preset now mounts a feature's control only when the grid has no other way into — or back out of —
that feature. Search, the column-visibility toggle and "+ Add" stay. The sort builder goes, because
sorting already has the header click, and Clear-filters goes, because every filter clears in its own
input. `sorting: true` again means click-to-sort and nothing more.

This restores the defaults from before 0.9.0, where `sorting.toolbar` and `filtering.toolbar` were
opt-in. Moving placement into JSX gated every preset control on "the feature is on", which turned
both on by accident. `DefaultLayout`, `BottomBarLayout`, `FilterPanelLayout` and
`PopoverFiltersLayout` all change, and so does every kit's prebuilt `DataGrid`, which binds
`DefaultLayout`.

To keep either control, write it into a layout of your own:

```tsx
<DataGrid.Toolbar
	end={
		<>
			<DataGrid.ClearFiltersButton />
			<DataGrid.SortMenuTrigger />
			<DataGrid.VisibilityTrigger />
		</>
	}
/>
```
