import type { RowData, Row, TableFeature, TableState } from '@tanstack/table-core'

export interface EditingState {
  editingRowId: string | null
  editingValues: Record<string, unknown>
  /** Populated only in cell mode. */
  editingCellId: string | null
}

export interface EditingConfig<TData> {
  /** How the edit form is presented. Default: 'row'. */
  mode?: 'row' | 'modal' | 'cell'
  /** Called on save. Return false (or Promise<false>) to keep the form open. */
  onSave: (rowId: string, values: Partial<TData>) => boolean | Promise<boolean>
}

declare module '@tanstack/table-core' {
  interface TableState {
    editing: EditingState
  }

   
  interface TableOptionsResolved<TData extends RowData> {
    editing?: EditingConfig<TData>
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Table<TData extends RowData> {
    startEditing: (rowId: string) => void
    cancelEditing: () => void
    commitEditing: () => Promise<void>
    setEditingValue: (key: string, value: unknown) => void
    getEditingState: () => EditingState
    /** Cell mode only. */
    startCellEditing: (rowId: string, columnId: string) => void
    /** Cell mode only. */
    commitCellEditing: () => Promise<void>
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Row<TData extends RowData> {
    getIsEditing: () => boolean
  }
}

export const EditingFeature: TableFeature = {
  getInitialState: (state) =>
    ({
      ...state,
      editing: {
        editingRowId: null,
        editingValues: {},
        editingCellId: null,
      } satisfies EditingState,
    }) as Partial<TableState>,

  createTable: (table) => {
    table.startEditing = (rowId) => {
      // Snapshot current row values as initial editing values
      const row = table
        .getRowModel()
        .rows.find((r) => r.id === rowId) as Row<RowData> | undefined
      const initialValues: Record<string, unknown> = {}
      if (row) {
        table.getAllColumns().forEach((col) => {
          if (col.id && !col.columnDef.meta?.isSystemColumn) {
            initialValues[col.id] = row.getValue(col.id)
          }
        })
      }
      table.setState((prev) => ({
        ...prev,
        editing: {
          editingRowId: rowId,
          editingValues: initialValues,
          editingCellId: null,
        },
      }))
    }

    table.cancelEditing = () => {
      table.setState((prev) => ({
        ...prev,
        editing: { editingRowId: null, editingValues: {}, editingCellId: null },
      }))
    }

    table.commitEditing = async () => {
      const config = table.options.editing
      if (!config) return
      const { editingRowId, editingValues } = table.getEditingState()
      if (!editingRowId) return
      const result = await config.onSave(
        editingRowId,
        editingValues as Partial<(typeof table)['options']['data'][number]>,
      )
      if (result) {
        table.cancelEditing()
      }
    }

    table.setEditingValue = (key, value) => {
      table.setState((prev) => ({
        ...prev,
        editing: {
          ...prev.editing,
          editingValues: { ...prev.editing.editingValues, [key]: value },
        },
      }))
    }

    // editing state is always initialised by getInitialState
    table.getEditingState = () => table.getState().editing

    table.startCellEditing = (rowId, columnId) => {
      const row = table
        .getRowModel()
        .rows.find((r) => r.id === rowId) as Row<RowData> | undefined
      const cellId = `${rowId}_${columnId}`
      const initialValue = row?.getValue(columnId)
      table.setState((prev) => ({
        ...prev,
        editing: {
          editingRowId: rowId,
          editingValues: { [columnId]: initialValue },
          editingCellId: cellId,
        },
      }))
    }

    table.commitCellEditing = async () => {
      const config = table.options.editing
      if (!config) return
      const { editingRowId, editingCellId, editingValues } =
        table.getEditingState()
      if (!editingRowId || !editingCellId) return
      const columnId = editingCellId.replace(`${editingRowId}_`, '')
      const result = await config.onSave(
        editingRowId,
        { [columnId]: editingValues[columnId] } as Partial<
          (typeof table)['options']['data'][number]
        >,
      )
      if (result) {
        table.cancelEditing()
      }
    }
  },

  createRow: (row, table) => {
    row.getIsEditing = () =>
      table.getState().editing.editingRowId === row.id
  },
}
