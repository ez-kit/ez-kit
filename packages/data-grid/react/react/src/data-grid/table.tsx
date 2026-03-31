import { useGridComponents } from '../components-context'

import { Body } from './body'
import { Header } from './header'

/**
 * Renders the full `<table>` with header and body.
 */
export function DataGridTable() {
  const { Table } = useGridComponents()
  return (
    <Table>
      <Header />
      <Body />
    </Table>
  )
}
