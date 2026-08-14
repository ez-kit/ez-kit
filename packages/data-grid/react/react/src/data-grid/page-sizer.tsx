import { useGridComponents } from '../components-context'
import { PAGE_SIZER_KEY } from '../use-data-grid'

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
	const options = (table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] as number[] | undefined

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
