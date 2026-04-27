'use client'

import { useState } from 'react'

import { useDataGridType } from 'shared/DataGrid'

import { dataGridExamplesManifest, type DataGridExampleId } from './generated/data-grid-primitive'

interface DataGridExamplesBrowserProps {
	renderExample: (exampleId: DataGridExampleId) => React.ReactNode
}

const TABS = dataGridExamplesManifest.map(({ id, label }) => ({ id, label }))

export function DataGridExamplesBrowser({ renderExample }: DataGridExamplesBrowserProps) {
	const [activeTab, setActiveTab] = useState<DataGridExampleId>('base')

	const { type } = useDataGridType()

	return (
		<div
			style={{ padding: '2rem' }}
			className='[&_input]:border'
		>
			<h1 style={{ marginBottom: '1.5rem' }}>DataGrid Sandbox - {type}</h1>

			<div
				style={{
					display: 'flex',
					gap: '0.25rem',
					borderBottom: '1px solid #e2e8f0',
					marginBottom: '2rem',
				}}
			>
				{TABS.map((tab) => (
					<button
						key={tab.id}
						onClick={() => {
							setActiveTab(tab.id)
						}}
						style={{
							padding: '0.5rem 1rem',
							border: 'none',
							borderBottom: activeTab === tab.id ? '2px solid #0f172a' : '2px solid transparent',
							background: 'none',
							cursor: 'pointer',
							fontWeight: activeTab === tab.id ? 600 : 400,
							color: activeTab === tab.id ? '#0f172a' : '#64748b',
							marginBottom: '-1px',
							transition: 'color 150ms, border-color 150ms',
						}}
					>
						{tab.label}
					</button>
				))}
			</div>

			{renderExample(activeTab)}
		</div>
	)
}
