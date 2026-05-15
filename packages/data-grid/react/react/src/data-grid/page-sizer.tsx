import { useGridComponents } from '../components-context'
import { PAGE_SIZER_KEY, type PageSizerConfig } from '../use-data-grid'

import { useDataGridInstance, useDataGridStore } from './table-context'

/**
 * Page size selector. Rendered only when `pageSizer` is configured in `useDataGrid`.
 *
 * Subscribes only to `state.pagination` — other state mutations leave it stable.
 */
export function PageSizer() {
	const instance = useDataGridInstance()
	const table = instance.table
	const { PageSizer: PageSizerComponent } = useGridComponents()
	const config = (table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] as PageSizerConfig | undefined

	const pagination = useDataGridStore((s) => s.pagination)

	if (!config) return null

	return (
		<PageSizerComponent
			pageSize={pagination.pageSize}
			items={config.items}
			onPageSizeChange={(size) => {
				table.setPageSize(size)
			}}
		/>
	)
}
