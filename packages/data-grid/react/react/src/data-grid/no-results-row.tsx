import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ReactNode } from 'react'

/** What a `<DataGrid.NoResultsRow>` render function receives. */
export type DataGridNoResultsRowRenderArgs = {
	/** Visible leaf columns — the `colSpan` a full-width row needs. */
	columnCount: number
}

export type DataGridNoResultsRowProps = {
	/**
	 * Custom no-results content, rendered inside the kit's `<Tbody><Tr><Td colSpan>`
	 * scaffold — so the table markup stays valid and you supply only what goes in the cell.
	 *
	 * Takes precedence over `fallbacks.noResults.component`, which is the same override set
	 * once for the whole grid rather than at this one mount point.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.NoResultsRow>Nothing matches those filters.</DataGrid.NoResultsRow>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridNoResultsRowRenderArgs) => ReactNode)
}

export function NoResultsRow({ children }: DataGridNoResultsRowProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { NoResultsState } = gridComponents.fallbacks

	const fallbacks = table.grid.fallbacks
	const noResultsConfig = fallbacks?.noResults

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof noResultsConfig === 'object' ? noResultsConfig.component : undefined

	const content =
		children !== undefined ? (
			typeof children === 'function' ? (
				children({ columnCount })
			) : (
				children
			)
		) : customContent !== undefined ? (
			flexRender(customContent, { columnCount })
		) : (
			<NoResultsState columnCount={columnCount} />
		)

	return (
		<Tbody>
			<Tr>
				<Td colSpan={columnCount}>{content}</Td>
			</Tr>
		</Tbody>
	)
}
