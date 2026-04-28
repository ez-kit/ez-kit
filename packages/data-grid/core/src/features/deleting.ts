import type { Row, RowData, TableFeature, TableState } from '@tanstack/table-core'

export type ConfirmationOptions = {
	title?: string
	description?: string | ((row: Row<unknown>) => string)
}

export type DeletingConfig<TData> = {
	onDelete: (row: Row<TData>) => void | Promise<void>
	confirmation?: boolean | ConfirmationOptions
}

declare module '@tanstack/table-core' {
	type TableOptionsResolved<TData extends RowData> = {
		deleting?: DeletingConfig<TData>
	}

	type TableState = {
		pendingDeleteRowId: string | null
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type Table<TData extends RowData> = {
		deleteRow: (rowId: string) => Promise<void>
		requestDeleteRow: (rowId: string) => void
		confirmDeleteRow: () => Promise<void>
		cancelDeleteRow: () => void
	}
}

export const DeletingFeature: TableFeature = {
	getInitialState: (state) =>
		({
			...state,
			pendingDeleteRowId: null,
		}) as Partial<TableState>,

	createTable: (table) => {
		table.deleteRow = async (rowId) => {
			const config = table.options.deleting
			if (!config) return
			const row = table.getRowModel().rows.find((r) => r.id === rowId) as Row<RowData> | undefined
			if (!row) return
			await config.onDelete(row as Row<(typeof table)['options']['data'][number]>)
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
