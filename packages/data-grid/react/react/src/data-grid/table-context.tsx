import { createContext, useContext } from 'react'

import type { DataTable } from '@ez-kit/data-grid-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableContext = createContext<DataTable<any> | null>(null)

export { TableContext }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTableContext(): DataTable<any> {
	const ctx = useContext(TableContext)
	if (!ctx) {
		throw new Error('This component must be rendered inside <DataGrid>.')
	}
	return ctx
}
