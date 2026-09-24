import { ColumnSortDirection } from '@ez-kit/data-grid-react/kit'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import type { SortIndicatorProps } from '@ez-kit/data-grid-react'

export function SortIndicator({ sortDirection, canSort }: SortIndicatorProps) {
	if (!canSort) return null
	const icon =
		sortDirection === ColumnSortDirection.Asc ? (
			<ArrowUp
				className='h-3 w-3'
				aria-hidden
			/>
		) : sortDirection === ColumnSortDirection.Desc ? (
			<ArrowDown
				className='h-3 w-3'
				aria-hidden
			/>
		) : (
			<ArrowUpDown
				className='h-3 w-3 opacity-40'
				aria-hidden
			/>
		)
	// A `<span>`, not the kit's `Button`: the indicator renders **inside** the sort affordance,
	// which is a real `<button>`, and a nested one is invalid HTML — the parser closes the outer
	// one and the header comes apart. It was a `Button` with `tabIndex={-1}` and no handler of
	// its own, i.e. a button in looks only, and that cost it every click: the affordance dropped
	// events starting on an interactive descendant, so the arrow — which sits at the header's
	// centre — did nothing. HeroUI's indicator was a bare icon all along.
	return <span className='ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center'>{icon}</span>
}
