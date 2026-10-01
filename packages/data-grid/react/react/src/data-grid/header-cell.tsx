import {
	canMoveColumn,
	ColumnMoveDirection,
	GridDirection,
	moveColumn,
	SELECTION_COLUMN_ID,
	SystemColumnType,
} from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { GridMenuVariant } from '../menu'
import { ColumnSortDirection, SortDirection } from '../types'
import { filtersRows } from '../utils/filters-rows'
import { getCommonPinStyles } from '../utils/pin-styles'
import { isTextEntryTarget } from '../utils/text-entry-target'
import { getVisualLeafColumns } from '../utils/visual-column-order'

import { getAlignAttrs } from './align-attrs'
import { ariaSortAttrs } from './aria-state'
import { ColumnDragShell } from './column-drag'
import { ColumnDragHandle } from './column-drag-handle'
import { buildColumnMenuSections } from './column-menu-sections'
import { HeaderCellProvider } from './composition-context'
import { useDndEnabled } from './dnd'
import { COLUMN_DRAGGING_SELECTOR } from './dnd/dragging-attrs'
import { flexRender } from './flex-render'
import { HeaderExtras, HeaderMain } from './header-slots'
import { useCellNavigationProps } from './keyboard-navigation'
import { renderFilterInput } from './render-filter-input'
import { useDataGridTable } from './table-context'
import { VisuallyHidden } from './visually-hidden'

import type { HeaderThProps } from './column-drag'
import type { ErasedRow, DataTable, GridFeatures } from '../types'
import type { FormColumnMeta } from '@ez-kit/data-grid-core'
import type { Column, Header } from '@tanstack/table-core'
import type { KeyboardEvent, ReactElement, ReactNode } from 'react'

/**
 * What a `<DataGrid.HeaderCell>` render function receives.
 *
 * The ready-made pieces (`label`, `sortTrigger`, `menu`, `filter`, `resizer`) are the default
 * header's own parts, already wired. They exist so a custom header cell can keep the parts it
 * still wants instead of re-implementing sorting, the column menu and the filter control from
 * scratch — and so it can place its own controls **outside** `sortTrigger`.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.HeaderCell<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridHeaderCellRenderArgs<TRow extends object = ErasedRow> = {
	header: Header<GridFeatures, TRow>
	column: Column<GridFeatures, TRow>
	canSort: boolean
	sortDirection: ColumnSortDirection
	/** The column's own `header` content, with no sorting behaviour attached. */
	label: ReactNode
	/** `label` plus the sort indicator, wrapped in the clickable sort affordance. */
	sortTrigger: ReactNode
	/** The column overflow menu (sort / pin / hide), or `null` when it has no sections. */
	menu: ReactNode
	/**
	 * The column's filter control, ready to render inline in the cell. `null` when this column
	 * is not filterable.
	 *
	 * Rendering it — or not — is what puts a filter in the header, which is what the removed
	 * `filtering.variant: 'panel'` used to say. Rendering it **and** mounting
	 * `<DataGrid.FilterPanel/>` gives both at once: two controls bound to one `columnFilters`
	 * entry, which no value of that enum could express.
	 */
	filter: ReactNode
	/**
	 * The same control behind the kit's `FilterPopover` trigger — an icon in the header that
	 * opens the input. `null` when this column is not filterable.
	 *
	 * The replacement for `filtering.variant: 'popover'`. Render this instead of
	 * {@link DataGridHeaderCellRenderArgs.filter}, never both: they are one control in two
	 * presentations, and the pair would field the same filter value twice.
	 */
	filterPopover: ReactNode
	/** The resize handle, or `null` when the column cannot be resized. */
	resizer: ReactNode
	/**
	 * The column's drag handle, ready to place — or `null` when this column cannot be dragged (no
	 * adapter bound with `createDataGrid({ dnd })`, column ordering off, a system column,
	 * `ordering: false`, or a header that is not a leaf).
	 *
	 * An element rather than a ref, exactly as {@link sortTrigger} and {@link resizer} are: a call
	 * site decides *where* it goes, never how it is wired. `<DataGrid.ColumnDragHandle />` is the
	 * same handle reached from a header cell body that reads `useDataGridHeaderCell()` instead.
	 *
	 * The resizer stays its own activator — a drag starts from this element and nothing else, which
	 * is what keeps a pointer on the resizer resizing and a keyboard pickup away from the sort
	 * affordance.
	 *
	 * There is no `isDragging` beside it, unlike a row's render arguments: the sortable lives in the
	 * shell that renders the `<th>`, not in this component, so the boolean is not knowable here. The
	 * `<th>` carries `data-column-dragging`, and `useColumnDrag()` is the public read — see
	 * `column-drag.tsx` for why the shell owns it.
	 */
	dragHandle: ReactNode
}

