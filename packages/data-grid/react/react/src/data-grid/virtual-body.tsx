import { useGridComponents } from '../components-context'

import { DataGridRow } from './row'
import { useTableContext } from './table-context'
import { useVirtualContext } from './virtual-context'

import type { VirtualItem } from '@tanstack/react-virtual'

/**
 * CSS custom property used to compute sticky offsets for pinned rows.
 * Same variable as Body — override with `--dg-row-height` to match your row height.
 */
const ROW_HEIGHT_CSS = 'var(--dg-row-height, 49px)'

/**
 * Virtualized tbody — renders only the rows currently in the viewport.
 *
 * The tbody is given `position: relative` and a fixed pixel height equal to
 * the virtualizer's total size so the scroll container knows the full extent.
 * Each row is absolutely positioned via `transform: translateY(start)`.
 *
 * Pinned rows (top/bottom) are rendered outside the virtual set as sticky rows,
 * identical to the non-virtual Body behaviour.
 */
export function VirtualBody() {
  const table = useTableContext()
  const { Tbody } = useGridComponents()
  const { rowVirtualizer } = useVirtualContext()

  if (!rowVirtualizer) return null

  const hasPinning = Boolean(table.options.enableRowPinning)
  const topRows = hasPinning ? table.getTopRows() : []
  const centerRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
  const bottomRows = hasPinning ? table.getBottomRows() : []

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <Tbody
      style={{
        display: 'grid',
        height: `${String(totalSize)}px`,
        position: 'relative',
      }}
    >
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

      {virtualItems.map((virtualRow: VirtualItem) => {
        const row = centerRows[virtualRow.index]
        if (!row) return null
        return (
          <DataGridRow
            key={row.id}
            row={row}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${String(virtualRow.start)}px)`,
            }}
          />
        )
      })}

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
