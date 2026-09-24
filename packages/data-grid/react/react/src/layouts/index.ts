/**
 * Ready-made layouts for `core.Layout` — pure composition, no authored class name, so the
 * package's no-styles rule is untouched and one set serves every kit.
 *
 * Each is a plain component taking no props that reads the grid from `useDataGridTable()`, so
 * a kit binds one by name (`components: { core: { Layout: DefaultLayout } }`) and an
 * application replaces it with a component of its own the same way.
 *
 * Between them they cover what the removed placement options could express — which is the
 * argument for removing them: an arrangement that used to cost an enum value now costs a few
 * lines of JSX, and an arrangement none of the enums could name (filters in the header *and*
 * in a panel) costs the same.
 */
export { DefaultLayout } from './default-layout'
export { BottomBarLayout } from './bottom-bar-layout'
export { FilterPanelLayout } from './filter-panel-layout'
export { PopoverFiltersLayout } from './popover-filters-layout'
