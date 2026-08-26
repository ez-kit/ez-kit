import { SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { GridMenuVariant } from '../menu'
import { getCommonPinStyles } from '../utils/pin-styles'

import { buildColumnMenuSections } from './column-menu-sections'
import { flexRender } from './flex-render'
import { renderFilterInput } from './render-filter-input'
import { useDataGridInstance } from './table-context'

import type { DataTable } from '@ez-kit/data-grid-core'
import type { Column, Header } from '@tanstack/table-core'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

/** Sort direction as the header reports it — `'none'` rather than `false`, so it reads in JSX. */
export type HeaderSortDirection = 'asc' | 'desc' | 'none'

/**
 * What a `<DataGrid.HeaderCell>` render function receives.
 *
 * The ready-made pieces (`label`, `sortTrigger`, `menu`, `filter`, `resizer`) are the default
 * header's own parts, already wired. They exist so a custom header cell can keep the parts it
 * still wants instead of re-implementing sorting, the column menu and the filter control from
 * scratch — and so it can place its own controls **outside** `sortTrigger`.
 */
export type DataGridHeaderCellRenderArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	column: Column<any>
	canSort: boolean
	sortDirection: HeaderSortDirection
	/** The column's own `header` content, with no sorting behaviour attached. */
	label: ReactNode
	/** `label` plus the sort indicator, wrapped in the clickable sort affordance. */
	sortTrigger: ReactNode
	/** The column overflow menu (sort / pin / hide), or `null` when it has no sections. */
	menu: ReactNode
	/** The column's filter control, or `null` when this column is not filterable. */
	filter: ReactNode
	/** The resize handle, or `null` when the column cannot be resized. */
	resizer: ReactNode
}

export type DataGridHeaderCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>
	/**
	 * Custom content for this one header cell, rendered inside the kit's `Th` — so the cell keeps
	 * its pinning offset, its `data-*` attributes, its `headerClassName` and its resize handle.
	 *
	 * Omit it for the built-in header: sort affordance, column menu, and the inline or popover
	 * filter control. The render-function form hands back those same parts
	 * ({@link DataGridHeaderCellRenderArgs}) so a custom cell can reuse the ones it still wants.
	 */
	children?: ReactNode | ((args: DataGridHeaderCellRenderArgs) => ReactNode)
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

/** Elements that own their click, so the sort affordance must not also fire. */
const INTERACTIVE_SELECTOR = 'button, a[href], input, select, textarea, label, [role="button"], [role="link"]'

/**
 * Whether a click originated inside something interactive that the consumer put in the header.
 *
 * The column's `header` content sits inside the sort affordance, because clicking a column's name
 * to sort it is how every table works. That made any button or link placed there fire the sort as
 * well — the click bubbled straight into the handler. Ignoring clicks that start on an interactive
 * descendant keeps both behaviours: the name still sorts, a control in the header does not.
 */
function isInteractiveTarget(event: MouseEvent | KeyboardEvent): boolean {
	const target = event.target
	if (!(target instanceof Element)) return false
	const interactive = target.closest(INTERACTIVE_SELECTOR)
	return interactive !== null && interactive !== event.currentTarget
}

/**
 * One header cell: the `<th>`, its sort affordance, filter control, column menu and resize handle.
 *
 * Split out of `Header` so a custom header can replace a single column's cell and keep the
 * default for every other — the same ladder `DataGrid.Row` / `DataGrid.Cell` give the body.
 * Rendering it requires the surrounding `<DataGrid.Header>`, which owns the state subscriptions
 * these cells read through.
 */
