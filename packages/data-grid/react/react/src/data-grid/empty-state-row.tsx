import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ReactNode } from 'react'

/** What a `<DataGrid.EmptyStateRow>` render function receives. */
export type DataGridEmptyStateRowRenderArgs = {
	/** Visible leaf columns — the `colSpan` a full-width row needs. */
	columnCount: number
}

export type DataGridEmptyStateRowProps = {
	/**
	 * Custom empty-state content, rendered inside the kit's `<Tbody><Tr><Td colSpan>`
	 * scaffold — so the table markup stays valid and you supply only what goes in the cell.
	 *
	 * Takes precedence over `fallbacks.empty.component`, which is the same override set once
	 * for the whole grid rather than at this one mount point.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.EmptyStateRow>No orders yet — create the first one.</DataGrid.EmptyStateRow>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridEmptyStateRowRenderArgs) => ReactNode)
}

export function EmptyStateRow({ children }: DataGridEmptyStateRowProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { EmptyState } = gridComponents.fallbacks

	const fallbacks = table.grid.fallbacks
	const emptyConfig = fallbacks?.empty

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof emptyConfig === 'object' ? emptyConfig.component : undefined

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
			<EmptyState columnCount={columnCount} />
		)

	return (
		<Tbody>
			<Tr>
				<Td colSpan={columnCount}>{content}</Td>
			</Tr>
		</Tbody>
	)
}
