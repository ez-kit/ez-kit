import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { STICKY_HEADER_KEY, VIRTUALIZED_KEY } from '../use-data-grid'
import { getColumnSizeVars, getGridTemplateColumns } from '../utils/column-size-vars'

import { Body } from './body'
import { Header } from './header'
import { PinShadowOverlay } from './pin-shadow-overlay'
import { useTable } from './table-context'
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

/**
 * Publishes the rendered thead height as `--dg-header-height` on the wrapper so
 * pinned-top rows can be offset below the sticky header (consumed by the
 * structural stylesheet). No-op when sticky header is disabled.
 */
function useHeaderHeightVar(
	wrapperRef: { current: HTMLElement | null },
	enabled: boolean,
): void {
	useEffect(() => {
		if (!enabled) return
		const wrapper = wrapperRef.current
		if (!wrapper) return
		const thead = wrapper.querySelector("[data-slot='thead']")
		if (!(thead instanceof HTMLElement)) return

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
	}, [wrapperRef, enabled])
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
 * All layout, overflow, and positioning rules are emitted as `data-*` attributes
 * and consumed by the structural stylesheet shipped with this package
 * (`@ez-kit/data-grid-react/styles.css`). The only inline styles set here are
 * CSS custom properties (column widths, grid-template-columns).
 *
 * Pin shadows: a single absolutely-positioned overlay div sits outside the
 * scroll container. CSS vars `--dg-pin-left-shadow` / `--dg-pin-right-shadow`
 * on the wrapper drive their opacity.
 */
export function DataGridTable() {
	const { Table } = useGridComponents()
	const table = useTable()

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
	useHeaderHeightVar(wrapperRef, isStickyHeader)

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

	const tableEl = (
		<Table
			data-slot='table'
			{...(isVirtualized ? { 'data-virtualized': 'true' } : {})}
			style={
				{
					...sizeVars,
					'--grid-template-columns': gridTemplateColumns,
				} as CSSProperties
			}
		>
			<Header stickyHeader={isStickyHeader} />
			<Body />
		</Table>
	)

	if (isVirtualized) {
		return (
			<VirtualProvider rowVirtualizer={rowVirtualizer}>
				<div
					ref={wrapperRef}
					data-slot='table-wrapper'
					data-virtualized='true'
				>
					<div
						ref={containerRef}
						data-slot='table-scroll'
						data-virtualized='true'
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
			data-slot='table-wrapper'
		>
			<div
				data-slot='table-scroll'
				{...(isStickyHeader ? { 'data-sticky-header': 'true' } : {})}
			>
				{tableEl}
			</div>
			<PinShadowOverlay />
		</div>
	)
}
