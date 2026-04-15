import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { flexRender } from './flex-render'
import { useTableContext } from './table-context'

import type { CellInputProps, CellTypeRegistry } from '../cell-types-context'
import type { InputProps } from '../types'
import type { Header, ColumnMeta } from '@tanstack/table-core'
import type { ComponentType, KeyboardEvent, ReactNode } from 'react'

/**
 * Renders the table `<thead>` with all header groups.
 * - Clicking a sortable header toggles sort.
 * - If filtering is enabled on a column, renders a filter input below the header.
 * - `filtering.component` injects a custom filter control per column.
 */
export function Header() {
	const table = useTableContext()
	const { Thead, Tr, Th, Input, Resizer } = useGridComponents()
	const cellTypes = useCellTypes()
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

						const sortHandler = canSort ? header.column.getToggleSortingHandler() : undefined
						const onSortKeyDown = canSort
							? (e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										sortHandler?.(e)
									}
								}
							: undefined

						const canResize = Boolean(table.options.enableColumnResizing) && header.column.getCanResize()
						const thStyle = {
							...pinStyles,
							...(canResize
								? {
										width: `calc(var(--header-${header.column.id}-size) * 1px)`,
										position: 'relative' as const,
									}
								: {}),
						}

						return (
							<Th
								data-slot='th'
								key={header.id}
								colSpan={header.colSpan}
								style={thStyle}
							>
								<div
									data-slot='sort-trigger'
									role={canSort ? 'button' : undefined}
									tabIndex={canSort ? 0 : undefined}
									style={{ cursor: canSort ? 'pointer' : undefined }}
									onClick={sortHandler}
									onKeyDown={onSortKeyDown}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext() as unknown as Record<string, unknown>,
											)}
									{canSort && <span aria-hidden>{sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' : ' ⇅'}</span>}
								</div>
								{hasFiltering && meta?.filtering !== false && !meta?.isSystemColumn && header.column.getCanFilter() && (
									<div data-slot='header-extras'>
										{renderFilterInput({ header, meta, Input, cellTypes })}
									</div>
								)}
								{canResize && (
									<Resizer
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										onDoubleClick={() => { header.column.resetSize() }}
										isResizing={header.column.getIsResizing()}
									/>
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
	cellTypes: CellTypeRegistry
}

function renderFilterInput({ header, meta, Input, cellTypes }: FilterInputArgs): ReactNode {
	const filterValue = header.column.getFilterValue()
	const onChange = (v: unknown) => { header.column.setFilterValue(v) }

	// 1. column-level filtering.component
	const filteringConfig = meta?.filtering
	if (filteringConfig !== false && filteringConfig !== undefined) {
		const comp = (filteringConfig as { component?: (props: CellInputProps) => ReactNode }).component
		if (comp) return comp({ value: filterValue, onChange })
	}

	// 2. registry by cellType (filter → edit fallback)
	if (meta?.cellType) {
		const def = cellTypes[meta.cellType]
		const comp = def?.filter ?? def?.edit
		if (comp) return comp({ value: filterValue, onChange })
	}

	// 3. default Input
	return (
		<Input
			placeholder={`Filter ${header.column.id}…`}
			value={(filterValue ?? '') as string}
			onChange={(e) => { header.column.setFilterValue(e.target.value) }}
		/>
	)
}
