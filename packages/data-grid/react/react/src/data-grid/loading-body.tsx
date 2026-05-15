import { useGridComponents } from '../components-context'
import { FALLBACKS_KEY } from '../use-data-grid'

import { flexRender } from './flex-render'
import { useTable } from './table-context'

import type { FallbacksConfig } from '../use-data-grid'

const DEFAULT_LOADING_ROWS = 5

export function LoadingBody() {
	const table = useTable()
	const { Tbody, Tr, Td, LoadingRow } = useGridComponents()

	const fallbacks = (table as unknown as Record<symbol, unknown>)[FALLBACKS_KEY] as FallbacksConfig | undefined
	const loadingConfig = fallbacks?.loading

	const columnCount = table.getVisibleLeafColumns().length
	const customContent = typeof loadingConfig === 'object' ? loadingConfig.content : undefined

	if (customContent !== undefined) {
		return (
			<Tbody data-slot='tbody'>
				<Tr data-slot='tr'>
					<Td data-slot='loading-body-cell' colSpan={columnCount}>
						{flexRender(customContent, { columnCount })}
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
