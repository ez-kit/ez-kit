'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	createSortedRowModel,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { DataGridOptionsProvider } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

// Both grids below live under one provider, so neither repeats `sorting` or
// `pagination`. The provider supplies them once; each grid only declares what
// makes it different.
function DefaultsGrid() {
	// No feature flags here — sorting + pagination come from the provider.
	return (
		<section>
			<h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Inherits defaults</h2>
			<DataGrid
				features={features}
				data={INITIAL_DATA}
				columns={columns}
			/>
		</section>
	)
}

function OverrideGrid() {
	// Instance config is deep-merged **over** the provider defaults: `pagination`
	// keeps the provider's other settings but wins on `pageSize`, and this grid
	// opts out of sorting entirely.
	return (
		<section>
			<h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Overrides defaults</h2>
			<DataGrid
				features={features}
				data={INITIAL_DATA}
				columns={columns}
				sorting={false}
				pagination={{ pageSize: 5 }}
			/>
		</section>
	)
}

export function DefaultOptionsExample() {
	return (
		<DataGridOptionsProvider<typeof features, (typeof INITIAL_DATA)[number]>
			defaults={{ sorting: true, pagination: { pageSize: 3 } }}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
				<DefaultsGrid />
				<OverrideGrid />
			</div>
		</DataGridOptionsProvider>
	)
}
