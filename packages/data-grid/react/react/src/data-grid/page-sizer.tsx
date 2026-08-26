import { useGridComponents } from '../components-context'

import { useDataGridTable, useDataGridState } from './table-context'

/**
 * Page size selector. Renders whenever page-based pagination is enabled — auto-mounted into
 * the toolbar by `pagination.toolbar`, and equally placeable by hand under `toolbar: false`.
 *
 * Subscribes only to `state.pagination` — other state mutations leave it stable.
 */
export function PageSizer() {
	const table = useDataGridTable()
	const { PageSizer: PageSizerComponent } = useGridComponents().pagination
	const options = table.grid.pagination.pageSizeOptions

	const pagination = useDataGridState((s) => s.pagination)

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
