import { SortIndicator } from './SortIndicator'
import { SortMenu } from './SortMenu'

import type { GridSortingComponents } from '@ez-kit/data-grid-react'

/**
 * The `sorting` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
export const sortingComponents: GridSortingComponents = { SortIndicator, SortMenu }
