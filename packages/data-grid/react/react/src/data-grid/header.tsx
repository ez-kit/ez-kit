import { SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'
import { useEffect, useState } from 'react'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { GridMenuVariant } from '../menu'
import {
	COL_PINNING_KEY,
	DEFAULT_FILTER_DEBOUNCE_MS,
	FILTERING_DEBOUNCE_KEY,
	FILTERING_VARIANT_KEY,
} from '../use-data-grid'
import { getCommonPinStyles } from '../utils/pin-styles'

import { buildColumnMenuSections } from './column-menu-sections'
import { flexRender } from './flex-render'
import { renderFilterInput } from './render-filter-input'
import { useDataGridInstance, useDataGridStore } from './table-context'

import type { KeyboardEvent } from 'react'

type HeaderProps = {
	/** When true, adds `data-sticky="true"` to the thead for structural CSS targeting. */
	stickyHeader?: boolean
}

/**
 * Publishes the rendered thead height as `--dg-header-height` on the table wrapper so pinned-top
 * rows can be offset below the sticky header (consumed by the structural stylesheet).
 *
 * Measures through a ref rather than by querying the DOM for the thead: a kit may commit its
 * header in a later pass than the one that mounts this component — HeroUI builds it through a
 * react-aria collection — and a query that runs too early finds nothing and never retries (#140).
 * The ref lands in state so the effect re-runs whenever the element actually attaches.
 *
 * Returns the ref callback to hand to the thead. No-op when sticky header is disabled.
 */
function useHeaderHeightVar(enabled: boolean): (node: HTMLTableSectionElement | null) => void {
	const [thead, setThead] = useState<HTMLTableSectionElement | null>(null)

	useEffect(() => {
		if (!enabled || !thead) return
		const wrapper = thead.closest("[data-slot='table-wrapper']")
		if (!(wrapper instanceof HTMLElement)) return

		const update = () => {
			wrapper.style.setProperty('--dg-header-height', `${String(thead.offsetHeight)}px`)
		}
		update()
		const ro = new ResizeObserver(update)
		ro.observe(thead)
		return () => {
			ro.disconnect()
			wrapper.style.removeProperty('--dg-header-height')
		}
	}, [enabled, thead])

	return setThead
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
	const theadRef = useHeaderHeightVar(Boolean(stickyHeader))
	const instance = useDataGridInstance()
	const table = instance.table

	// Narrow subscriptions: re-render only when slices the header actually
	// reflects change. Editing, expanded, pagination, rowPinning do NOT
	// touch any of these, so clicking Edit on a row leaves the header
	// untouched.
	useDataGridStore((s) => s.sorting)
	useDataGridStore((s) => s.columnFilters)
	useDataGridStore((s) => s.columnVisibility)
	useDataGridStore((s) => s.columnPinning)
	useDataGridStore((s) => s.columnSizing)
	useDataGridStore((s) => s.columnSizingInfo)
	useDataGridStore((s) => s.rowSelection)

	const gridComponents = useGridComponents()
	const { Thead, Tr, Th, Input, Checkbox } = gridComponents.core
	const { Resizer } = gridComponents.resizing
	const { SortIndicator } = gridComponents.sorting
	const { Menu } = gridComponents.core
	const { OperatorSelect, BetweenInput, FilterPopover, MultiSelectFilter } = gridComponents.filtering
	const cellTypes = useCellTypes()
	const hasFiltering = Boolean(table.options.getFilteredRowModel)
	const colPinEnabled = (table as unknown as Record<symbol, unknown>)[COL_PINNING_KEY] as boolean | undefined
	const filteringVariant = (table as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY] as
		| 'inline'
		| 'popover'
		| 'panel'
		| undefined
	const filteringDebounce =
		((table as unknown as Record<symbol, unknown>)[FILTERING_DEBOUNCE_KEY] as number | undefined) ??
		DEFAULT_FILTER_DEBOUNCE_MS

	return (
		<Thead
			ref={theadRef}
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

						const colPinDef = meta?.columnPinning
						const isStaticPin = typeof colPinDef === 'object' && colPinDef.pin !== undefined
						const isPinningDisabled = colPinDef === false
						const isMenuEligible = !meta?.isSystemColumn && !header.isPlaceholder

						const menuSections = buildColumnMenuSections(header, {
							canSort: canSort && !header.isPlaceholder,
							canPin: Boolean(colPinEnabled) && isMenuEligible && !isPinningDisabled && !isStaticPin,
							canHide: isMenuEligible && header.column.getCanHide(),
						})
						const hasSections = menuSections.length > 0

						// Selection column: render select-all checkbox
						if (header.column.id === SELECTION_COLUMN_ID) {
							const isAllSelected = table.getIsAllRowsSelected()
							const isSomeSelected = table.getIsSomeRowsSelected()
							return (
								<Th
									data-slot='th'
									data-slot-selection-th='true'
									data-column-id={header.column.id}
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
								data-column-id={header.column.id}
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
												debounce: filteringDebounce,
											})
										: null
									const sortDirAttr: 'asc' | 'desc' | 'none' =
										sortDir === 'asc' || sortDir === 'desc' ? sortDir : 'none'
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
													<SortIndicator
														sortDir={sortDir}
														canSort={canSort}
													/>
												</div>
												{filteringVariant === 'popover' && canFilter && (
													<FilterPopover hasActiveFilter={Boolean(header.column.getFilterValue())}>
														{filterContent}
													</FilterPopover>
												)}
												{hasSections && (
													<Menu
														variant={GridMenuVariant.Column}
														sections={menuSections}
														aria-label='Column options'
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
