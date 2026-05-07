'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'

import { ActionsCell } from './blocks/ActionsCell'
import { BetweenInput } from './blocks/BetweenInput'
import { Chevron } from './blocks/Chevron'
import { CreatingActionsCell } from './blocks/CreatingActionsCell'
import { Button } from './blocks/Button'
import { EmptyState } from './blocks/EmptyState'
import { LoadingRow } from './blocks/LoadingRow'
import { NoResultsState } from './blocks/NoResultsState'
import { Checkbox } from './blocks/Checkbox'
import { ColumnMenu } from './blocks/ColumnMenu'
import { ColumnVisibilityMenu } from './blocks/ColumnVisibilityMenu'
import { ConfirmDialog } from './blocks/ConfirmDialog'
import { DateField } from './blocks/DateField'
import { FilterPopover } from './blocks/FilterPopover'
import { HEROUI_CELL_TYPES } from './blocks/heroui-cell-types'
import { Input } from './blocks/Input'
import { Modal } from './blocks/Modal'
import { NumberInput } from './blocks/NumberInput'
import { OperatorSelect } from './blocks/OperatorSelect'
import { PageSizer } from './blocks/PageSizer'
import { Pagination } from './blocks/Pagination'
import { Resizer } from './blocks/Resizer'
import { SortIndicator } from './blocks/SortIndicator'
import { SortMenu } from './blocks/SortMenu'
import { RowPinMenu } from './blocks/RowPinMenu'
import { SelectionBar } from './blocks/SelectionBar'
import { Table, Tbody, Td, Th, Thead, Tr } from './blocks/table-adapters'
import { Toolbar } from './blocks/Toolbar'

import type { CellTypeRegistry } from '@ez-kit/data-grid-react'

const HEROUI_COMPONENTS = {
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
	Td,
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
	Chevron,
	CreatingActionsCell,
}

const { DataGrid, GridComponentsProvider, useDataGrid } = createDataGrid({
	components: HEROUI_COMPONENTS,
	cellTypes: HEROUI_CELL_TYPES,
})

/**
 * Extend the heroui DataGrid with additional custom cell types.
 * Returns a fully typed `{ DataGrid, useDataGrid, GridComponentsProvider, defineColumns }` bundle.
 *
 * @example
 * const { DataGrid, defineColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
export function extendDataGrid<TExtra extends CellTypeRegistry>(extraCellTypes: TExtra) {
	return createDataGrid({
		components: HEROUI_COMPONENTS,
		cellTypes: { ...HEROUI_CELL_TYPES, ...extraCellTypes },
	})
}

export { DataGrid, GridComponentsProvider, useDataGrid }
