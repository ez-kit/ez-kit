import { SelectionBar } from './SelectionBar'

import type { GridSelectionComponents } from '@ez-kit/data-grid-react'

/**
 * The `selection` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
export const selectionComponents: GridSelectionComponents = { SelectionBar }
