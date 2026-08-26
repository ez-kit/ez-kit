import { SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'
import { useEffect, useState } from 'react'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { GridMenuVariant } from '../menu'
import { getCommonPinStyles } from '../utils/pin-styles'

import { buildColumnMenuSections } from './column-menu-sections'
import { flexRender } from './flex-render'
import { renderFilterInput } from './render-filter-input'
import { useDataGridInstance, useDataGridStore } from './table-context'

import type { DataTable } from '@ez-kit/data-grid-core'
import type { HeaderGroup } from '@tanstack/table-core'
import type { KeyboardEvent, ReactNode } from 'react'

export type DataGridHeaderProps = {
	/**
	 * Adds `data-sticky="true"` to the thead for structural CSS targeting.
	 *
	 * Omit it — the default — and the flag is read from the grid's own `layout.stickyHeader`
	 * option. The prop exists only to force the value; without that fallback a
	 * `<DataGrid.Header />` placed inside a custom `<DataGrid.Table>` body would
	 * silently lose sticky positioning.
	 */
	stickyHeader?: boolean
	/**
	 * Custom header content, rendered inside the kit's `<Thead>` — so sticky positioning and
	 * the measured header-height CSS variable still apply.
	 *
	 * Omit it for the built-in header rows: sort affordances, the column menu, resize
	 * handles and the inline / popover filter controls. Supplying `children` opts out of all
	 * of that in exchange for full control over the markup.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Header>
	 *   {({ headerGroups }) =>
	 *     headerGroups.map((group) => (
	 *       <tr key={group.id}>
	 *         {group.headers.map((header) => <th key={header.id}>{header.column.id}</th>)}
	 *       </tr>
	 *     ))
	 *   }
	 * </DataGrid.Header>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridHeaderRenderArgs) => ReactNode)
}

/** What a `<DataGrid.Header>` render function receives. */
export type DataGridHeaderRenderArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: DataTable<any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	headerGroups: HeaderGroup<any>[]
}

/**
 * Position of `columnId` in the not-yet-applied sort under `deferredApply`, or `-1` when the
 * column isn't part of a pending sort.
 *
 * Compares the draft entry at each index against the applied entry at the same index — not a
 * global "something is dirty" check — so a column whose own sort is unchanged stays unmarked
 * even while a sibling column's sort (or an unrelated filter) is pending.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeDraftSortIndex(table: DataTable<any>, columnId: string): number {
	if (table.options.deferredApply !== true) return -1
	const draftSorting = table.draft.get().sorting
	const appliedSorting = table.getState().applied.sorting
	const draftIndex = draftSorting.findIndex((s) => s.id === columnId)
	if (draftIndex < 0) return -1
	const draftEntry = draftSorting[draftIndex]
	const appliedEntry = appliedSorting[draftIndex]
	const unchanged = appliedEntry?.id === draftEntry?.id && appliedEntry?.desc === draftEntry?.desc
	return unchanged ? -1 : draftIndex
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
 * - `data-draft-sorting="<index>"` on a `<th>` whose sort is pending under `deferredApply`
 *   (the column's position in the not-yet-applied sort array)
 *
 * Pin offsets are written as CSS variables via {@link getCommonPinStyles}; the
 * structural CSS reads them on `[data-pinned]` elements.
 */
export function Header({ stickyHeader, children }: DataGridHeaderProps = {}) {
	const instance = useDataGridInstance()
	const table = instance.table
	const isSticky = stickyHeader ?? table.grid.layout.stickyHeader
	const theadRef = useHeaderHeightVar(isSticky)

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
	const colPinEnabled = table.grid.columnPinning
	const filteringVariant = table.grid.filtering.variant
	const filteringDebounce = table.grid.filtering.debounce

	if (children !== undefined) {
		return (
			<Thead
				ref={theadRef}
				data-slot='thead'
				{...(isSticky ? { 'data-sticky': 'true' } : {})}
			>
				{typeof children === 'function' ? children({ table, headerGroups: table.getHeaderGroups() }) : children}
			</Thead>
		)
	}

	return (
		<Thead
			ref={theadRef}
			data-slot='thead'
			{...(isSticky ? { 'data-sticky': 'true' } : {})}
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

						const draftSortIndex = computeDraftSortIndex(table, header.column.id)
						const draftSortAttrs = draftSortIndex >= 0 ? { 'data-draft-sorting': String(draftSortIndex) } : {}

						const menuSections = buildColumnMenuSections(header, {
							canSort: canSort && !header.isPlaceholder,
							canPin: colPinEnabled && isMenuEligible && !isPinningDisabled && !isStaticPin,
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
								{...draftSortAttrs}
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
												table,
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
