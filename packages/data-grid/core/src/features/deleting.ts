import type { InitialTableState, Row, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

export type ConfirmationOptions = {
	title?: string
	description?: string | ((row: Row<unknown>) => string)
}

export type DeletingConfig<TData> = {
	onDelete: (row: Row<TData>) => void | Promise<void>
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
		table.deleteRow = async (rowId) => {
			const config = table.options.deleting
			if (!config) return
			const row = table.getRowModel().rows.find((r) => r.id === rowId)
			if (!row) return
			await config.onDelete(row)
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
			table.setState((state) => ({ ...state, pendingDeleteRowId: null }))
		}
	},
}
