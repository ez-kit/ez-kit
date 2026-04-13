import { useGridComponents } from '../components-context'
import { PAGE_SIZER_KEY, type PageSizerConfig } from '../use-data-grid'

import { useTableContext } from './table-context'

/**
 * Page size selector. Rendered only when `pageSizer` is configured in `useDataGrid`.
 */
export function PageSizer() {
	const table = useTableContext()
	const { PageSizer: PageSizerComponent } = useGridComponents()
	const config = (table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] as
		| PageSizerConfig
		| undefined

	if (!config) return null

	const { pageSize } = table.getState().pagination

	return (
		<PageSizerComponent
			pageSize={pageSize}
			items={config.items}
			onPageSizeChange={(size) => {
				table.setPageSize(size)
			}}
		/>
	)
}
