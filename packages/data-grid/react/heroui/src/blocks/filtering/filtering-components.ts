import { BetweenInput } from './BetweenInput'
import { ClearFilterButton } from './ClearFilterButton'
import { FilterChip } from './FilterChip'
import { FilterPanel } from './FilterPanel'
import { FilterPanelChip } from './FilterPanelChip'
import { FilterPopover } from './FilterPopover'
import { GlobalFilterInput } from './GlobalFilterInput'
import { MultiSelectFilter } from './MultiSelectFilter'
import { OperatorSelect } from './OperatorSelect'

import type { GridFilteringComponents } from '@ez-kit/data-grid-react'

/**
 * The `filtering` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
export const filteringComponents: GridFilteringComponents = {
	FilterPopover,
	FilterPanel,
	FilterPanelChip,
	FilterChip,
	ClearFilterButton,
	GlobalFilterInput,
	OperatorSelect,
	BetweenInput,
	MultiSelectFilter,
}
