import { ActionBar } from '../action-bar/ActionBar'
import { NumberInput } from '../editing/NumberInput'

import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Input } from './Input'
import { Menu } from './Menu'
import { Modal } from './Modal'
import { Root } from './Root'
import { Table, TableScroll, Tbody, Td, Tfoot, Th, Thead, Tr } from './table-adapters'
import { Toolbar } from './Toolbar'

import type { FullGridComponents } from '@ez-kit/data-grid-react'

/**
 * The `core` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
// Annotated as `FullGridComponents['core']` rather than `GridCoreComponents`: `TableScroll` is an
// *optional*-tier slot (`FEATURE_OPTIONAL_COMPONENTS`), which the required-only tier type does not
// admit, so the tier type alone would reject the very component this kit registers.
export const coreComponents: FullGridComponents['core'] = {
	Root,
	ActionBar,
	Table,
	TableScroll,
	Thead,
	Tbody,
	Tfoot,
	Tr,
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