export type DataGridHeaderCellProps<TRow extends object = ErasedRow> = {
	header: Header<GridFeatures, TRow>
	/**
	 * Custom content for this one header cell, rendered inside the kit's `Th` — so the cell keeps
	 * its pinning offset, its `data-*` attributes, its `headerClassName` and its resize handle.
	 *
	 * Omit it for the built-in header: sort affordance, column menu, and the column's filter
	 * control inline under the label. The render-function form hands back those same parts
	 * ({@link DataGridHeaderCellRenderArgs}) so a custom cell can reuse the ones it still wants
	 * — and `filterPopover` beside `filter`, for the popover presentation.
	 */
	children?: ReactNode | ((args: DataGridHeaderCellRenderArgs<TRow>) => ReactNode)
}

/**
 * Position of `columnId` in the not-yet-applied sort under `draft`, or `-1` when the
 * column isn't part of a pending sort.
 *
 * Compares the draft entry at each index against the applied entry at the same index — not a
 * global "something is dirty" check — so a column whose own sort is unchanged stays unmarked
 * even while a sibling column's sort (or an unrelated filter) is pending.
 */
function computeDraftSortIndex<TRow extends object>(table: DataTable<GridFeatures, TRow>, columnId: string): number {
	if (table.options.draft !== true) return -1
	const draftSorting = table.draft.get().sorting
	// A snapshot read, not a subscription — the v8 line read `applied.sorting` off the whole snapshot
	// and this is the same read against v9's store. `<DataGrid.Header>` owns the subscriptions
	// these cells re-render through, and `applied` is not among them: what actually drives this
	// marker is `state.sorting`, which the header does subscribe to and which moves on every
	// draft edit. Making this a subscription would add one subscriber per column and is a
	// render-behaviour change, so it is deliberately not done here.
	const appliedSorting = table.store.state.applied.sorting
	const draftIndex = draftSorting.findIndex((s) => s.id === columnId)
	if (draftIndex < 0) return -1
	const draftEntry = draftSorting[draftIndex]
	const appliedEntry = appliedSorting[draftIndex]
	const unchanged = appliedEntry?.id === draftEntry?.id && appliedEntry?.desc === draftEntry?.desc
	return unchanged ? -1 : draftIndex
}

/** Elements that own their click, so the sort affordance must not also fire. */
/**
 * One header cell: the `<th>`, its sort affordance, filter control, column menu and resize handle.
 *
 * Split out of `Header` so a custom header can replace a single column's cell and keep the
 * default for every other — the same ladder `DataGrid.Row` / `DataGrid.Cell` give the body.
 * Rendering it requires the surrounding `<DataGrid.Header>`, which owns the state subscriptions
 * these cells read through.
 */

