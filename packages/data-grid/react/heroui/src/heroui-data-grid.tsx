'use client'

import { CellTypesProvider, createDataGrid } from '@ez-kit/data-grid-react'

import { BetweenInput } from './blocks/BetweenInput'
import { Button } from './blocks/Button'
import { Checkbox } from './blocks/Checkbox'
import { ColumnMenu } from './blocks/ColumnMenu'
import { ColumnVisibilityMenu } from './blocks/ColumnVisibilityMenu'
import { ConfirmDialog } from './blocks/ConfirmDialog'
import { DateField } from './blocks/DateField'
import { FilterPopover } from './blocks/FilterPopover'
import { HEROUI_CELL_TYPES } from './blocks/heroui-cell-types'
import { Input } from './blocks/Input'
import { NumberInput } from './blocks/NumberInput'
import { OperatorSelect } from './blocks/OperatorSelect'
import { PageSizer } from './blocks/PageSizer'
import { Pagination } from './blocks/Pagination'
import { Resizer } from './blocks/Resizer'
import { RowPinMenu } from './blocks/RowPinMenu'
import { SelectionBar } from './blocks/SelectionBar'
import { Table, Tbody, Td, Th, Thead, Tr } from './blocks/table-adapters'
import { Toolbar } from './blocks/Toolbar'

import type { DataGridProps } from '@ez-kit/data-grid-react'

const {
	DataGrid: BaseDataGrid,
	GridComponentsProvider,
	useDataGrid,
} = createDataGrid({
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
	Pagination,
	PageSizer,
	Toolbar,
	Resizer,
	RowPinMenu,
	ColumnMenu,
	ColumnVisibilityMenu,
	FilterPopover,
	SelectionBar,
	ConfirmDialog,
	OperatorSelect,
	BetweenInput,
})

function DataGrid<TRow extends object>(props: DataGridProps<TRow>) {
	return (
		<CellTypesProvider types={HEROUI_CELL_TYPES}>
			<BaseDataGrid {...props} />
		</CellTypesProvider>
	)
}

export { DataGrid, GridComponentsProvider, useDataGrid }
