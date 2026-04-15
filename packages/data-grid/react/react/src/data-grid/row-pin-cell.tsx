import { ROW_PINNING_KEY } from '../use-data-grid'
import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

import type { RowPinningConfig } from '@ez-kit/data-grid-core'
import type { Row } from '@tanstack/table-core'

interface RowPinCellProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>
}

/**
 * Renders the pin menu in the __row_pin__ column.
 * Reads the pinning config stored on the table instance via ROW_PINNING_KEY.
 */
export function RowPinCell({ row }: RowPinCellProps) {
  const table = useTableContext()
  const { RowPinMenu } = useGridComponents()

  const pinningConfig = (table as unknown as Record<symbol, unknown>)[ROW_PINNING_KEY] as
    | RowPinningConfig
    | undefined

  return (
    <RowPinMenu
      isPinned={row.getIsPinned()}
      canPinTop={Boolean(pinningConfig?.top)}
      canPinBottom={Boolean(pinningConfig?.bottom)}
      onPinTop={() => { row.pin('top', false, false) }}
      onPinBottom={() => { row.pin('bottom', false, false) }}
      onUnpin={() => { row.pin(false, false, false) }}
    />
  )
}
