import type { TanStackColumnDef } from './column/types'

/** Identifier constants for auto-injected system columns. */
export const SELECTION_COLUMN_ID = '__selection__'
export const EXPAND_COLUMN_ID = '__expand__'
export const ACTIONS_COLUMN_ID = '__actions__'

interface SystemColumnsOptions {
  selection: boolean
  expanding: boolean
  editing: boolean
  deleting: boolean
}

/**
 * Builds the final column list:
 * [__selection__, __expand__, ...user columns, __actions__]
 *
 * System columns contain no cell renderers (framework-agnostic stubs).
 * The React layer renders them based on meta.systemColumnType.
 */
export function buildColumnList<TRow extends object>(
  userColumns: TanStackColumnDef<TRow>[],
  opts: SystemColumnsOptions,
): TanStackColumnDef<TRow>[] {
  const result: TanStackColumnDef<TRow>[] = []

  if (opts.selection) {
    result.push({
      id: SELECTION_COLUMN_ID,
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        isSystemColumn: true,
        systemColumnType: 'selection',
      },
    })
  }

  if (opts.expanding) {
    result.push({
      id: EXPAND_COLUMN_ID,
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        isSystemColumn: true,
        systemColumnType: 'expand',
      },
    })
  }

  result.push(...userColumns)

  const needsActions = opts.editing || opts.deleting
  if (needsActions) {
    result.push({
      id: ACTIONS_COLUMN_ID,
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        isSystemColumn: true,
        systemColumnType: 'actions',
        pin: 'right',
      },
    })
  }

  return result
}

/**
 * Extracts initial column pinning state from column defs.
 * Called before passing columns to TanStack so that
 * columns with `meta.pin` are registered in initial state.
 */
export function extractPinningState<TRow extends object>(
  columns: TanStackColumnDef<TRow>[],
): { left: string[]; right: string[] } {
  const left: string[] = []
  const right: string[] = []

  for (const col of columns) {
    const pin = col.meta?.pin
    const colId =
      col.id ??
      (col as { accessorKey?: string }).accessorKey ??
      undefined
    if (!pin || !colId) continue
    if (pin === 'left') left.push(colId)
    else right.push(colId)
  }

  return { left, right }
}
