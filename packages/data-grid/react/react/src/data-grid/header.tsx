import { SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { COL_PINNING_KEY, FILTERING_VARIANT_KEY } from '../use-data-grid'
import { getCommonPinStyles } from '../utils/pin-styles'

import { flexRender } from './flex-render'
import { renderFilterInput } from './render-filter-input'
import { useTable } from './table-context'

import type { ColumnMenuSections } from '../types'
import type { KeyboardEvent } from 'react'

type HeaderProps = {
	/** When true, adds `data-sticky="true"` to the thead for structural CSS targeting. */
	stickyHeader?: boolean
}

/**
 * Renders the table `<thead>` with all header groups.
 *
 * Emits data attributes consumed by the structural stylesheet
 * (`@ez-kit/data-grid-react/styles.css`):
 * - `data-slot="thead" | "tr" | "th" | "header-main" | "sort-trigger" | "header-extras"`
 * - `data-sticky="true"` on the thead when sticky header is on
 * - `data-sortable="true"` and `data-sort-direction="asc | desc | none"` on sortable headers
 *
 * Pin offsets are written as CSS variables via {@link getCommonPinStyles}; the
 * structural CSS reads them on `[data-pinned]` elements.
 */
export function Header({ stickyHeader }: HeaderProps = {}) {
	const table = useTable()
	const {
		Thead,
		Tr,
		Th,
		Input,
		Resizer,
		SortIndicator,
		ColumnMenu,
		Checkbox,
		OperatorSelect,
		BetweenInput,
		FilterPopover,
		MultiSelectFilter,
	} = useGridComponents()
	const cellTypes = useCellTypes()
	const hasFiltering = Boolean(table.options.getFilteredRowModel)
	const colPinEnabled = (table as unknown as Record<symbol, unknown>)[COL_PINNING_KEY] as boolean | undefined
	const filteringVariant = (table as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY] as
		| 'inline'
		| 'popover'
		| 'panel'
		| undefined

	return (
		<Thead
			data-slot='thead'
			{...(stickyHeader ? { 'data-sticky': 'true' } : {})}
		>
			{table.getHeaderGroups().map((headerGroup) => (
				<Tr
					data-slot='tr'
					key={headerGroup.id}
				>
					{headerGroup.headers.map((header) => {
						const meta = header.column.columnDef.meta
						const canSort = header.column.getCanSort()
						const sortDir = header.column.getIsSorted()
						const pinVars = getCommonPinStyles(header.column)
						const pinned = header.column.getIsPinned()

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

						// Build column menu sections
						const sections: ColumnMenuSections = {}
						const colPinDef = meta?.columnPinning
						const isStaticPin = typeof colPinDef === 'object' && colPinDef.pin !== undefined
						const isPinningDisabled = colPinDef === false

						if (colPinEnabled && !meta?.isSystemColumn && !isPinningDisabled && !isStaticPin && !header.isPlaceholder) {
							const isPinned = header.column.getIsPinned()
							sections.pin = {
								isPinned,
								canPinLeft: isPinned !== 'left',
								canPinRight: isPinned !== 'right',
								onPinLeft: () => {
									header.column.pin('left')
								},
								onPinRight: () => {
									header.column.pin('right')
								},
								onUnpin: () => {
									header.column.pin(false)
								},
							}
						}

						if (!meta?.isSystemColumn && !header.isPlaceholder && header.column.getCanHide()) {
							sections.visibility = {
								onHide: () => {
									header.column.toggleVisibility(false)
								},
							}
						}

						if (canSort && !header.isPlaceholder) {
							sections.sorting = {
								currentSort: sortDir,
								canAsc: sortDir !== 'asc',
								canDesc: sortDir !== 'desc',
								onSortAsc: () => { header.column.toggleSorting(false); },
								onSortDesc: () => { header.column.toggleSorting(true); },
								onClearSort: () => { header.column.clearSorting(); },
							}
						}

						const hasSections = Object.keys(sections).length > 0

						// Selection column: render select-all checkbox
						if (header.column.id === SELECTION_COLUMN_ID) {
							const isAllSelected = table.getIsAllRowsSelected()
							const isSomeSelected = table.getIsSomeRowsSelected()
							return (
								<Th
									data-slot='th'
									data-slot-selection-th='true'
									key={header.id}
									colSpan={header.colSpan}
									style={pinVars}
									pinned={pinned}
									{...(pinned ? { 'data-pinned': pinned } : {})}
								>
									<Checkbox
										value={isAllSelected}
										indeterminate={isSomeSelected && !isAllSelected}
										onChange={() => {
											table.toggleAllRowsSelected(!isAllSelected)
										}}
										aria-label='Select all rows'
									/>
								</Th>
							)
						}

						return (
							<Th
								data-slot='th'
								key={header.id}
								colSpan={header.colSpan}
								style={pinVars}
								pinned={pinned}
								{...(pinned ? { 'data-pinned': pinned } : {})}
								{...(canResize ? { 'data-resizable': 'true' } : {})}
							>
								{(() => {
									const canFilter =
										hasFiltering &&
										meta?.filtering !== false &&
										!meta?.isSystemColumn &&
										header.column.getCanFilter() &&
										filteringVariant !== 'panel'
									const filterContent = canFilter
										? renderFilterInput({
												header,
												meta,
												Input,
												cellTypes,
												OperatorSelect,
												BetweenInput,
												MultiSelectFilter,
											})
										: null
									const sortDirAttr: 'asc' | 'desc' | 'none' = sortDir === 'asc' || sortDir === 'desc' ? sortDir : 'none'
									return (
										<>
											<div data-slot='header-main'>
												<div
													data-slot='sort-trigger'
													{...(canSort ? { 'data-sortable': 'true', 'data-sort-direction': sortDirAttr } : {})}
													role={canSort ? 'button' : undefined}
													tabIndex={canSort ? 0 : undefined}
													onClick={sortHandler}
													onKeyDown={onSortKeyDown}
												>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext() as unknown as Record<string, unknown>,
															)}
													<SortIndicator sortDir={sortDir} canSort={canSort} />
												</div>
												{filteringVariant === 'popover' && canFilter && (
													<FilterPopover hasActiveFilter={Boolean(header.column.getFilterValue())}>
														{filterContent}
													</FilterPopover>
												)}
												{hasSections && (
													<ColumnMenu
														column={header.column}
														sections={sections}
													/>
												)}
											</div>
											{filteringVariant !== 'popover' && canFilter && (
												<div data-slot='header-extras'>{filterContent}</div>
											)}
										</>
									)
								})()}
								{canResize && (
									<Resizer
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										onDoubleClick={() => {
											header.column.resetSize()
										}}
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

