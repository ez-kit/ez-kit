import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ReactNode } from 'react'

const DEFAULT_LOADING_ROWS = 5

/** What a `<DataGrid.LoadingBody>` render function receives. */
export type DataGridLoadingBodyRenderArgs = {
	/** Visible leaf columns — the `colSpan` a full-width row needs. */
	columnCount: number
}

export type DataGridLoadingBodyProps = {
	/**
	 * Custom skeleton content, rendered inside the kit's `<Tbody><Tr><Td colSpan>` scaffold —
	 * so the table markup stays valid and you supply only what goes in the cell.
	 *
	 * Takes precedence over `fallbacks.loading.component`, which is the same override set
	 * once for the whole grid rather than at this one mount point.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.LoadingBody>{({ columnCount }) => <MySkeleton cols={columnCount} />}</DataGrid.LoadingBody>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridLoadingBodyRenderArgs) => ReactNode)
}

export function LoadingBody({ children }: DataGridLoadingBodyProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { LoadingRow } = gridComponents.fallbacks

	const fallbacks = table.grid.fallbacks
	const loadingConfig = fallbacks?.loading

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof loadingConfig === 'object' ? loadingConfig.component : undefined

	const content =
		children !== undefined
			? typeof children === 'function'
				? children({ columnCount })
				: children
			: customContent !== undefined
				? flexRender(customContent, { columnCount })
				: undefined

	if (content !== undefined) {
		return (
			<Tbody data-slot='tbody'>
				<Tr data-slot='tr'>
					<Td
						data-slot='loading-body-cell'
						colSpan={columnCount}
					>
						{content}
					</Td>
				</Tr>
			</Tbody>
		)
	}

	return (
		<Tbody data-slot='tbody'>
			{Array.from({ length: DEFAULT_LOADING_ROWS }, (_, i) => (
				<LoadingRow
					key={i}
					columnCount={columnCount}
				/>
			))}
		</Tbody>
	)
}
