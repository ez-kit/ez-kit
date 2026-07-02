import { useGridComponents } from '../components-context'
import { FALLBACKS_KEY } from '../use-data-grid'

import { flexRender } from './flex-render'
import { useTable } from './table-context'

import type { FallbacksConfig } from '../use-data-grid'

export function NoResultsRow() {
	const table = useTable()
	const gridComponents = useGridComponents()
	const { Tbody, Tr, Td } = gridComponents.core
	const { NoResultsState } = gridComponents['fallback-states']

	const fallbacks = (table as unknown as Record<symbol, unknown>)[FALLBACKS_KEY] as FallbacksConfig | undefined
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
