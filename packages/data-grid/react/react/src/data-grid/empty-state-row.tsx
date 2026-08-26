import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useTable } from './table-context'

export function EmptyStateRow() {
	const table = useTable()
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { EmptyState } = gridComponents['fallback-states']

	const fallbacks = table.grid.fallbacks
	const emptyConfig = fallbacks?.empty

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof emptyConfig === 'object' ? emptyConfig.content : undefined

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
					<EmptyState columnCount={columnCount} />
				</Td>
			</Tr>
		</Tbody>
	)
}
