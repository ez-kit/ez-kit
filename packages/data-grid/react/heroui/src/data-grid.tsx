'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { cellTypes } from './blocks/cell-types'
import { ColumnVisibilityMenu } from './blocks/column-visibility/ColumnVisibilityMenu'
import { Button } from './blocks/core/Button'
import { Checkbox } from './blocks/core/Checkbox'
import { Input } from './blocks/core/Input'
import { Menu } from './blocks/core/Menu'
import { Table, Tbody, Td, Th, Thead, Tr } from './blocks/core/table-adapters'
import { Toolbar } from './blocks/core/Toolbar'
import { DraftBar } from './blocks/draft/DraftBar'
import { ConfirmDialog } from './blocks/editing/ConfirmDialog'
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
import { Pagination } from './blocks/pagination/Pagination'
import { Resizer } from './blocks/resizing/Resizer'
import { ActionsCell } from './blocks/row-actions/ActionsCell'
import { SelectionBar } from './blocks/selection/SelectionBar'
import { SortIndicator } from './blocks/sorting/SortIndicator'
import { SortMenu } from './blocks/sorting/SortMenu'

import type { FullGridComponents } from '@ez-kit/data-grid-react'

const components = {
	core: { Table, Thead, Tbody, Tr, Th, Td, Button, Input, Checkbox, Toolbar, Menu },
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
	editing: { Modal, FormShell, ConfirmDialog, NumberInput },
	selection: { SelectionBar },
	draft: { DraftBar },
	'row-actions': { ActionsCell },
	resizing: { Resizer },
	'column-visibility': { ColumnVisibilityMenu },
	'fallback-states': { LoadingRow, EmptyState, NoResultsState, RefetchOverlay },
	infinite: { LoadMoreRow },
	expanding: { Chevron },
} satisfies FullGridComponents

/**
 * `extendDataGrid` re-invokes the factory with the same HeroUI components while
 * merging in additional custom cell types (return typed to the merged keys).
 *
 * @example
 * const { DataGrid, createColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
const { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid, createColumns, createColumnHelper } =
	createDataGrid({
		components,
		cellTypes,
	})

export { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid, createColumns, createColumnHelper }
