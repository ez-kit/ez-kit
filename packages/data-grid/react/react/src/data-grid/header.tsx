import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { flexRender } from './flex-render'
import { useTableContext } from './table-context'

import type { CellInputProps } from '../cell-types-context'
import type { InputProps } from '../types'
import type { Header, ColumnMeta } from '@tanstack/table-core'
import type { ComponentType, ReactNode } from 'react'

/**
 * Renders the table `<thead>` with all header groups.
 * - Clicking a sortable header toggles sort.
 * - If filtering is enabled on a column, renders a filter input below the header.
 * - `filtering.component` injects a custom filter control per column.
 */
export function Header() {
	const table = useTableContext()
	const { Thead, Tr, Th, Input } = useGridComponents()
	const hasFiltering = Boolean(table.options.getFilteredRowModel)

	return (
		<Thead data-slot='thead'>
			{table.getHeaderGroups().map((headerGroup) => (
				<Tr
					data-slot='tr'
					key={headerGroup.id}
				>
					{headerGroup.headers.map((header) => {
						const meta = header.column.columnDef.meta
						const canSort = header.column.getCanSort()
						const sortDir = header.column.getIsSorted()
						const pinStyles = getCommonPinStyles(header.column)

						return (
							<Th
								data-slot='th'
								key={header.id}
								colSpan={header.colSpan}
								style={pinStyles}
								onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
							>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext() as unknown as Record<string, unknown>,
										)}
								{canSort && <span aria-hidden>{sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' : ' ⇅'}</span>}
								{hasFiltering && meta?.filtering !== false && !meta?.isSystemColumn && header.column.getCanFilter() && (
									<div>
										{renderFilterInput({ header, meta, Input })}
									</div>
								)}
							</Th>
						)
					})}
				</Tr>
			))}
		</Thead>
	)
}

// ── helpers ───────────────────────────────────────────────────────────────

interface FilterInputArgs {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>
	meta: ColumnMeta<unknown, unknown> | undefined
	Input: ComponentType<InputProps>
}

function renderFilterInput({ header, meta, Input }: FilterInputArgs): ReactNode {
	const filterValue = header.column.getFilterValue() ?? ''
	const onChange = (v: unknown) => { header.column.setFilterValue(v) }

	// 1. column-level filtering.component
	const filteringConfig = meta?.filtering
	if (filteringConfig !== false && filteringConfig !== undefined) {
		const comp = (filteringConfig as { component?: (props: CellInputProps) => ReactNode }).component
		if (comp) return comp({ value: filterValue, onChange })
	}

	// 2. default Input
	return (
		<Input
			placeholder={`Filter ${header.column.id}…`}
			value={filterValue as string}
			onChange={(e) => { header.column.setFilterValue(e.target.value) }}
			onClick={(e) => { e.stopPropagation() }}
		/>
	)
}
