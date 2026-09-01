'use client'

import { DataGridOptionsProvider } from '@ez-kit/data-grid-react'

import type { Order } from './data'
import type { ReactNode } from 'react'

/**
 * Every look-and-feel decision the orders console makes, declared once.
 *
 * In a real app this component wraps the whole tree (or the section that owns
 * the grids) and every `<DataGrid />` beneath it inherits these options —
 * deep-merged **under** whatever the grid declares itself, so a single grid can
 * still override one nested field without repeating the rest.
 *
 * What is deliberately absent: `data`, `columns`, `state` and `onStateChange`
 * (excluded from `DataGridDefaultOptions` by type — they are per-instance by
 * definition), `pagination.rowCount`, and the write handlers. Create, edit and
 * delete are described here but not switched on: a grid gets the feature only
 * by supplying `onSave` / `onDelete`, so a read-only grid under this provider
 * stays read-only without opting out of anything.
 */
export function DataGridOptions({ children }: { children: ReactNode }) {
	return (
		<DataGridOptionsProvider<Order>
			defaults={{
				pagination: {
					manual: true,
					items: [10, 25, 50],
					variant: 'numbered',
					siblings: 1,
				},
				sorting: { manual: true, multi: { max: 3, event: 'ctrl' }, toolbar: true },
				filtering: {
					manual: true,
					variant: 'popover',
					faceted: true,
					debounce: 300,
					chips: { position: 'above' },
					toolbar: true,
				},
				globalFiltering: { placeholder: 'Search orders…', debounce: 300 },
				layout: { stickyHeader: true },
				pinning: { column: true, row: { top: true, bottom: true } },
				resizing: { mode: 'onChange' },
				visibility: true,
				creating: { mode: 'modal' },
				editing: { mode: 'modal' },
				deleting: {
					confirmation: {
						title: 'Delete order?',
						description: (row) => `Order ${row.original.reference} will be permanently removed.`,
					},
				},
			}}
		>
			{children}
		</DataGridOptionsProvider>
	)
}
