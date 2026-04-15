import type { DataTable } from '@ez-kit/data-grid-core'
import type { CSSProperties } from 'react'

/**
 * Builds a CSS custom property map for all column widths.
 * Set these on `<table style={vars}>` so that `<th>` / `<td>` can read
 * widths via `calc(var(--header-{id}-size) * 1px)` without per-cell re-renders.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getColumnSizeVars(table: DataTable<any>): CSSProperties {
  const headers = table.getFlatHeaders()
  const vars: Record<string, string> = {}

  for (const header of headers) {
    const colId = header.column.id
    vars[`--header-${colId}-size`] = String(header.getSize())
    vars[`--col-${colId}-size`] = String(header.column.getSize())
  }

  return vars as CSSProperties
}
