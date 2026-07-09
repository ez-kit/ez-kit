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
	return <DataGrid table={table} />
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
	return <DataGrid table={table} />
}

export function DefaultOptionsExample() {
	return (
		<DataGridOptionsProvider<(typeof INITIAL_DATA)[number]>
			defaults={{ sorting: true, pagination: { pageSize: 3 } }}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
				<section>
					<p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.875rem' }}>
						<strong>Inherits defaults</strong> — sortable, 3 rows per page. No feature flags at the
						call site.
					</p>
					<DefaultsGrid />
				</section>
				<section>
					<p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.875rem' }}>
						<strong>Overrides defaults</strong> — same provider, but this instance sets{' '}
						<code>pageSize: 5</code> and turns sorting off. Instance always wins.
					</p>
					<OverrideGrid />
				</section>
			</div>
		</DataGridOptionsProvider>
	)
}
