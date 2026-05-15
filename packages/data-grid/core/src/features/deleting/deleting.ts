import type { InitialTableState, Row, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

export type ConfirmationOptions = {
	title?: string
	description?: string | ((row: Row<unknown>) => string)
}

/**
 * Context passed to {@link DeletingConfig.onDelete}.
 *
 * @typeParam TData - row data type
 */
export type DeletingContext<TData> = {
	/** ID of the row being deleted (TanStack row.id). */
	rowId: string
	/** Full TanStack row instance — access `row.original`, `row.getValue()`, etc. */
	row: Row<TData>
	/** Aborted when the user cancels deletion via cancelDeleteRow() or the table unmounts. */
	signal: AbortSignal
}

export type DeletingConfig<TData> = {
	onDelete: (ctx: DeletingContext<TData>) => void | Promise<void>
	confirmation?: boolean | ConfirmationOptions
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableOptionsResolved<TData extends RowData> {
		deleting?: DeletingConfig<TData>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		pendingDeleteRowId: string | null
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		deleteRow: (rowId: string) => Promise<void>
		requestDeleteRow: (rowId: string) => void
		confirmDeleteRow: () => Promise<void>
		cancelDeleteRow: () => void
	}
}

export const DeletingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			pendingDeleteRowId: null,
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		// Single AbortController per table instance.
		// Aborted on: new deleteRow, cancelDeleteRow.
		let controller: AbortController | undefined

		const resetController = (): AbortController => {
			controller?.abort()
			const c = new AbortController()
			controller = c
			return c
		}

		table.deleteRow = async (rowId) => {
			const config = table.options.deleting
			if (!config) return
			const row = table.getRowModel().rows.find((r) => r.id === rowId)
			if (!row) return
			const c = resetController()
			await config.onDelete({ rowId, row, signal: c.signal })
		}

		table.requestDeleteRow = (rowId) => {
			const config = table.options.deleting
			if (!config) return
			if (config.confirmation) {
				table.setState((state) => ({ ...state, pendingDeleteRowId: rowId }))
			} else {
				void table.deleteRow(rowId)
			}
		}

		table.confirmDeleteRow = async () => {
			const pendingId = table.getState().pendingDeleteRowId
			if (!pendingId) return
			table.setState((state) => ({ ...state, pendingDeleteRowId: null }))
			await table.deleteRow(pendingId)
		}

		table.cancelDeleteRow = () => {
			controller?.abort()
			controller = undefined
			table.setState((state) => ({ ...state, pendingDeleteRowId: null }))
		}
	},
}