export function DataGridHeaderCell({ header, children }: DataGridHeaderCellProps) {
	const instance = useDataGridInstance()
	const table = instance.table
	const gridComponents = useGridComponents()
	const { Th, Input, Checkbox, Menu } = gridComponents.core
	const { Resizer } = gridComponents.resizing
	const { SortIndicator } = gridComponents.sorting
	const { OperatorSelect, BetweenInput, FilterPopover, MultiSelectFilter } = gridComponents.filtering
	const cellTypes = useCellTypes()

	const meta = header.column.columnDef.meta
	const canSort = header.column.getCanSort()
	const sortDir = header.column.getIsSorted()
	const pinVars = getCommonPinStyles(header.column)
	const pinned = header.column.getIsPinned()
	const canResize = Boolean(table.options.enableColumnResizing) && header.column.getCanResize()

	// Selection column: a select-all checkbox, and none of the rest.
	if (header.column.id === SELECTION_COLUMN_ID) {
		const isAllSelected = table.getIsAllRowsSelected()
		const isSomeSelected = table.getIsSomeRowsSelected()
		return (
			<Th
				data-slot='th'
				data-slot-selection-th='true'
				data-column-id={header.column.id}
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

	const rawSortHandler = canSort ? header.column.getToggleSortingHandler() : undefined
	const sortHandler = rawSortHandler
		? (e: MouseEvent) => {
				if (isInteractiveTarget(e)) return
				rawSortHandler(e)
			}
		: undefined
	const onSortKeyDown = rawSortHandler
		? (e: KeyboardEvent) => {
				if (e.key !== 'Enter' && e.key !== ' ') return
				if (isInteractiveTarget(e)) return
				e.preventDefault()
				rawSortHandler(e)
			}
		: undefined

	const colPinDef = meta?.columnPinning
	const isStaticPin = typeof colPinDef === 'object' && colPinDef.pin !== undefined
	const isPinningDisabled = colPinDef === false
	const isMenuEligible = !meta?.isSystemColumn && !header.isPlaceholder

	const draftSortIndex = computeDraftSortIndex(table, header.column.id)
	const draftSortAttrs = draftSortIndex >= 0 ? { 'data-draft-sorting': String(draftSortIndex) } : {}

	const menuSections = buildColumnMenuSections(header, {
		canSort: canSort && !header.isPlaceholder,
		canPin: table.grid.columnPinning && isMenuEligible && !isPinningDisabled && !isStaticPin,
		canHide: isMenuEligible && header.column.getCanHide(),
	})

	const filteringVariant = table.grid.filtering.variant
	const canFilter =
		Boolean(table.options.getFilteredRowModel) &&
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
				debounce: table.grid.filtering.debounce,
				table,
			})
		: null

	const sortDirection: HeaderSortDirection = sortDir === 'asc' || sortDir === 'desc' ? sortDir : 'none'
	const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())

	const sortTrigger = (
		<div
			data-slot='sort-trigger'
			{...(canSort ? { 'data-sortable': 'true', 'data-sort-direction': sortDirection } : {})}
			role={canSort ? 'button' : undefined}
			tabIndex={canSort ? 0 : undefined}
			onClick={sortHandler}
			onKeyDown={onSortKeyDown}
		>
			{label}
			<SortIndicator
				sortDir={sortDir}
				canSort={canSort}
			/>
		</div>
	)

	const menu =
		menuSections.length > 0 ? (
			<Menu
				variant={GridMenuVariant.Column}
				sections={menuSections}
				aria-label='Column options'
			/>
		) : null

	const resizer = canResize ? (
		<Resizer
			onMouseDown={header.getResizeHandler()}
			onTouchStart={header.getResizeHandler()}
			onDoubleClick={() => {
				header.column.resetSize()
			}}
			isResizing={header.column.getIsResizing()}
		/>
	) : null

	const defaultContent = (
		<>
			<div data-slot='header-main'>
				{sortTrigger}
				{filteringVariant === 'popover' && canFilter && (
					<FilterPopover hasActiveFilter={Boolean(header.column.getFilterValue())}>{filterContent}</FilterPopover>
				)}
				{menu}
			</div>
			{filteringVariant !== 'popover' && canFilter && <div data-slot='header-extras'>{filterContent}</div>}
		</>
	)

	const content =
		children === undefined
			? defaultContent
			: typeof children === 'function'
				? children({
						header,
						column: header.column,
						canSort,
						sortDirection,
						label,
						sortTrigger,
						menu,
						filter: filterContent,
						resizer,
					})
				: children

	return (
		<Th
			data-slot='th'
			data-column-id={header.column.id}
			colSpan={header.colSpan}
			style={pinVars}
			pinned={pinned}
			{...(meta?.headerClassName !== undefined ? { className: meta.headerClassName } : {})}
			{...(pinned ? { 'data-pinned': pinned } : {})}
			{...(canResize ? { 'data-resizable': 'true' } : {})}
			{...draftSortAttrs}
		>
			{content}
			{resizer}
		</Th>
	)
}
