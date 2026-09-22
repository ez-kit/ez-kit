import { Button } from '@grid-shadcn/components/ui/button'
import { Input } from '@grid-shadcn/components/ui/input'
import { Table, TableBody, TableHeader, TableRow } from '@grid-shadcn/components/ui/table'

import { ActionBar } from '../action-bar/ActionBar'
import { NumberInput } from '../editing/NumberInput'

import { Checkbox } from './Checkbox'
import { Menu } from './Menu'
import { Modal } from './Modal'
import { Root } from './Root'
import { Td } from './Td'
import { Tfoot } from './Tfoot'
import { Th } from './Th'
import { Toolbar } from './Toolbar'
import { Tooltip } from './Tooltip'

import type { FullGridComponents } from '@ez-kit/data-grid-react'

/**
 * The `core` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
// Annotated as `FullGridComponents['core']` rather than `GridCoreComponents`: `Root` is an
// *optional*-tier slot (`FEATURE_OPTIONAL_COMPONENTS`), which the required-only tier type does not
// admit, so the tier type alone would reject the very component this kit registers.
export const coreComponents: FullGridComponents['core'] = {
	Root,
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
	Tooltip,
	// `core`, not a `selection` or `draft` group: a grid with `draft` and no row-selection
	// feature still renders the bar, so it must not depend on a kit advertising selection.
	ActionBar,
}
