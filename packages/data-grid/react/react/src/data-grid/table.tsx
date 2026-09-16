import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { getColumnSizeVars, getGridTemplateColumns } from '../utils/column-size-vars'

import { Body } from './body'
import { Footer } from './footer'
import { Header } from './header'
import { InfiniteProvider } from './infinite-context'
import { PinShadowOverlay } from './pin-shadow-overlay'
import { useDataGridTable, useDataGridState } from './table-context'
import { VirtualProvider } from './virtual-context'

import type { ErasedRow, GridFeatures } from '../types'
import type { NormalizedVirtualizationConfig } from '../use-data-grid'
import type { HeaderGroup, Row, Table as TanStackTable } from '@tanstack/table-core'
import type { CSSProperties, ReactNode } from 'react'

/** Marks the scrollport; the value lists the axes that element scrolls. */
const SCROLLPORT_ATTR = 'data-scrollport'
const SCROLLPORT_AXES = 'x y'

function updateScrollShadows(scrollEl: HTMLElement, wrapperEl: HTMLElement): void {
	// `scrollLeft` is signed under RTL (0 at the inline-start edge, negative towards the end),
	// so the two booleans are "scrolled away from the inline-start edge" and "not yet at the
	// inline-end one" in both directions once the sign is taken off.
	const offset = Math.abs(scrollEl.scrollLeft)
	const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth
	const scrolledFromStart = offset > 0
	const scrolledFromEnd = maxScroll > 1 && offset < maxScroll - 1
	wrapperEl.style.setProperty('--dg-pin-start-shadow', scrolledFromStart ? '1' : '0')
	wrapperEl.style.setProperty('--dg-pin-end-shadow', scrolledFromEnd ? '1' : '0')
}

function useScrollShadows(
	wrapperRef: { current: HTMLElement | null },
	scrollRef: { current: HTMLElement | null },
): void {
	useEffect(() => {
		const wrapper = wrapperRef.current
		const scrollEl = scrollRef.current
		if (!wrapper || !scrollEl) return
		const update = () => {
			updateScrollShadows(scrollEl, wrapper)
		}
		scrollEl.addEventListener('scroll', update, { passive: true })
		update()
		const ro = new ResizeObserver(update)
		ro.observe(scrollEl)
		return () => {
			scrollEl.removeEventListener('scroll', update)
			ro.disconnect()
		}
	}, [wrapperRef, scrollRef])
}

function resolveEstimateSize(
	estimateSize: NormalizedVirtualizationConfig['row']['estimateSize'],
): (index: number) => number {
	if (typeof estimateSize === 'function') return estimateSize
	const size = estimateSize ?? DATA_GRID_DEFAULTS.virtualization.row.estimateSize
	return () => size
}

/**
 * What a `<DataGrid.Table>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Table<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridTableRenderArgs<TRow extends object = ErasedRow> = {
	table: TanStackTable<GridFeatures, TRow>
	/** Header groups of the current column model — one entry per header row. */
	headerGroups: HeaderGroup<GridFeatures, TRow>[]
	/** The rows of the current row model, already sorted / filtered / paginated. */
	rows: Row<GridFeatures, TRow>[]
}

