'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { cellTypes } from './blocks/cell-types'
import { ColumnVisibilityMenu } from './blocks/column-visibility/ColumnVisibilityMenu'
import { Checkbox } from './blocks/core/Checkbox'
import { Td } from './blocks/core/Td'
import { Toolbar } from './blocks/core/Toolbar'
import { ConfirmDialog } from './blocks/editing/ConfirmDialog'
import { CreatingActionsCell } from './blocks/editing/CreatingActionsCell'
import { FormShell } from './blocks/editing/FormShell'
import { Modal } from './blocks/editing/Modal'
import { NumberInput } from './blocks/editing/NumberInput'
import { Chevron } from './blocks/expanding/Chevron'
import { EmptyState } from './blocks/fallback-states/EmptyState'
import { LoadingRow } from './blocks/fallback-states/LoadingRow'
import { NoResultsState } from './blocks/fallback-states/NoResultsState'
import { RefetchOverlay } from './blocks/fallback-states/RefetchOverlay'
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
import { Pagination } from './blocks/pagination/pagination'
import { Resizer } from './blocks/resizing/Resizer'
import { ActionsCell } from './blocks/row-actions/ActionsCell'
import { RowActionsMenu } from './blocks/row-actions/RowActionsMenu'
import { SelectionBar } from './blocks/selection/SelectionBar'
import { ColumnMenu } from './blocks/sorting/ColumnMenu'
import { SortIndicator } from './blocks/sorting/SortIndicator'
import { SortMenu } from './blocks/sorting/SortMenu'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Table, TableBody, TableHead, TableHeader, TableRow } from './components/ui/table'

import type { FullGridComponents } from '@ez-kit/data-grid-react'

const components = {
	core: {
		Table,
		Thead: TableHeader,
		Tbody: TableBody,
		Tr: TableRow,
		Th: TableHead,
		Td,
		Button,
		Input,
		Checkbox,
		Toolbar,
	},
	pagination: { Pagination, PageSizer },
	sorting: { SortIndicator, SortMenu, ColumnMenu },
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
	editing: { Modal, FormShell, CreatingActionsCell, ConfirmDialog, NumberInput },
	selection: { SelectionBar },
	'row-actions': { ActionsCell, RowActionsMenu },
	resizing: { Resizer },
	'column-visibility': { ColumnVisibilityMenu },
	'fallback-states': { LoadingRow, EmptyState, NoResultsState, RefetchOverlay },
	infinite: { LoadMoreRow },
	expanding: { Chevron },
} satisfies FullGridComponents

/**
 * `extendDataGrid` re-invokes the factory with the same shadcn components while
 * merging in additional custom cell types (return typed to the merged keys).
 *
 * @example
 * const { DataGrid, defineColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
const { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid } = createDataGrid({
	components,
	cellTypes,
})

export { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid }
