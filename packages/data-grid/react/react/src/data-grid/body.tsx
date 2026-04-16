import { useGridComponents } from '../components-context'

import { CreatingRow } from './creating-row'
import { DataGridRow } from './row'
import { useTableContext } from './table-context'
import { VirtualBody } from './virtual-body'
import { useVirtualContext } from './virtual-context'

/**
 * CSS custom property used to compute sticky offsets for pinned rows.
 * Override with `--dg-row-height` on the table container to match your row height.
 * Default: 49px (matches shadcn table row height).
 */
const ROW_HEIGHT_CSS = 'var(--dg-row-height, 49px)'

/**
 * Renders the table `<tbody>`.
 * When `creating.mode` is `'row'` and creating is active, prepends a creating row.
 * When `creating.mode` is `'pin-row'`, always shows the creating row at the top.
 * When `pinning` is enabled, renders top-pinned / center / bottom-pinned row sections
 * with CSS sticky positioning.
 */
export function Body() {
  const { rowVirtualizer } = useVirtualContext()

  if (rowVirtualizer) return <VirtualBody />

  const table = useTableContext()
  const { Tbody } = useGridComponents()

  const creatingConfig = table.options.creating
  const creatingMode = creatingConfig?.mode ?? 'row'
  const isCreating = table.getCreatingState().isCreating
  const showCreatingRow =
    creatingConfig !== undefined &&
    (creatingMode === 'pin-row' || (creatingMode === 'row' && isCreating))

  const hasPinning = Boolean(table.options.enableRowPinning)
  const topRows = hasPinning ? table.getTopRows() : []
  const centerRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
  const bottomRows = hasPinning ? table.getBottomRows() : []

  return (
    <Tbody>
      {showCreatingRow && <CreatingRow />}
      {topRows.map((row, index) => (
        <DataGridRow
          key={row.id}
          row={row}
          data-pinned='top'
          style={{
            position: 'sticky',
            top: `calc(${String(index)} * ${ROW_HEIGHT_CSS})`,
            zIndex: 2,
          }}
        />
      ))}
      {centerRows.map((row) => (
        <DataGridRow key={row.id} row={row} />
      ))}
      {bottomRows.map((row, index) => (
        <DataGridRow
          key={row.id}
          row={row}
          data-pinned='bottom'
          style={{
            position: 'sticky',
            bottom: `calc(${String(bottomRows.length - 1 - index)} * ${ROW_HEIGHT_CSS})`,
            zIndex: 2,
          }}
        />
      ))}
    </Tbody>
  )
}
