import { createDataGrid } from '@ez-kit/data-grid-react'

import { Checkbox } from './blocks/Checkbox'
import { DateField } from './blocks/DateField'
import { NumberInput } from './blocks/NumberInput'
import { PageSizer } from './blocks/PageSizer'
import { Pagination } from './blocks/pagination'
import { Resizer } from './blocks/Resizer'
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
	NumberInput: NumberInput,
	DateField: DateField,
	Pagination: Pagination,
	PageSizer: PageSizer,
	Toolbar: Toolbar,
	// data-grid specific
	Resizer: Resizer,
})

export { Resizer } from './blocks/Resizer'
