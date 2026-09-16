import { Button } from '@grid-shadcn/components/ui/button'
import { Input } from '@grid-shadcn/components/ui/input'
import { Table, TableBody, TableHeader, TableRow } from '@grid-shadcn/components/ui/table'

import { NumberInput } from '../editing/NumberInput'

import { Checkbox } from './Checkbox'
import { Menu } from './Menu'
import { Modal } from './Modal'
import { Td } from './Td'
import { Tfoot } from './Tfoot'
import { Th } from './Th'
import { Toolbar } from './Toolbar'

import type { GridCoreComponents } from '@ez-kit/data-grid-react'

/**
 * The `core` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
export const coreComponents: GridCoreComponents = {
	Table,
	Thead: TableHeader,
	Tbody: TableBody,
	Tfoot,
	Tr: TableRow,
	Th,
	Td,
	Button,
	Input,
	Checkbox,
	Toolbar,
	Menu,
	NumberInput,
	Modal,
}