export type DataGridTableProps<TRow extends object = ErasedRow> = {
	/**
	 * Custom table content, rendered inside the kit's `<Table>` element and inside the
	 * scroll / pin-shadow wrapper, so sticky headers, pinning and virtualization plumbing
	 * still work.
	 *
	 * Omit it for the built-in `<DataGrid.Header /><DataGrid.Body />` pair. Supply it to
	 * reorder, wrap, or replace either half — e.g. to add a `<tfoot>`, which the built-in
	 * layout has no slot for.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Table>
	 *   <DataGrid.Header />
	 *   <DataGrid.Body />
	 *   <MyFooter />
	 * </DataGrid.Table>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridTableRenderArgs<TRow>) => ReactNode)
}

/**
 * Renders the full `<table>` with header and body.
 *
 * All layout, overflow, and positioning rules are emitted as `data-*` attributes
 * and consumed by the structural stylesheet shipped with this package
 * (`@ez-kit/data-grid-react/styles.css`). The only inline styles set here are
 * CSS custom properties (column widths, grid-template-columns).
 *
 * Pin shadows: a single absolutely-positioned overlay div sits outside the
 * scroll container. CSS vars `--dg-pin-start-shadow` / `--dg-pin-end-shadow`
 * on the wrapper drive their opacity.
 */

export function DataGridTable<TRow extends object = ErasedRow>({ children }: DataGridTableProps<TRow> = {}) {
	// The shell's two boxes are optional slots: a kit that registers neither gets these plain
	// divs, which is what both kits in this repo used until HeroUI needed its own scrollport.
	// A registered one must spread what it receives and land `ref` on the right element — see
	// `TableWrapperProps` / `TableScrollProps`.
	const { Table, TableWrapper: Wrapper = 'div', TableScroll: Scroll = 'div' } = useGridComponents().core
	const table = useDataGridTable<TRow>()

	// Narrow subscriptions: re-render only when slices that actually affect
	// the table layout or row composition change. Editing / rowSelection /
	// per-row state changes do NOT touch any of these.
	useDataGridState((s) => s.columnSizing)
	useDataGridState((s) => s.columnResizing)
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	// `--grid-template-columns` is built from the visual leaf order, which a reorder changes.
	useDataGridState((s) => s.columnOrder)
	// Row-model affecting slices (used when virtualized to size the virtualizer).
	const sorting = useDataGridState((s) => s.sorting)
	const columnFilters = useDataGridState((s) => s.columnFilters)
	const globalFilter = useDataGridState<unknown>((s) => s.globalFilter)
	const pagination = useDataGridState((s) => s.pagination)
	useDataGridState((s) => s.expanded)
	useDataGridState((s) => s.rowPinning)

	const sizeVars = getColumnSizeVars(table)
	const gridTemplateColumns = getGridTemplateColumns(table)

	const virtualizationConfig = table.grid.virtualization

	const isVirtualized = Boolean(virtualizationConfig)
	const {
		stickyHeader: isStickyHeader,
		footer: hasFooter,
		stickyFooter: isStickyFooter,
		maxHeight,
		classNames,
	} = table.grid.layout

	// One option, two custom properties: capped height for the normal scroll container,
	// definite height for the virtualized one (which cannot size itself from its content).
	// The stylesheet already reads both; until now neither had a way in from the API.
	const heightVars = (
		maxHeight !== undefined ? { '--dg-table-max-height': maxHeight, '--dg-virtual-height': maxHeight } : undefined
	) as CSSProperties | undefined

	// wrapperRef — outer div; CSS pin-shadow vars are written here so the overlay reads them
	const wrapperRef = useRef<HTMLDivElement>(null)
	// containerRef — inner scroll div used by useVirtualizer (virtualized mode only)
	const containerRef = useRef<HTMLDivElement>(null)
	// scrollRef — the `data-slot="table-scroll"` div (non-virtualized mode); see getScrollElement
	const scrollRef = useRef<HTMLDivElement>(null)

	const rows = isVirtualized ? (table.options.enableRowPinning ? table.getCenterRows() : table.getRowModel().rows) : []

	// eslint-disable-next-line react-hooks/incompatible-library
	const rowVirtualizer = useVirtualizer({
		count: isVirtualized ? rows.length : 0,
		getScrollElement: () => containerRef.current,
		estimateSize: resolveEstimateSize(virtualizationConfig?.row.estimateSize),
		overscan: virtualizationConfig?.row.overscan ?? DATA_GRID_DEFAULTS.virtualization.row.overscan,
		enabled: isVirtualized,
	})

	// One name for "the element that scrolls", known rather than hunted for: the `TableScroll`
	// slot's contract is that its `ref` lands on that element, so a kit that nests its own
	// container (HeroUI) points here at the container, and a kit that registers no slot gets the
	// plain div this file renders. Virtualized mode uses its own ref, which the virtualizer drives.
	const scrollElementRef = isVirtualized ? containerRef : scrollRef
	useScrollShadows(wrapperRef, scrollElementRef)

	// Publish the scrollport so CSS, tests and consumers can name it without knowing which kit
	// is mounted: `[data-scrollport~='x']` / `[data-scrollport~='y']`. Both axes belong to one
	// element now — the one the slot's `ref` points at — where this used to resolve them
	// separately by walking the DOM and probing computed overflow, because the shared div was
	// the scrollport whatever the kit did with it.
	useEffect(() => {
		const scrollEl = scrollElementRef.current
		if (!scrollEl) return
		scrollEl.setAttribute(SCROLLPORT_ATTR, SCROLLPORT_AXES)
		return () => {
			scrollEl.removeAttribute(SCROLLPORT_ATTR)
		}
	}, [scrollElementRef])

	// Re-evaluate shadow state immediately when column layout changes (pin/unpin, resize)
	// so shadows update without requiring a scroll event.
	useEffect(() => {
		const wrapper = wrapperRef.current
		const scrollEl = scrollElementRef.current
		if (!wrapper || !scrollEl) return
		updateScrollShadows(scrollEl, wrapper)
		// wrapperRef and scrollElementRef are stable refs.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gridTemplateColumns])

	// ── infinite scroll ───────────────────────────────────────────────────────
	// Edge detection and reset-to-top act on the same element as everything else: the one the
	// scroll slot declared. Two resolvers used to live here, one per axis, because the shared
	// div stayed the scrollport and the real scroller had to be found underneath it.
	const getScrollElement = useCallback((): HTMLElement | null => {
		return scrollElementRef.current
		// isVirtualized never changes after mount; refs are stable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const infiniteEnabled = table.grid.pagination.infinite !== undefined

	// Reset on query change: when sorting / column filters / global search / page size
	// change in infinite mode, clear any error, re-arm detection (handled by the loader
	// re-mounting at the top) and scroll back to top so the observer doesn't immediately
	// refire at the stale bottom. The consumer drops accumulated rows in its own onChange.
	const querySignature = JSON.stringify([sorting, columnFilters, globalFilter, pagination.pageSize])
	const prevQuerySignature = useRef<string | null>(null)
	useEffect(() => {
		if (!infiniteEnabled) return
		if (prevQuerySignature.current === null) {
			prevQuerySignature.current = querySignature
			return
		}
		if (prevQuerySignature.current === querySignature) return
		prevQuerySignature.current = querySignature
		table.setInfiniteStatus({ error: null })
		const scrollEl = getScrollElement()
		if (scrollEl) scrollEl.scrollTop = 0
	}, [querySignature, infiniteEnabled, getScrollElement, table])

	const tableEl = (
		<Table
			data-slot='table'
			// `grid.label` is documented as "accessible name of the table element", so
			// it is written here rather than left to each kit: the heroui adapter sets the same
			// string on React Aria's grid (and keeps doing so), while shadcn renders the bare
			// `<table>`, which had no name at all until this line.
			aria-label={table.grid.messages.grid.label}
			{...(isVirtualized ? { 'data-virtualized': 'true' } : {})}
			style={
				{
					...sizeVars,
					'--grid-template-columns': gridTemplateColumns,
				} as CSSProperties
			}
		>
			{children === undefined ? (
				<>
					<Header />
					<Body />
					{hasFooter ? <Footer /> : null}
				</>
			) : typeof children === 'function' ? (
				children({ table, headerGroups: table.getHeaderGroups(), rows: table.getRowModel().rows })
			) : (
				children
			)}
		</Table>
	)

	if (isVirtualized) {
		return (
			<InfiniteProvider getScrollElement={getScrollElement}>
				<VirtualProvider rowVirtualizer={rowVirtualizer}>
					<Wrapper
						ref={wrapperRef}
						data-slot='table-wrapper'
						data-virtualized='true'
						className={classNames?.wrapper}
						style={heightVars}
					>
						<Scroll
							ref={containerRef}
							data-slot='table-scroll'
							data-virtualized='true'
							className={classNames?.scroll}
						>
							{tableEl}
						</Scroll>
						<PinShadowOverlay />
					</Wrapper>
				</VirtualProvider>
			</InfiniteProvider>
		)
	}

	return (
		<InfiniteProvider getScrollElement={getScrollElement}>
			<Wrapper
				ref={wrapperRef}
				data-slot='table-wrapper'
				className={classNames?.wrapper}
				style={heightVars}
			>
				<Scroll
					ref={scrollRef}
					data-slot='table-scroll'
					className={classNames?.scroll}
					{...(isStickyHeader ? { 'data-sticky-header': 'true' } : {})}
					{...(isStickyFooter ? { 'data-sticky-footer': 'true' } : {})}
				>
					{tableEl}
				</Scroll>
				<PinShadowOverlay />
			</Wrapper>
		</InfiniteProvider>
	)
}
