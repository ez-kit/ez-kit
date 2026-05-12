'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { ActionsCell } from './blocks/ActionsCell'
import { BetweenInput } from './blocks/BetweenInput'
import { Checkbox } from './blocks/Checkbox'
import { Chevron } from './blocks/Chevron'
import { ColumnMenu } from './blocks/ColumnMenu'
import { ColumnVisibilityMenu } from './blocks/ColumnVisibilityMenu'
import { ConfirmDialog } from './blocks/ConfirmDialog'
import { CreatingActionsCell } from './blocks/CreatingActionsCell'
import { DateField } from './blocks/DateField'
import { EmptyState } from './blocks/EmptyState'
import { FilterPopover } from './blocks/FilterPopover'
import { FormShell } from './blocks/FormShell'
import { LoadingRow } from './blocks/LoadingRow'
import { Modal } from './blocks/Modal'
import { NoResultsState } from './blocks/NoResultsState'
import { NumberInput } from './blocks/NumberInput'
import { OperatorSelect } from './blocks/OperatorSelect'
import { PageSizer } from './blocks/PageSizer'
import { Pagination } from './blocks/pagination'
import { Resizer } from './blocks/Resizer'
import { RowPinMenu } from './blocks/RowPinMenu'
import { SelectionBar } from './blocks/SelectionBar'
import { SHADCN_CELL_TYPES } from './blocks/shadcn-cell-types'
import { SortIndicator } from './blocks/SortIndicator'
import { SortMenu } from './blocks/SortMenu'
import { Toolbar } from './blocks/Toolbar'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table'

import type { CellTypeRegistry } from '@ez-kit/data-grid-react'

const SHADCN_COMPONENTS = {
	Table,
	Thead: TableHeader,
	Tbody: TableBody,
	Tr: TableRow,
	Th: TableHead,
	Td: TableCell,
	Button,
	Input,
	Checkbox,
	NumberInput,
	DateField,
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
	SelectionBar,
	ConfirmDialog,
	OperatorSelect,
	BetweenInput,
	LoadingRow,
	EmptyState,
	NoResultsState,
	ActionsCell,
	CreatingActionsCell,
	FormShell,
	Chevron,
}

const { DataGrid, GridComponentsProvider, useDataGrid } = createDataGrid({
	components: SHADCN_COMPONENTS,
	cellTypes: SHADCN_CELL_TYPES,
})

/**
 * Extend the shadcn DataGrid with additional custom cell types.
 * Returns a fully typed `{ DataGrid, useDataGrid, GridComponentsProvider, defineColumns }` bundle.
 *
 * @example
 * const { DataGrid, defineColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
export function extendDataGrid<TExtra extends CellTypeRegistry>(extraCellTypes: TExtra) {
	return createDataGrid({
		components: SHADCN_COMPONENTS,
		cellTypes: { ...SHADCN_CELL_TYPES, ...extraCellTypes },
	})
}

export { DataGrid, GridComponentsProvider, useDataGrid }
