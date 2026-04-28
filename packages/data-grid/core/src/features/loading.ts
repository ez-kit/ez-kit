import type { RowData, TableFeature, TableState } from '@tanstack/table-core'

export type LoadingState = {
	isLoading: boolean
}

declare module '@tanstack/table-core' {
	type TableState = {
		loading: LoadingState
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type TableOptionsResolved<TData extends RowData> = {
		loading?: boolean
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type Table<TData extends RowData> = {
		setLoading: (loading: boolean) => void
		getIsLoading: () => boolean
	}
}

export const LoadingFeature: TableFeature = {
	getInitialState: (state) =>
		({
			...state,
			loading: { isLoading: false } satisfies LoadingState,
		}) as Partial<TableState>,

	createTable: (table) => {
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
