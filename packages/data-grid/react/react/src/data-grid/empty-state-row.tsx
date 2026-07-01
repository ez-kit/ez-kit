import { useGridComponents } from '../components-context'
import { FALLBACKS_KEY } from '../use-data-grid'

import { flexRender } from './flex-render'
import { useTable } from './table-context'

import type { FallbacksConfig } from '../use-data-grid'

export function EmptyStateRow() {
	const table = useTable()
	const { Tbody, Tr, Td, EmptyState } = useGridComponents()

	const fallbacks = (table as unknown as Record<symbol, unknown>)[FALLBACKS_KEY] as FallbacksConfig | undefined
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
