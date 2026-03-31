import type { RowData, TableFeature, TableState } from '@tanstack/table-core'

export interface LoadingState {
  isLoading: boolean
}

declare module '@tanstack/table-core' {
  interface TableState {
    loading: LoadingState
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableOptionsResolved<TData extends RowData> {
    loading?: boolean
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Table<TData extends RowData> {
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
