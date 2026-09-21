'use client'

import { DataGridOptionsProvider, GridComponentsProvider } from '@ez-kit/data-grid-react'

import { consoleFeatures } from './features'
import { ProductionLayout } from './ProductionLayout'

import type { Order } from './data'
import type { ReactNode } from 'react'

/**
 * Every look-and-feel decision the orders console makes, declared once.
 *
 * In a real app this component wraps the whole tree (or the section that owns
 * the grids) and every `<DataGrid />` beneath it inherits these options — including
 * the `features` set — deep-merged **under** whatever the grid declares itself, so a
 * single grid can still override one nested field without repeating the rest.
 *
 * What is deliberately absent: `data`, `columns`, `state` and `onStateChange`
 * (excluded from `DataGridDefaultOptions` by type — they are per-instance by
 * definition), `pagination.rowCount`, and the write handlers. Create, edit and
 * delete are described here but not switched on: a grid gets the feature only
 * by supplying `onSave` / `onDelete`, so a read-only grid under this provider
 * stays read-only without opting out of anything.
 *
 * The **layout** is the one look-and-feel decision that does not go in `defaults`, and
 * deliberately so: it is a component, not an option, so it rides the components registry
 * instead — `GridComponentsProvider` below binds `core.Layout` for the whole subtree, exactly
 * as each UI kit binds its own default. Every grid beneath renders the console's arrangement
 * with no children of its own, and a grid that writes `children` still overrides it, because
 * the body resolves as `children ?? core.Layout ?? <DataGrid.Table/>`.
 */
// Defined out of the render: the provider keys its merge on this object's identity, so a fresh
// literal each render would re-render every component that reads the registry.
const COMPONENTS = { core: { Layout: ProductionLayout } }

export function DataGridOptions({ children }: { children: ReactNode }) {
	return (
		<DataGridOptionsProvider<typeof consoleFeatures, Order>
			defaults={{
				// A defaults layer may supply the feature set, and this is the case it exists for: one
				// set for every grid in the console. `features` **replaces** across layers rather than
				// merging, so a grid that deliberately narrows below this one gets the narrow set.
				features: consoleFeatures,
				pagination: {
					manual: true,
					items: [10, 25, 50],
					siblings: 1,
				},
				sorting: { manual: true, multi: { max: 3, event: 'ctrl' } },
				filtering: {
					manual: true,
					faceted: true,
					debounce: 300,
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
			<GridComponentsProvider components={COMPONENTS}>{children}</GridComponentsProvider>
		</DataGridOptionsProvider>
	)
}
