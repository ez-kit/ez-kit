'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { cellTypes } from './blocks/cell-types'
import { Checkbox } from './blocks/core/Checkbox'
import { Menu } from './blocks/core/Menu'
import { Td } from './blocks/core/Td'
import { Tfoot } from './blocks/core/Tfoot'
import { Toolbar } from './blocks/core/Toolbar'
import { DraftBar } from './blocks/draft/DraftBar'
import { ConfirmDialog } from './blocks/editing/ConfirmDialog'
import { FormShell } from './blocks/editing/FormShell'
import { Modal } from './blocks/editing/Modal'
import { NumberInput } from './blocks/editing/NumberInput'
import { Chevron } from './blocks/expanding/Chevron'
import { EmptyState } from './blocks/fallbacks/EmptyState'
import { LoadingRow } from './blocks/fallbacks/LoadingRow'
import { NoResultsState } from './blocks/fallbacks/NoResultsState'
import { RefetchOverlay } from './blocks/fallbacks/RefetchOverlay'
import { BetweenInput } from './blocks/filtering/BetweenInput'
import { ClearFiltersButton } from './blocks/filtering/ClearFiltersButton'
import { FilterChip } from './blocks/filtering/FilterChip'
import { FilterPanel } from './blocks/filtering/FilterPanel'
import { FilterPanelChip } from './blocks/filtering/FilterPanelChip'
import { FilterPopover } from './blocks/filtering/FilterPopover'
import { GlobalFilterInput } from './blocks/filtering/GlobalFilterInput'
import { MultiSelectFilter } from './blocks/filtering/MultiSelectFilter'
import { OperatorSelect } from './blocks/filtering/OperatorSelect'
import { LoadMoreRow } from './blocks/infinite/LoadMoreRow'
import { PageSizer } from './blocks/pagination/PageSizer'
import { Pagination } from './blocks/pagination/PaginationBar'
import { Resizer } from './blocks/resizing/Resizer'
import { ActionsCell } from './blocks/row-actions/ActionsCell'
import { SelectionBar } from './blocks/selection/SelectionBar'
import { SortIndicator } from './blocks/sorting/SortIndicator'
import { SortMenu } from './blocks/sorting/SortMenu'
import { VisibilityMenu } from './blocks/visibility/VisibilityMenu'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Table, TableBody, TableHead, TableHeader, TableRow } from './components/ui/table'

import type { KitCellTypes } from './blocks/cell-types'
import type { DataGridBundle, FullGridComponents } from '@ez-kit/data-grid-react'

const components = {
	core: {
		Table,
		Thead: TableHeader,
		Tbody: TableBody,
		Tfoot,
		Tr: TableRow,
		Th: TableHead,
		Td,
		Button,
		Input,
		Checkbox,
		Toolbar,
		Menu,
		NumberInput,
	},
	pagination: { Pagination, PageSizer },
	sorting: { SortIndicator, SortMenu },
	filtering: {
		FilterPopover,
		FilterPanel,
		FilterPanelChip,
		FilterChip,
		ClearFiltersButton,
		GlobalFilterInput,
		OperatorSelect,
		BetweenInput,
		MultiSelectFilter,
	},
	editing: { Modal, FormShell },
	deleting: { ConfirmDialog },
	selection: { SelectionBar },
	draft: { DraftBar },
	rowActions: { ActionsCell },
	resizing: { Resizer },
	visibility: { VisibilityMenu },
	fallbacks: { LoadingRow, EmptyState, NoResultsState, RefetchOverlay },
	infinite: { LoadMoreRow },
	expanding: { Chevron },
} satisfies FullGridComponents

/**
 * `extendDataGrid` re-invokes the factory with the same shadcn components while
 * merging in additional custom cell types (return typed to the merged keys).
 *
 * @example
 * const { DataGrid, createColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
// Annotated, not inferred. The declaration emitter prints an *inferred* type structurally, so
// without this the bundled `.d.ts` re-printed all nine registry entries into every signature that
// mentions them — and a `CellDef` union built over that blob is large enough that TypeScript
// stops contextually typing `cell.component` and hands its parameter back as an implicit `any`.
// Naming the bundle's type keeps the registry a *name* in the emitted signatures.
const bundle: DataGridBundle<KitCellTypes> = createDataGrid<KitCellTypes>({
	components,
	cellTypes,
})

const { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid } = bundle

// Annotated one by one rather than destructured: a destructured binding is re-inferred by the
// declaration emitter, which prints the registry structurally again. Indexing the bundle's type
// keeps `KitCellTypes` a name in the two signatures that carry a `CellDef` union.
const createColumns: DataGridBundle<KitCellTypes>['createColumns'] = bundle.createColumns
const createColumnHelper: DataGridBundle<KitCellTypes>['createColumnHelper'] = bundle.createColumnHelper

// `cellTypes` / `KitCellTypes` are re-exported here (not just consumed internally by
// `createDataGrid` above) because this file is the registry consumer's actual entry point —
// `index.ts` (which re-exported them, plus `@ez-kit/data-grid-react`'s whole surface) is excluded
// from the shadcn registry payload, see `registry.config.mjs`'s `excludeTopLevel`.
export { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid, createColumns, createColumnHelper, cellTypes }
export type { KitCellTypes }
