import {
  ACTIONS_COLUMN_ID,
  SELECTION_COLUMN_ID,
  EXPAND_COLUMN_ID,
} from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

/**
 * Inline creating row rendered inside <tbody>.
 * Renders an input cell for each non-system column.
 * Used for creating.mode = 'row' | 'pin-row'.
 */
export function CreatingRow() {
  const table = useTableContext()
  const { Tr, Td, Input, Button } = useGridComponents()
  const values = table.getCreatingState().creatingValues
  const creatingConfig = table.options.creating
  const isPinRow = creatingConfig?.mode === 'pin-row'

  return (
    <Tr data-creating-row>
      {table.getAllLeafColumns().map((col) => {
        const meta = col.columnDef.meta

        if (meta?.isSystemColumn) {
          if (col.id === ACTIONS_COLUMN_ID) {
            return (
              <Td key={col.id}>
                <Button onClick={() => void table.commitCreating()}>Save</Button>
                {!isPinRow && (
                  <Button onClick={() => { table.cancelCreating() }}>Cancel</Button>
                )}
              </Td>
            )
          }
          if (col.id === SELECTION_COLUMN_ID || col.id === EXPAND_COLUMN_ID) {
            return <Td key={col.id} />
          }
          return <Td key={col.id} />
        }

        if (meta?.creating === false) {
          return <Td key={col.id} />
        }

        return (
          <Td key={col.id}>
            <Input
              value={(values[col.id] ?? '') as string | number | readonly string[]}
              onChange={(e) => { table.setCreatingValue(col.id, e.target.value) }}
            />
          </Td>
        )
      })}
    </Tr>
  )
}
