import { createDataGrid } from '@ez-kit/data-grid-react'

import { Checkbox } from './blocks/Checkbox'
import { Pagination } from './blocks/pagination'
import { Toolbar } from './blocks/Toolbar'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table'

export const { DataGrid, GridComponentsProvider, useDataGrid } = createDataGrid({
	// layout
	Table: Table,
	Thead: TableHeader,
	Tbody: TableBody,
	Tr: TableRow,
	Th: TableHead,
	Td: TableCell,
	// primitives
	Button: Button,
	Input: Input,
	Checkbox: Checkbox,
	Pagination: Pagination,
	Toolbar: Toolbar,
})
