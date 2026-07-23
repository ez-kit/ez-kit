'use client'

import { DataGridOptionsProvider } from '@ez-kit/data-grid-react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA } from './_data'

// Both grids below live under one provider, so neither repeats `sorting` or
// `pagination`. The provider supplies them once; each grid only declares what
// makes it different.
function DefaultsGrid() {
	// No feature flags here — sorting + pagination come from the provider.
	const table = useDataGrid({ data: INITIAL_DATA, columns })
	return (
		<section>
			<h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Inherits defaults</h2>
			<DataGrid table={table} />
		</section>
	)
}

function OverrideGrid() {
	// Instance config is deep-merged **over** the provider defaults: `pagination`
	// keeps the provider's other settings but wins on `pageSize`, and this grid
	// opts out of sorting entirely.
	const table = useDataGrid({
		data: INITIAL_DATA,
		columns,
		sorting: false,
		pagination: { pageSize: 5 },
	})
	return (
		<section>
			<h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Overrides defaults</h2>
			<DataGrid table={table} />
		</section>
	)
}

export function DefaultOptionsExample() {
	return (
		<DataGridOptionsProvider<(typeof INITIAL_DATA)[number]> defaults={{ sorting: true, pagination: { pageSize: 3 } }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
				<DefaultsGrid />
				<OverrideGrid />
			</div>
		</DataGridOptionsProvider>
	)
}
