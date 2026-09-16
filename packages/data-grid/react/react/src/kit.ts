'use client'

/**
 * What a UI kit's components call at runtime — the counterpart to `./contract`, which is what a
 * UI kit implements.
 *
 * Its own build entry, and the reason is measured. Nearly every block in both kits imports
 * `useGridMessages` from the package root, a few also `PAGE_GAP`, `ActionBarVariant` or
 * `isGridMenuItemSlot`. The root is one pre-bundled file that a bundler shakes nothing out of,
 * so each of those one-line imports anchored all ~187 kB of it: a kit's `textCellType` alone
 * bundled to 200 kB before this entry existed, which made splitting the kits into per-feature
 * entries buy almost nothing.
 *
 * The hooks here are deliberately the context-reading ones a block can call on its own. Nothing
 * that builds or owns a grid belongs here — that is the root's job, and pulling it in would put
 * the anchor back.
 *
 * Everything stays exported from the root too, so this entry is an option rather than a migration.
 */

export { useGridMessages } from './use-grid-messages'
export { useGridOptions } from './use-grid-options'
export { useGridComponents } from './components-context'
export { useDataGridState, useDataGridTable } from './data-grid/table-context'

// Menu model — the kits' `Menu` and every block that contributes an item read these.
// `isGridMenuIcon` sits here beside `GridMenuIcon` on purpose: both kits' `icons.tsx` imports the
// pair, and leaving one of them off would have kept that file importing from the root, which is
// the whole ~187 kB. A binding missing from this entry is not a smaller cost, it is the full one.
export { GridMenuIcon, GridMenuVariant, isGridMenuIcon, isGridMenuItemSlot, toMenuSections } from './menu'

// Closed sets a block names when it renders a variant, a state or a direction. Each is an inert
// `const` object, so the set is cheap to carry and expensive to omit — see the note above.
export { ActionBarVariant, ActionsCellState, ColumnSortDirection, LoadMoreTrigger, SortDirection } from './types'

// Cell-type vocabulary a kit's own cell renderers name. From `@ez-kit/data-grid-core`, which
// reaches the kits only through this package — and, before this entry, only through its root.
export { LINK_HREF_VALUE_TOKEN, LinkTarget } from '@ez-kit/data-grid-core'

// Pure helpers: content and structure the kits render but must not re-derive.
export { buildPageWindow, PAGE_GAP, DEFAULT_PAGE_SIBLINGS, DEFAULT_PAGE_BOUNDARIES } from './data-grid/page-window'
export { buildPaginationLabel } from './data-grid/pagination-label'
export { buildMultiSelectLabel } from './data-grid/multi-select-label'
export { buildColumnMenuSections, ColumnActionId } from './data-grid/column-menu-sections'
export { useBetweenValue, BetweenBranch } from './data-grid/use-between-value'
export { useInfiniteScroll } from './data-grid/use-infinite-scroll'

// Layout helpers a kit's table primitives need to place cells correctly.
export { getCommonPinStyles } from './utils/pin-styles'
export { getColumnSizeVars } from './utils/column-size-vars'
export { getVisualLeafColumns } from './utils/visual-column-order'
