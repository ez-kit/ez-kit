import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridState, useDataGridTable } from './table-context'

export function NoResultsRow() {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { NoResultsState } = gridComponents['fallback-states']

	const fallbacks = table.grid.fallbacks
	const noResultsConfig = fallbacks?.noResults

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof noResultsConfig === 'object' ? noResultsConfig.content : undefined

	if (customContent !== undefined) {
		return (
			<Tbody>
				<Tr>
					<Td colSpan={columnCount}>{flexRender(customContent, { columnCount })}</Td>
				</Tr>
			</Tbody>
		)
	}

	return (
		<Tbody>
			<Tr>
				<Td colSpan={columnCount}>
					<NoResultsState columnCount={columnCount} />
				</Td>
			</Tr>
		</Tbody>
	)
}
