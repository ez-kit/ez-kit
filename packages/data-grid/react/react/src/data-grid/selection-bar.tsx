import { useGridComponents } from '../components-context'
import { SELECTION_BAR_KEY, type SelectionBarConfig } from '../use-data-grid'

import { useTableContext } from './table-context'

/**
 * Selection info bar. Automatically visible when `selection` is enabled
 * and at least one row is selected.
 *
 * Render behaviour:
 * - `selectionBar: false`       → never renders
 * - `selectionBar: undefined`   → renders (no delete button)
 * - `selectionBar: true`        → renders (no delete button)
 * - `selectionBar: { ... }`     → renders with config
 */
export function SelectionBar() {
  const table = useTableContext()
  const { SelectionBar: SelectionBarComponent } = useGridComponents()

  const rawConfig = (table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] as
    | boolean
    | SelectionBarConfig
    | undefined

  const selectionEnabled = Boolean(table.options.enableRowSelection)
  if (!selectionEnabled || rawConfig === false) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: SelectionBarConfig<any> = typeof rawConfig === 'object' ? rawConfig : {}

  const selectedRows = table.getSelectedRowModel().rows
  const count = selectedRows.length
  const open = count > 0

  const clearSelection = () => { table.resetRowSelection() }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callbackArgs: Parameters<NonNullable<SelectionBarConfig<any>['onDelete']>>[0] = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    table: table as any,
    clearSelection,
    selectedRows,
  }

  const { onDelete: onDeleteHandler, onClear: onClearHandler } = config

  const onDelete = onDeleteHandler
    ? () => { onDeleteHandler(callbackArgs) }
    : undefined

  const onClear = onClearHandler
    ? () => { onClearHandler(callbackArgs) }
    : clearSelection

  const actions =
    config.actions == null
      ? undefined
      : typeof config.actions === 'function'
        ? config.actions(callbackArgs)
        : config.actions

  return (
    <SelectionBarComponent
      open={open}
      count={count}
      selectedRows={selectedRows}
      onClear={onClear}
      {...(onDelete !== undefined ? { onDelete } : {})}
      {...(actions !== undefined ? { actions } : {})}
    />
  )
}
