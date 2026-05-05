import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { useGridComponents } from '../components-context'
import { VIRTUALIZED_KEY } from '../use-data-grid'
import { getColumnSizeVars, getGridTemplateColumns } from '../utils/column-size-vars'

import { Body } from './body'
import { Header } from './header'
import { useTableContext } from './table-context'
import { VirtualProvider } from './virtual-context'

import type { NormalizedVirtualizedConfig } from '../use-data-grid'
import type { CSSProperties } from 'react'

const DEFAULT_ESTIMATE_SIZE = 50
const DEFAULT_OVERSCAN = 5

function updateScrollShadows(el: HTMLElement): void {
	const scrolledLeft = el.scrollLeft > 0
	const maxScroll = el.scrollWidth - el.clientWidth
	const scrolledRight = maxScroll > 1 && el.scrollLeft < maxScroll - 1
	el.style.setProperty('--dg-pin-left-shadow', scrolledLeft ? 'var(--dg-pin-left-shadow-value)' : 'none')
	el.style.setProperty('--dg-pin-right-shadow', scrolledRight ? 'var(--dg-pin-right-shadow-value)' : 'none')
}

function useScrollShadows(ref: { current: HTMLElement | null }): void {
	useEffect(() => {
		const el = ref.current
		if (!el) return
		const handleScroll = (): void => {
			updateScrollShadows(el)
		}
		el.addEventListener('scroll', handleScroll, { passive: true })
		updateScrollShadows(el)
		return () => {
			el.removeEventListener('scroll', handleScroll)
		}
	}, [ref])
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

	// Scroll container ref — used by useVirtualizer to measure the viewport
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

	useScrollShadows(containerRef)

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
			<Header theadStyle={isVirtualized ? { display: 'grid', position: 'sticky', top: 0, zIndex: 1 } : {}} />
			<Body />
		</Table>
	)

	if (isVirtualized) {
		return (
			<VirtualProvider rowVirtualizer={rowVirtualizer}>
				<div
					ref={containerRef}
					data-virtual='rows'
					style={{
						overflow: 'auto',
						position: 'relative',
						height: 'var(--dg-virtual-height, 600px)',
					}}
				>
					{tableEl}
				</div>
			</VirtualProvider>
		)
	}

	return (
		<div
			ref={containerRef}
			data-slot='table-scroll-container'
			style={{ overflowX: 'auto', position: 'relative' }}
		>
			{tableEl}
		</div>
	)
}
