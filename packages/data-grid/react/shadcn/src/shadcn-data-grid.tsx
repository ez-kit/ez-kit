'use client'

import { CellTypesProvider, createDataGrid } from '@ez-kit/data-grid-react'

import { Checkbox } from './blocks/Checkbox'
import { ColumnMenu } from './blocks/ColumnMenu'
import { DateField } from './blocks/DateField'
import { NumberInput } from './blocks/NumberInput'
import { PageSizer } from './blocks/PageSizer'
import { Pagination } from './blocks/pagination'
import { Resizer } from './blocks/Resizer'
import { RowPinMenu } from './blocks/RowPinMenu'
import { SelectionBar } from './blocks/SelectionBar'
import { SHADCN_CELL_TYPES } from './blocks/shadcn-cell-types'
import { Toolbar } from './blocks/Toolbar'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table'

import type { DataGridProps } from '@ez-kit/data-grid-react'

const {
	DataGrid: BaseDataGrid,
	GridComponentsProvider,
	useDataGrid,
} = createDataGrid({
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
	Pagination,
	PageSizer,
	Toolbar,
	Resizer,
	RowPinMenu,
	ColumnMenu,
	SelectionBar,
})

function DataGrid<TRow extends object>(props: DataGridProps<TRow>) {
	return (
		<CellTypesProvider types={SHADCN_CELL_TYPES}>
			<BaseDataGrid {...props} />
		</CellTypesProvider>
	)
}

export { DataGrid, GridComponentsProvider, useDataGrid }
