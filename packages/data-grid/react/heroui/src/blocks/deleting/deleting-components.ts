import { ConfirmDialog } from '../editing/ConfirmDialog'

import type { GridDeletingComponents } from '@ez-kit/data-grid-react'

/**
 * The `deleting` half of the kit's component contract, as its own module.
 *
 * It exists to be a build entry point: a consumer composing a reduced component set with
 * `createDataGrid` can import just the groups their grid uses instead of paying for every
 * feature's UI. The default `DataGrid` is unchanged — `data-grid.tsx` composes every group.
 */
// The dialog file itself lives beside the write forms in `editing/`, where it has always sat; this
// barrel only names the feature group it belongs to in the contract.
export const deletingComponents: GridDeletingComponents = { ConfirmDialog }
