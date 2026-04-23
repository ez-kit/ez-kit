import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { CSSProperties } from 'react'

import { useGridComponents } from '../components-context'
import { VIRTUALIZED_KEY } from '../use-data-grid'
import { getColumnSizeVars, getGridTemplateColumns } from '../utils/column-size-vars'

import { Body } from './body'
import { Header } from './header'
import { useTableContext } from './table-context'
import { VirtualProvider } from './virtual-context'

import type { NormalizedVirtualizedConfig } from '../use-data-grid'

const DEFAULT_ESTIMATE_SIZE = 50
const DEFAULT_OVERSCAN = 5

function resolveEstimateSize(
  estimateSize: NormalizedVirtualizedConfig['row']['estimateSize'],
): (index: number) => number {
  if (typeof estimateSize === 'function') return estimateSize
  const size = estimateSize ?? DEFAULT_ESTIMATE_SIZE
  return () => size
}

/**
 * Renders the full `<table>` with header and body.
 *
 * When column resizing is enabled, sets CSS custom properties for column widths
 * on the table element so cells can read widths without per-cell re-renders.
 *
 * When virtualized rows are enabled, wraps the table in a scroll container,
 * applies `display: grid` layout, and provides a RowVirtualizer via context.
 */
export function DataGridTable() {
  const { Table } = useGridComponents()
  const table = useTableContext()

  const isResizingEnabled = Boolean(table.options.enableColumnResizing)
  const sizeVars = getColumnSizeVars(table)
  const gridTemplateColumns = getGridTemplateColumns(table)

  const virtualizedConfig = (table as unknown as Record<symbol, unknown>)[
    VIRTUALIZED_KEY
  ] as NormalizedVirtualizedConfig | undefined

  const isVirtualized = Boolean(virtualizedConfig)

  // Scroll container ref — used by useVirtualizer to measure the viewport
  const containerRef = useRef<HTMLDivElement>(null)

  const rows = isVirtualized
    ? (table.options.enableRowPinning ? table.getCenterRows() : table.getRowModel().rows)
    : []

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: isVirtualized ? rows.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: resolveEstimateSize(virtualizedConfig?.row.estimateSize),
    overscan: virtualizedConfig?.row.overscan ?? DEFAULT_OVERSCAN,
    enabled: isVirtualized,
  })

  const tableEl = (
    <Table
      style={{
        ...sizeVars,
        '--grid-template-columns': gridTemplateColumns,
        ...(isVirtualized ? { display: 'grid' } : {}),
      } as CSSProperties}
    >
      <Header theadStyle={isVirtualized ? { display: 'grid', position: 'sticky', top: 0, zIndex: 1 } : {}} />
      <Body />
    </Table>
  )

  if (!isVirtualized) return tableEl

  return (
    <VirtualProvider rowVirtualizer={rowVirtualizer}>
      <div
        ref={containerRef}
        data-virtual='rows'
        style={{
          overflow: 'auto',
          position: 'relative',
          height: 'var(--dg-virtual-height, 600px)',
        }}
      >
        {tableEl}
      </div>
    </VirtualProvider>
  )
}
