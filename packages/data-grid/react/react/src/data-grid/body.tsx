import { useGridComponents } from '../components-context'

import { CreatingRow } from './creating-row'
import { DataGridRow } from './row'
import { useTableContext } from './table-context'

/**
 * Renders the table `<tbody>`.
 * When `creating.mode` is `'row'` and creating is active, prepends a creating row.
 * When `creating.mode` is `'pin-row'`, always shows the creating row at the top.
 */
export function Body() {
  const table = useTableContext()
  const { Tbody } = useGridComponents()

  const creatingConfig = table.options.creating
  const creatingMode = creatingConfig?.mode ?? 'row'
  const isCreating = table.getCreatingState().isCreating
  const showCreatingRow =
    creatingConfig !== undefined &&
    (creatingMode === 'pin-row' || (creatingMode === 'row' && isCreating))

  return (
    <Tbody>
      {showCreatingRow && <CreatingRow />}
      {table.getRowModel().rows.map((row) => (
        <DataGridRow key={row.id} row={row} />
      ))}
    </Tbody>
  )
}
