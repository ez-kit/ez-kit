import { useGridComponents } from '../components-context'

import { useDataGridInstance, useDataGridStore } from './table-context'

/**
 * Page size selector. Rendered only when `pagination.pageSizeOptions` is set in `useDataGrid`.
 *
 * Subscribes only to `state.pagination` — other state mutations leave it stable.
 */
export function PageSizer() {
	const instance = useDataGridInstance()
	const table = instance.table
	const { PageSizer: PageSizerComponent } = useGridComponents().pagination
	const options = table.grid.pagination.pageSizeOptions

	const pagination = useDataGridStore((s) => s.pagination)

	if (!options) return null

	return (
		<PageSizerComponent
			pageSize={pagination.pageSize}
			items={options}
			onPageSizeChange={(size) => {
				table.setPageSize(size)
			}}
		/>
	)
}
