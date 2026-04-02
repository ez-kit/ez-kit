import { useGridComponents } from '../components-context'

import { DataGridCell } from './cell'

import type { Row } from '@tanstack/table-core'

interface RowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>
}

/**
 * Renders a single table body row with all its cells.
 */
export function DataGridRow({ row }: RowProps) {
  const { Tr } = useGridComponents()
  return (
    <Tr data-row-id={row.id}>
      {row.getVisibleCells().map((cell) => (
        <DataGridCell key={cell.id} cell={cell} row={row} />
      ))}
    </Tr>
  )
}
