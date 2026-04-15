import { useGridComponents } from '../components-context'
import { getColumnSizeVars } from '../utils/column-size-vars'

import { Body } from './body'
import { Header } from './header'
import { useTableContext } from './table-context'

/**
 * Renders the full `<table>` with header and body.
 * When column resizing is enabled, sets CSS custom properties for column widths
 * on the table element so cells can read widths without per-cell re-renders.
 */
export function DataGridTable() {
  const { Table } = useGridComponents()
  const table = useTableContext()

  const isResizingEnabled = Boolean(table.options.enableColumnResizing)
  const sizeVars = isResizingEnabled ? getColumnSizeVars(table) : undefined

  return (
    <Table
      style={{
        ...sizeVars,
        ...(isResizingEnabled ? { tableLayout: 'fixed' } : {}),
      }}
    >
      <Header />
      <Body />
    </Table>
  )
}