export function DataGridHeaderCell<TRow extends object = ErasedRow>({
	header,
	children,
}: DataGridHeaderCellProps<TRow>) {
	const table = useDataGridTable<TRow>()
	const gridComponents = useGridComponents()
	const { Th, Input, Checkbox, Menu } = gridComponents.core
	const { Resizer } = gridComponents.resizing
	const { SortIndicator } = gridComponents.sorting
	const { OperatorSelect, BetweenInput, FilterPopover, MultiSelectFilter, ClearFilterButton } = gridComponents.filtering
	const cellTypes = useCellTypes()
	const navigationProps = useCellNavigationProps('columnheader')

	// `ColumnMeta` is declared `in out` in both its `TFeatures` and its `TData` upstream, so no
	// concrete instantiation is assignable to any other and this cast is forced by the variance
	// annotation rather than chosen. `FormColumnMeta` is the one name core declares for it, and
	// this is the same cast core's own `creating.ts` makes at its boundary.
	const meta = header.column.columnDef.meta as FormColumnMeta | undefined
	// Optional-called, not called: every read on this line runs for **every header cell of every
	// grid**, and the method only exists once its feature is registered. Design D1's claim is that
	// a feature you did not register costs nothing, so a grid with no sorting must render a header
	// rather than throw. See `feature-optionality.test.tsx`, which builds a grid without each one.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const canSort = header.column.getCanSort?.() ?? false
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const rawSortDir = header.column.getIsSorted?.() ?? false
	const pinVars = getCommonPinStyles(header.column)
	const pinned = header.column.getIsPinned()
	// One check, not two: `createTable` now emits `enableColumnResizing: false` when the feature
	// is off, so `getCanResize()` accounts for the table-level gate as well as the column's own
	// `resizing: false`. Anything composing its own header can rely on the same single call.
	//
	// Optional-called for the same reason as the two above. This is also what makes
	// `getResizeHandler()` and `getIsResizing()` below safe without guards of their own: both sit
	// inside the `canResize ? … : null` subtree, which a grid without the feature never enters.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const canResize = header.column.getCanResize?.() ?? false
	const isDndEnabled = useDndEnabled()

	const colPinDef = meta?.pinning
	const isStaticPin = typeof colPinDef === 'object' && colPinDef.side !== undefined
	const isPinningDisabled = colPinDef === false
	const isMenuEligible = !meta?.isSystemColumn && !header.isPlaceholder

	// One flag for all three affordances the feature has — the menu pair, the keyboard shortcut and
	// the drag handle — so they can never disagree about whether this column may move. Read above
	// the selection-column branch below because the drag registration needs it there too: a system
	// column takes part in the drag's index space as a *disabled* item, never as an absent one.
	const canMove = table.grid.ordering.column && isMenuEligible && meta?.ordering !== false

	/**
	 * Whether this header cell registers a draggable, and at which index.
	 *
	 * Only the bottom header row's real leaf headers take part: a column group has sub-headers, and
	 * a placeholder stands in for a leaf that renders its real header in another row — neither is a
	 * member of the leaf order the index counts in. An item registered outside that order breaks the
	 * order's **density**, which silently kills the drag for the whole axis; `column-drag.tsx` has
	 * the measurement.
	 *
	 * The order is the *visual* one, because that is the order the header rows render in and the
	 * order a drop has to be resolved against. `getVisibleLeafColumns()` keeps the declaration order
	 * and ignores pinning — see `getVisualLeafColumns`' docblock.
	 *
	 * A `-1` means this cell was rendered for a column the visual leaf list does not contain, which
	 * a hand-written `<DataGrid.Header>` can do. Such a cell stays out of the drag rather than
	 * registering a negative index.
	 */
	const isLeafHeader = header.subHeaders.length === 0 && !header.isPlaceholder
	/*
	 * Gated on `isDndEnabled` first, and that is a performance requirement rather than tidiness:
	 * `getVisualLeafColumns` builds a fresh three-part array and this scans it, once per header
	 * cell — O(n²) per header render. A grid with no drag adapter must not pay that, which is most
	 * grids. Skipping it also skips mounting the shell below, so such a grid renders the bare `Th`
	 * it rendered before this phase; the phase-2 identical-DOM test compares against exactly that.
	 */
	const visualIndex =
		isDndEnabled && isLeafHeader
			? getVisualLeafColumns(table).findIndex((column) => column.id === header.column.id)
			: -1
	const isDragParticipant = visualIndex >= 0

	/**
	 * The `<th>`, through the drag shell when this cell takes part and bare when it does not.
	 *
	 * A closure rather than a branch at each return, because both returns below — the selection
	 * column's and the composed one — need the same choice made the same way.
	 */
	const renderTh = (thProps: HeaderThProps, inner: ReactNode): ReactElement =>
		isDragParticipant ? (
			<ColumnDragShell
				columnId={header.column.id}
				index={visualIndex}
				disabled={!canMove}
				thProps={thProps}
			>
				{inner}
			</ColumnDragShell>
		) : (
			<Th {...thProps}>{inner}</Th>
		)

	// Selection column: a select-all checkbox, and none of the rest.
	if (header.column.id === SELECTION_COLUMN_ID) {
		const isAllSelected = table.getIsAllRowsSelected()
		const isSomeSelected = table.getIsSomeRowsSelected()
		// Under `selection.multi: false` only one row can be selected at a time, so a select-all
		// control has nothing to select — the header cell stays empty but keeps its width.
		const canSelectAll = table.options.enableMultiRowSelection !== false
		/*
		 * Routed through `renderTh` like the composed cell, and for one reason: the selection column
		 * is a visible leaf, so it **occupies an index** in the drag's order. Rendering a bare `Th`
		 * here would leave a hole at index 0 of nearly every grid, and the drag would silently stop
		 * working — `column-drag.tsx` has the measurement. It registers disabled, since a system
		 * column is never movable.
		 */
		return renderTh(
			{
				...navigationProps,
				'data-slot': 'th',
				'data-slot-selection-th': 'true',
				'data-column-id': header.column.id,
				colSpan: header.colSpan,
				style: pinVars,
				pinned,
				...(pinned ? { 'data-pinned': pinned } : {}),
				...getAlignAttrs(meta, 'header'),
			},
			<>
				{/* An explicit `selection.column.header` replaces the select-all checkbox — the
				    only thing worth putting there instead, and what a grid with
				    `selection.multi: false` (which renders no checkbox anyway) wants. */}
				{meta?.systemHeader !== undefined && flexRender(meta.systemHeader, header.getContext())}
				{meta?.systemHeader === undefined && !canSelectAll && (
					<VisuallyHidden>{table.grid.messages.selection.columnHeader}</VisuallyHidden>
				)}
				{meta?.systemHeader === undefined && canSelectAll && (
					<Checkbox
						value={isAllSelected}
						indeterminate={isSomeSelected && !isAllSelected}
						onChange={() => {
							table.toggleAllRowsSelected(!isAllSelected)
						}}
						aria-label={table.grid.messages.selection.selectAll}
					/>
				)}
			</>,
		)
	}

	// A real `<button>` below, so a click means sort and there is nothing to ask about its
	// target. That replaced a `role='button'` div plus a predicate dropping any click that
	// started on an interactive descendant — a guard for controls a consumer put in
	// `column.header`, which could not tell one from the kit's own sort arrow, and so made the
	// arrow (sitting at the header's centre, where a pointer lands) dead.
	const sortHandler = canSort ? header.column.getToggleSortingHandler() : undefined

	/**
	 * `Enter` / `Space`, which a `<button>` ought to give us for free — and does, in the shadcn
	 * kit. **HeroUI cancels it.** Its `Th` comes from React Aria's table, whose grid keyboard
	 * manager calls `preventDefault()` on the bubbling keydown, and a cancelled keydown performs
	 * no activation, so the button never sees a click. Probed rather than assumed: a listener on
	 * the button reads `defaultPrevented === false` and one on `document` reads `true` for the
	 * same event, i.e. the cancel happens above us on the way up.
	 *
	 * So the chord is handled here, at the target, where it still arrives intact. `preventDefault`
	 * is what keeps this to **one** sort where the default action does survive: it suppresses the
	 * activation click the browser would synthesise afterwards.
	 *
	 * Deliberately nothing but the two keys — no question about where the event started. That
	 * predicate is what this change removed, and it is not needed: nothing interactive may live
	 * inside the affordance.
	 */
	const onSortKeyDown = sortHandler
		? (e: KeyboardEvent) => {
				if (e.key !== 'Enter' && e.key !== ' ') return
				e.preventDefault()
				sortHandler(e)
			}
		: undefined

	const draftSortIndex = computeDraftSortIndex(table, header.column.id)
	const draftSortAttrs = draftSortIndex >= 0 ? { 'data-draft-sorting': String(draftSortIndex) } : {}

	/**
	 * `Alt+ArrowLeft` / `Alt+ArrowRight` move the column one step.
	 *
	 * The menu pair is the discoverable affordance, but both kits' menus close on select, so a
	 * column that has to travel five places would mean five open-click cycles. The shortcut is
	 * the repeatable path, and it is also the keyboard equivalent a drag handle will need
	 * anyway (WCAG 2.1.1).
	 *
	 * Physical arrow keys, logical move: under RTL `ArrowLeft` is the *end* of the order, which
	 * is what the arrow points at on screen either way.
	 */
	const onHeaderKeyDown = canMove
		? (e: KeyboardEvent) => {
				if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
				/*
				 * This column is being dragged, **by any means**: the drag owns it until it is
				 * dropped, and reordering it from under a live gesture is not an alternative worth
				 * offering — the position the user is dragging towards is the one that counts.
				 *
				 * During a *keyboard* drag that also removes a real double-move, since dnd-kit's
				 * sensor takes the same arrows. During a *pointer* drag the sensor is idle for
				 * keystrokes (`@dnd-kit/dom@0.1.21`, `index.js:1611` — it refuses while an
				 * operation is non-idle), so the chord is dropped with nothing replacing it: the
				 * accepted trade, not an oversight.
				 *
				 * Asked of the DOM rather than of `useColumnDrag()`, which is **unreachable from
				 * here**: `ColumnDragShell` renders the `<th>` and puts `ColumnDragContext.Provider`
				 * inside it, around the children — and this handler is a prop of that same `<th>`,
				 * so it is written one level above the context it would read. Hoisting the sortable
				 * out of the shell to fix that is what the shell's own docblock explains cannot be
				 * done: a header cell is one component for a leaf, a group and a placeholder, and
				 * only the leaf may register.
				 *
				 * So the handler asks the event where it came from. `closest()` is narrow by
				 * construction — true only for a keystroke that started inside the column actually
				 * being dragged, never for a drag elsewhere in the grid, which a root-wide
				 * `querySelector` like the focus model's could not distinguish.
				 *
				 * Like the focus model's gate, this cannot be folded in with the chord check: that
				 * one is two cheap property reads and must stay in front of the DOM walk.
				 */
				if (e.target instanceof Element && e.target.closest(COLUMN_DRAGGING_SELECTOR) !== null) return
				// Option+Arrow moves by word inside a text field, and opens a native select —
				// never steal it from the filter input living in this `<th>`. Only a control that
				// owns the chord keeps it; a button or a checkbox does not.
				if (isTextEntryTarget(e)) return
				// The grid's own direction, never `table.options.columnResizeDirection`: that option
				// is declared on `TableOptions_ColumnResizing` and core writes it only inside its
				// resizing branch, so on the default grid — ordering on, resizing off — it is
				// `undefined` and both shortcuts moved the column the wrong way under RTL.
				const towardsStart = (e.key === 'ArrowLeft') !== (table.grid.direction === GridDirection.Rtl)
				const direction = towardsStart ? ColumnMoveDirection.Start : ColumnMoveDirection.End
				if (!canMoveColumn(table, header.column.id, direction)) return
				e.preventDefault()
				table.setColumnOrder(moveColumn(table, header.column.id, direction))
			}
		: undefined

	const menuSections = buildColumnMenuSections(
		header,
		{
			canSort: canSort && !header.isPlaceholder,
			canPin: table.grid.pinning.column && isMenuEligible && !isPinningDisabled && !isStaticPin,
			canHide: isMenuEligible && header.column.getCanHide(),
			canMove,
			// `getCanGroup()` answers both halves at once — the table-level `grouping` gate that
			// core resolves to `enableGrouping`, and the column's own `grouping: false`. Absent
			// without `columnGroupingFeature`, so optional-called like every other feature read on
			// this path; see `feature-optionality.test.tsx`.
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
			canGroup: isMenuEligible && (header.column.getCanGroup?.() ?? false),
		},
		table.grid.messages.columnMenu,
	)

	// Genuinely filterable — nothing here asks *where* the control goes. The expression carried
	// a `variant !== 'panel'` term, which forced `filter` to `null` for every caller whenever one
	// grid-wide option said the panel owned the controls; a render function then had no filter to
	// place even when it wanted one in the header.
	const canFilter =
		filtersRows(table) && meta?.filtering !== false && !meta?.isSystemColumn && header.column.getCanFilter()
	const filterContent = canFilter
		? renderFilterInput({
				header,
				meta,
				Input,
				cellTypes,
				OperatorSelect,
				Menu,
				ClearFilterButton,
				BetweenInput,
				MultiSelectFilter,
				debounce: table.grid.filtering.debounce,
				messages: table.grid.messages,
				table,
			})
		: null

	const sortDirection: ColumnSortDirection =
		rawSortDir === SortDirection.Asc || rawSortDir === SortDirection.Desc ? rawSortDir : ColumnSortDirection.None
	// System columns carry their header on `meta.systemHeader` rather than TanStack's `header`,
	// which the grid keeps for itself (the selection column renders a select-all checkbox
	// there). Falling back to `columnDef.header` keeps every ordinary column unchanged.
	const headerSlot = meta?.systemHeader ?? header.column.columnDef.header
	const rendered = header.isPlaceholder ? null : flexRender(headerSlot, header.getContext())
	/**
	 * The expand and row-actions columns carry chevrons and menus, and `buildSystemColumn` gives
	 * them `header: () => null` — so without this the `<th>` has no accessible name at all, which
	 * is axe's `empty-table-header`, reported in both kits.
	 *
	 * Keyed on `systemHeader` being unwritten rather than on the rendered output being empty: the
	 * built-in `() => null` goes through `flexRender`, which hands back an element that renders
	 * nothing rather than `null`, so there is nothing to test the output against. `systemHeader`
	 * is the consumer's `expanding.column.header` / `rowActions.column.header`, and a consumer who
	 * wrote one replaces this — the same rule, and the same expression, as the select-all branch
	 * above.
	 */
	const systemColumnName =
		meta?.systemHeader !== undefined
			? undefined
			: meta?.systemColumnType === SystemColumnType.Expand
				? table.grid.messages.expanding.columnHeader
				: meta?.systemColumnType === SystemColumnType.Actions
					? table.grid.messages.rowActions.columnHeader
					: undefined
	const label = systemColumnName === undefined ? rendered : <VisuallyHidden>{systemColumnName}</VisuallyHidden>

	const sortIndicator = (
		<SortIndicator
			sortDirection={sortDirection}
			canSort={canSort}
		/>
	)

	/**
	 * The column's name and its sort arrow, as one affordance.
	 *
	 * A real `<button>` when the column sorts, and a plain `<div>` when it does not — the same
	 * split the old `role={canSort ? 'button' : undefined}` made, now in the element rather than
	 * in an attribute. Everything clickable being a button is what lets the handler be
	 * `getToggleSortingHandler()` and nothing else: there is no longer anything to ask about the
	 * click's target, because nothing interactive may live in here.
	 *
	 * **So `column.header` content must not be interactive.** It renders inside this button, and
	 * a nested `<button>` is invalid HTML — the parser closes the outer one and the header comes
	 * apart. An icon, a badge or a tooltip is fine; a button or a link is not, and a header that
	 * needs one composes `<DataGrid.HeaderCell>` and places `label` outside `sortTrigger`.
	 */
	const sortTrigger = canSort ? (
		<button
			type='button'
			data-slot='sort-trigger'
			data-sortable='true'
			data-sort-direction={sortDirection}
			onClick={sortHandler}
			onKeyDown={onSortKeyDown}
		>
			{label}
			{sortIndicator}
		</button>
	) : (
		<div data-slot='sort-trigger'>
			{label}
			{sortIndicator}
		</div>
	)

	const menu =
		menuSections.length > 0 ? (
			<Menu
				variant={GridMenuVariant.Column}
				sections={menuSections}
				aria-label={table.grid.messages.columnMenu.trigger}
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

	const filterPopover = canFilter ? (
		<FilterPopover hasActiveFilter={Boolean(header.column.getFilterValue())}>{filterContent}</FilterPopover>
	) : null

	// The built-in cell renders the control inline. The popover presentation is one render
	// function away — see `PopoverFiltersLayout` — and is no longer a grid-wide option.
	const defaultContent = (
		<>
			<HeaderMain>
				{sortTrigger}
				{menu}
			</HeaderMain>
			{canFilter && <HeaderExtras>{filterContent}</HeaderExtras>}
		</>
	)

	/**
	 * Built unconditionally, then both **published** through {@link HeaderCellProvider} and passed
	 * to a render function — so the two ways of composing a header cell read the same object and
	 * cannot drift apart. It costs nothing the default path did not already pay: every member is
	 * computed above, because the default cell renders them.
	 */
	const args: DataGridHeaderCellRenderArgs<TRow> = {
		header,
		column: header.column,
		canSort,
		sortDirection,
		label,
		sortTrigger,
		menu,
		filter: filterContent,
		filterPopover,
		resizer,
		// Built only where a drag is actually available, so a call site placing `dragHandle`
		// unconditionally renders nothing in a grid without one. The component would return `null`
		// by itself too — this keeps the arg honest as well as the DOM.
		dragHandle: isDragParticipant && canMove ? <ColumnDragHandle /> : null,
	}

	const content = children === undefined ? defaultContent : typeof children === 'function' ? children(args) : children

	return renderTh(
		{
			...navigationProps,
			'data-slot': 'th',
			'data-column-id': header.column.id,
			colSpan: header.colSpan,
			style: pinVars,
			pinned,
			...(onHeaderKeyDown ? { onKeyDown: onHeaderKeyDown } : {}),
			...(canMove ? { 'data-movable': 'true' } : {}),
			...(meta?.headerClassName !== undefined ? { className: meta.headerClassName } : {}),
			...(pinned ? { 'data-pinned': pinned } : {}),
			...getAlignAttrs(meta, 'header'),
			...(canResize ? { 'data-resizable': 'true' } : {}),
			...ariaSortAttrs(canSort, sortDirection),
			...draftSortAttrs,
		},
		<HeaderCellProvider value={args}>
			{content}
			{resizer}
		</HeaderCellProvider>,
	)
}
