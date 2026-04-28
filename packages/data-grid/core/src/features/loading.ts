import type { InitialTableState, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

export type LoadingState = {
	isLoading: boolean
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		loading: LoadingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptionsResolved<TData extends RowData> {
		loading?: boolean
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		setLoading: (loading: boolean) => void
		getIsLoading: () => boolean
	}
}

export const LoadingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			loading: { isLoading: false } satisfies LoadingState,
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		table.setLoading = (loading) => {
			table.setState((prev) => ({
				...prev,
				loading: { isLoading: loading },
			}))
		}

		// loading state is always initialised by getInitialState
		table.getIsLoading = () => table.getState().loading.isLoading
	},
}
