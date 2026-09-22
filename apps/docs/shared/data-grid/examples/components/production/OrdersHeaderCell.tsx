'use client'

import { useDataGridHeaderCell } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

/**
 * The orders screen's header cell — a component rather than a render function.
 *
 * `useDataGridHeaderCell()` hands back exactly what `<DataGrid.HeaderCell>`'s render function
 * receives, so the body no longer has to be written at the call site. That is the whole
 * difference: a render function can only live inside the `.map()` that produced its header, which
 * is why customising one header cell used to mean inlining the entire table tree into the layout.
 *
 * `filterPopover` rather than `filter` — the same control behind the kit's trigger, which is all
 * `filtering: { variant: 'popover' }` ever meant. With this many columns the inline form would
 * cost the header its height. Never render both: they are one control in two presentations, and
 * the pair would field the same filter value twice.
 */
export function OrdersHeaderCell() {
	const { sortTrigger, filterPopover, menu } = useDataGridHeaderCell()

	return (
		<DataGrid.HeaderMain>
			{sortTrigger}
			{filterPopover}
			{menu}
		</DataGrid.HeaderMain>
	)
}
