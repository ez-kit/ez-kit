import type { CellViewCtx, ColumnDef, TanStackColumnDef } from './types'

/**
 * Converts our ColumnDef[] to TanStack ColumnDef[].
 *
 * - pinning, filtering, editing, creating → column meta
 * - cell.type → meta.cellType
 * - cell.component → TanStack cell renderer + meta.cellView
 * - sorting: false → enableSorting: false
 * - header string preserved as-is (TanStack accepts string | function)
 */
export function mapColumns<TRow extends object>(
  defs: ColumnDef<TRow>[],
): TanStackColumnDef<TRow>[] {
  return defs.map((def) => mapColumn(def))
}

function mapColumn<TRow extends object>(
  def: ColumnDef<TRow>,
): TanStackColumnDef<TRow> {
  const {
    pinning,
    sorting,
    cell,
    filtering,
    editing,
    creating,
    header,
    columns,
    accessorKey,
    accessorFn,
    id,
    footer,
    enableSorting,
    enableColumnFilter,
    enableGlobalFilter,
    enableHiding,
    enableResizing,
    size,
    minSize,
    maxSize,
  } = def

  const meta: TanStackColumnDef<TRow>['meta'] = {}

  if (pinning !== undefined) meta.columnPinning = pinning
  if (filtering !== undefined) meta.filtering = filtering
  if (editing !== undefined) meta.editing = editing
  if (creating !== undefined) meta.creating = creating
  if (cell?.type !== undefined) meta.cellType = cell.type
  const viewFn = cell?.component
  if (viewFn !== undefined)
    meta.cellView = viewFn as (ctx: CellViewCtx<unknown, unknown>) => unknown

  // Build a plain object and cast — TanStack's ColumnDef is a discriminated union
  // so it can't be directly constructed via spread without type assertions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = { meta }

  if (id !== undefined) result.id = id
  if (header !== undefined) result.header = header
  if (footer !== undefined) result.footer = footer
  if (enableSorting !== undefined) result.enableSorting = enableSorting
  if (enableColumnFilter !== undefined)
    result.enableColumnFilter = enableColumnFilter
  if (enableGlobalFilter !== undefined)
    result.enableGlobalFilter = enableGlobalFilter
  if (enableHiding !== undefined) result.enableHiding = enableHiding
  if (enableResizing !== undefined) result.enableResizing = enableResizing
  if (size !== undefined) result.size = size
  if (minSize !== undefined) result.minSize = minSize
  if (maxSize !== undefined) result.maxSize = maxSize

  // sorting: false → disable sorting for this column
  if (sorting === false) result.enableSorting = false

  // cell.component (preferred) or cell.view → TanStack cell renderer
  if (viewFn !== undefined) {
    result.cell = (ctx: {
      row: { original: TRow; index: number }
      getValue: () => unknown
    }) =>
      viewFn({
        row: ctx.row.original,
        value: ctx.getValue(),
        rowIndex: ctx.row.index,
      })
  }

  // accessorKey or accessorFn
  if (accessorKey !== undefined) {
    result.accessorKey = accessorKey
  } else if (accessorFn !== undefined) {
    result.accessorFn = accessorFn
  }

  // Nested columns (column groups)
  if (columns !== undefined) {
    result.columns = mapColumns(columns)
  }

  return result as TanStackColumnDef<TRow>
}
