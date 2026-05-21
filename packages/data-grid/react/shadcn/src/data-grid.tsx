'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { ActionsCell } from './blocks/ActionsCell'
import { BetweenInput } from './blocks/BetweenInput'
import { cellTypes } from './blocks/cell-types'
import { Checkbox } from './blocks/Checkbox'
import { Chevron } from './blocks/Chevron'
import { ClearFiltersButton } from './blocks/ClearFiltersButton'
import { ColumnMenu } from './blocks/ColumnMenu'
import { ColumnVisibilityMenu } from './blocks/ColumnVisibilityMenu'
import { ConfirmDialog } from './blocks/ConfirmDialog'
import { CreatingActionsCell } from './blocks/CreatingActionsCell'
import { EmptyState } from './blocks/EmptyState'
import { FilterChip } from './blocks/FilterChip'
import { FilterPanel } from './blocks/FilterPanel'
import { FilterPanelChip } from './blocks/FilterPanelChip'
import { FilterPopover } from './blocks/FilterPopover'
import { FormShell } from './blocks/FormShell'
import { GlobalFilterInput } from './blocks/GlobalFilterInput'
import { LoadingRow } from './blocks/LoadingRow'
import { Modal } from './blocks/Modal'
import { MultiSelectFilter } from './blocks/MultiSelectFilter'
import { NoResultsState } from './blocks/NoResultsState'
import { NumberInput } from './blocks/NumberInput'
import { OperatorSelect } from './blocks/OperatorSelect'
import { PageSizer } from './blocks/PageSizer'
import { Pagination } from './blocks/pagination'
import { Resizer } from './blocks/Resizer'
import { RowPinMenu } from './blocks/RowPinMenu'
import { SelectionBar } from './blocks/SelectionBar'
import { SortIndicator } from './blocks/SortIndicator'
import { SortMenu } from './blocks/SortMenu'
import { Td } from './blocks/Td'
import { Toolbar } from './blocks/Toolbar'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Table, TableBody, TableHead, TableHeader, TableRow } from './components/ui/table'

import type { CellTypeRegistry, GridComponents } from '@ez-kit/data-grid-react'

const components = {
	Table,
	Thead: TableHeader,
	Tbody: TableBody,
	Tr: TableRow,
	Th: TableHead,
	Td,
	Button,
	Input,
	Checkbox,
	NumberInput,
	Modal,
	Pagination,
	PageSizer,
	Toolbar,
	Resizer,
	SortIndicator,
	SortMenu,
	RowPinMenu,
	ColumnMenu,
	ColumnVisibilityMenu,
	FilterPopover,
	FilterPanel,
	FilterPanelChip,
	FilterChip,
	ClearFiltersButton,
	GlobalFilterInput,
	SelectionBar,
	ConfirmDialog,
	OperatorSelect,
	BetweenInput,
	MultiSelectFilter,
	LoadingRow,
	EmptyState,
	NoResultsState,
	ActionsCell,
	CreatingActionsCell,
	FormShell,
	Chevron,
} satisfies GridComponents

const { DataGrid, GridComponentsProvider, useDataGrid } = createDataGrid({
	components,
	cellTypes,
})

/**
 * Extend the DataGrid with additional custom cell types.
 * Returns a fully typed `{ DataGrid, useDataGrid, GridComponentsProvider, defineColumns }` bundle.
 *
 * @example
 * const { DataGrid, defineColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
export function extendDataGrid<TExtra extends CellTypeRegistry>(extraCellTypes: TExtra) {
	return createDataGrid({
		components,
		cellTypes: { ...cellTypes, ...extraCellTypes },
	})
}

export { DataGrid, GridComponentsProvider, useDataGrid }
