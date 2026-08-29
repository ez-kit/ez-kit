import { useGridComponents } from '../components-context'

import { useDataGridTable, useDataGridState } from './table-context'

import type { ReactNode } from 'react'

/** What a `<DataGrid.PageSizer>` render function receives. */
export type DataGridPageSizerRenderArgs = {
	/** The page size currently in effect. */
	pageSize: number
	/** The offered sizes, from `pagination.items`. */
	items: number[]
	/** Commits a new page size and resets to the first page. */
	onPageSizeChange: (size: number) => void
}

export type DataGridPageSizerProps = {
	/**
	 * Custom page-size control, replacing the kit's `PageSizer` component.
	 *
	 * Nothing is rendered — `children` included — when page-based pagination is off or
	 * `pagination.items` is empty, so a custom control never appears without a
	 * choice to offer.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.PageSizer>
	 *   {({ pageSize, items, onPageSizeChange }) => (
	 *     <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
	 *       {items.map((n) => <option key={n} value={n}>{n} / page</option>)}
	 *     </select>
	 *   )}
	 * </DataGrid.PageSizer>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridPageSizerRenderArgs) => ReactNode)
}

/**
 * Page size selector. Renders whenever page-based pagination is enabled — auto-mounted into
 * the toolbar by `pagination.toolbar`, and equally placeable by hand under `toolbar: false`.
 *
 * Subscribes only to `state.pagination` — other state mutations leave it stable.
 */
export function PageSizer({ children }: DataGridPageSizerProps = {}) {
	const table = useDataGridTable()
	const { PageSizer: PageSizerComponent } = useGridComponents().pagination
	const options = table.grid.pagination.items

	const pagination = useDataGridState((s) => s.pagination)

	if (!options) return null

	const onPageSizeChange = (size: number): void => {
		table.setPageSize(size)
	}

	if (children !== undefined) {
		return typeof children === 'function'
			? children({ pageSize: pagination.pageSize, items: options, onPageSizeChange })
			: children
	}

	return (
		<PageSizerComponent
			pageSize={pagination.pageSize}
			items={options}
			onPageSizeChange={onPageSizeChange}
		/>
	)
}
