import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { STICKY_HEADER_KEY, VIRTUALIZED_KEY } from '../use-data-grid'
import { getColumnSizeVars, getGridTemplateColumns } from '../utils/column-size-vars'

import { Body } from './body'
import { Header } from './header'
import { PinShadowOverlay } from './pin-shadow-overlay'
import { useTableContext } from './table-context'
import { VirtualProvider } from './virtual-context'

import type { NormalizedVirtualizedConfig } from '../use-data-grid'
import type { CSSProperties } from 'react'

const DEFAULT_ESTIMATE_SIZE = 50
const DEFAULT_OVERSCAN = 5

function resolveScrollElement(wrapper: HTMLElement): HTMLElement {
	const tagged = wrapper.querySelector("[data-slot='table-scroll-container']")
	if (tagged instanceof HTMLElement) return tagged

	for (const el of wrapper.querySelectorAll('*')) {
		if (el instanceof HTMLElement) {
			const { overflowX } = getComputedStyle(el)
			if (overflowX === 'auto' || overflowX === 'scroll') return el
		}
	}

	return wrapper
}

function updateScrollShadows(scrollEl: HTMLElement, wrapperEl: HTMLElement): void {
	const scrolledLeft = scrollEl.scrollLeft > 0
	const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth
	const scrolledRight = maxScroll > 1 && scrollEl.scrollLeft < maxScroll - 1
	wrapperEl.style.setProperty('--dg-pin-left-shadow', scrolledLeft ? '1' : '0')
	wrapperEl.style.setProperty('--dg-pin-right-shadow', scrolledRight ? '1' : '0')
}

function useScrollShadows(
	wrapperRef: { current: HTMLElement | null },
	scrollRef?: { current: HTMLElement | null },
): void {
	useEffect(() => {
		const wrapper = wrapperRef.current
		if (!wrapper) return
		const scrollEl = scrollRef?.current ?? resolveScrollElement(wrapper)
		const update = () => { updateScrollShadows(scrollEl, wrapper) }
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
	estimateSize: NormalizedVirtualizedConfig['row']['estimateSize'],
): (index: number) => number {
	if (typeof estimateSize === 'function') return estimateSize
	const size = estimateSize ?? DEFAULT_ESTIMATE_SIZE
	return () => size
}

/**
 * Renders the full `<table>` with header and body.
 *
 * When column resizing is enabled, sets CSS custom properties for column widths
 * on the table element so cells can read widths without per-cell re-renders.
 *
 * When virtualized rows are enabled, wraps the table in a scroll container,
 * applies `display: grid` layout, and provides a RowVirtualizer via context.
 *
 * Pin shadows are rendered via a single absolutely-positioned overlay div that
 * sits outside the scroll container and never scrolls with the table content.
 * CSS vars `--dg-pin-left-shadow` / `--dg-pin-right-shadow` (0 or 1) on the
 * wrapper control the opacity of the shadow divs inside the overlay.
 */
export function DataGridTable() {
	const { Table } = useGridComponents()
	const table = useTableContext()

	const sizeVars = getColumnSizeVars(table)
	const gridTemplateColumns = getGridTemplateColumns(table)

	const virtualizedConfig = (table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY] as
		| NormalizedVirtualizedConfig
		| undefined

	const isVirtualized = Boolean(virtualizedConfig)
	const isStickyHeader = Boolean((table as unknown as Record<symbol, unknown>)[STICKY_HEADER_KEY])

	// wrapperRef — outer div; CSS pin-shadow vars are written here so the overlay reads them
	const wrapperRef = useRef<HTMLDivElement>(null)
	// containerRef — inner scroll div used by useVirtualizer (virtualized mode only)
	const containerRef = useRef<HTMLDivElement>(null)

	const rows = isVirtualized ? (table.options.enableRowPinning ? table.getCenterRows() : table.getRowModel().rows) : []

	// eslint-disable-next-line react-hooks/incompatible-library
	const rowVirtualizer = useVirtualizer({
		count: isVirtualized ? rows.length : 0,
		getScrollElement: () => containerRef.current,
		estimateSize: resolveEstimateSize(virtualizedConfig?.row.estimateSize),
		overscan: virtualizedConfig?.row.overscan ?? DEFAULT_OVERSCAN,
		enabled: isVirtualized,
	})

	// Virtualized: containerRef IS the scroll element; pass it directly to skip DOM traversal.
	// Non-virtualized: resolveScrollElement finds the real scroll element inside wrapperRef
	// (handles both shadcn's inner overflow div and HeroUI's inner ScrollContainer).
	useScrollShadows(wrapperRef, isVirtualized ? containerRef : undefined)

	// Re-evaluate shadow state immediately when column layout changes (pin/unpin, resize)
	// so shadows update without requiring a scroll event.
	useEffect(() => {
		const wrapper = wrapperRef.current
		if (!wrapper) return
		const scrollEl = isVirtualized ? containerRef.current : resolveScrollElement(wrapper)
		if (!scrollEl) return
		updateScrollShadows(scrollEl, wrapper)
		// wrapperRef and containerRef are stable refs; isVirtualized never changes after mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gridTemplateColumns])

	const theadStyle: CSSProperties = {
		...(isVirtualized ? { display: 'grid' } : {}),
		...(isStickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : {}),
	}

	const tableEl = (
		<Table
			style={
				{
					...sizeVars,
					'--grid-template-columns': gridTemplateColumns,
					...(isVirtualized ? { display: 'grid' } : {}),
				} as CSSProperties
			}
		>
			<Header theadStyle={theadStyle} stickyHeader={isStickyHeader} />
			<Body />
		</Table>
	)

	if (isVirtualized) {
		return (
			<VirtualProvider rowVirtualizer={rowVirtualizer}>
				<div
					ref={wrapperRef}
					style={{
						position: 'relative',
						height: 'var(--dg-virtual-height, 600px)',
					}}
				>
					<div
						ref={containerRef}
						data-slot='table-scroll'
						data-virtual='rows'
						style={{
							overflow: 'auto',
							height: '100%',
						}}
					>
						{tableEl}
					</div>
					<PinShadowOverlay />
				</div>
			</VirtualProvider>
		)
	}

	return (
		<div
			ref={wrapperRef}
			style={{ position: 'relative' }}
		>
			<div
				data-slot='table-scroll'
				style={{
					overflowX: 'auto',
					...(isStickyHeader ? { overflowY: 'auto', maxHeight: 'var(--dg-table-max-height, 400px)' } : {}),
				}}
			>
				{tableEl}
			</div>
			<PinShadowOverlay />
		</div>
	)
}
