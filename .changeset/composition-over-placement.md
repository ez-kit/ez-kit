---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking: the grid's layout moves from config to JSX. Eight placement options are removed, and
`core.Layout` replaces the default layout.**

Where a control sits — and whether it is mounted at all — is now said by rendering it. These eight
options said it instead, and are gone:

| removed                   | write this instead                                                        |
| ------------------------- | ------------------------------------------------------------------------- |
| `filtering.chips`         | `<DataGrid.ActiveFiltersBar />` where you want the strip                  |
| `filtering.panel`         | `<DataGrid.FilterPanel />` where you want the panel                       |
| `filtering.toolbar`       | `<DataGrid.ClearFiltersButton alwaysShow />` — `alwaysShow` is now a prop |
| `filtering.variant`       | see below                                                                 |
| `globalFiltering.toolbar` | `<DataGrid.Toolbar start={<DataGrid.GlobalFilterInput />} />`             |
| `pagination.pageSizer`    | `<DataGrid.PageSizer />` where you want it, or `<DataGrid.BottomBar />`   |
| `sorting.toolbar`         | `<DataGrid.SortMenuTrigger />`                                            |
| `visibility.toolbar`      | `<DataGrid.VisibilityTrigger />`                                          |

Gone with them: `FilteringVariant`, `FilterPanelPlacement`, `GlobalFilterPlacement`,
`PageSizerPlacement`, the object forms `FilterChipsConfig` / `FilteringToolbarConfig` /
`FilterPanelConfig` / `GlobalFilterToolbarConfig` / `PageSizerConfig`, the wrappers
`ReactSortingConfig` / `ReactVisibilityConfig` (their only field was `toolbar`, so `sorting` and
`visibility` now resolve through core's own config), and six `Normalized*` shapes.
`FilterChipsPosition` **stays** — it is now the closed set for `<DataGrid.ActiveFiltersBar position>`,
which both kits style off `data-chip-position`.

They were never statements about the grid: they were arguments to the default toolbar and layout
that had leaked into the table's config, and the controls proved it — `VisibilityTrigger`,
`SortMenuTrigger` and `GlobalFilterInput` never read one. What made it worth a break is the rate of
growth: every new arrangement cost a new enum value, and the arrangement the last one bought is a
line of JSX. `<DataGrid.Toolbar>` is now a pure container that reads no config.

**`filtering.variant` dissolves into `<DataGrid.HeaderCell>`.** It was one enum on two axes —
`'panel'` answered "is there a filter in the header", `'inline'` / `'popover'` answered "what does it
look like" — which is why filters in the header **and** in a panel was inexpressible. The render
function now hands back `filterPopover` beside `filter`: not rendering `filter` takes it out of the
header, rendering `filterPopover` gives the popover, and rendering `filter` while
`<DataGrid.FilterPanel />` is mounted gives both, driving one `columnFilters` value.

**`core.Layout` is a new optional component slot.** The grid's body resolves as
`children ?? core.Layout ?? <DataGrid.Table />`, so register a layout once on the provider and every
grid below it gets that shell; pass `children` to override one grid. It sits in the optional tier
beside `TableWrapper` / `TableScroll`, so an external kit that wrote `satisfies FullGridComponents`
keeps compiling.

Four presets ship from `@ez-kit/data-grid-react`, as pure composition with no authored class:
`DefaultLayout` (toolbar / table / pagination), `BottomBarLayout` (page sizer beside the page
controls), `SearchFiltersActionsLayout` (search leading, filters, actions trailing) and
`PopoverFiltersLayout`. **Both kits bind `DefaultLayout` in their prebuilt `DataGrid`**, so
`<DataGrid data columns features />` from a kit is unchanged. A grid composed through
`createDataGrid` registers its own.

**The two action bars are placed by the layout that renders them, and by nothing else.** All four
presets write `<DataGrid.DraftBar />` and `<DataGrid.SelectionBar />` last, which is where the
default `floating` bar belongs — it overlays the rows, and document order keeps it out of the tab
order until there is something to act on. `selection.bar.variant` still says what the bar _looks
like_, an in-flow strip against an overlay, and no longer says where it goes: a grid that sets
`inline` writes its own layout with the two bars above `<DataGrid.Table />`. That last bit is the
one arrangement the presets no longer cover for you, and it is the point — a config value deciding
an element's position is the thing this release removes, and the bars were the last of them.

**One behaviour is not preserved.** `DefaultLayout` mounts no page sizer. The old default mounted one
when the author _wrote_ `pagination.items`, and the resolved `items` falls back to a default list
under any paged pagination — so a preset gating on it would mount a selector on every paginated grid
rather than restoring the old rule. Write `<DataGrid.Toolbar start={<DataGrid.PageSizer />} />`, or
use `BottomBarLayout`. `pagination.items` now documents that it permits page sizes and mounts
nothing.

This is not a bundle-size change. The removed flags cost zero bytes — the toolbar imported its
controls unconditionally — and `@ez-kit/data-grid-react`'s main entry does not tree-shake today
regardless, because the compound namespace is assembled with 29 impure top-level assignments. That
is a separate fix; `core.Layout` and the presets are what will let it pay off.
