'use client'

import { useState } from 'react'

import { BaseExample } from './components/base'
import { CellTypesExample } from './components/cell-types'
import { ColumnPinningExample } from './components/column-pinning'
import { ColumnVisibilityExample } from './components/column-visibility'
import { CrudExample } from './components/crud/CrudExample'
import { DeleteConfirmationExample } from './components/delete-confirmation'
import { FilterOperatorsExample } from './components/filter-operators'
import { FilterPopoverExample } from './components/filter-popover'
import { ResizingExample } from './components/resizing'
import { RowPinningExample } from './components/row-pinning'
import { SelectionBarExample } from './components/selection-bar'
import { VirtualizedExample } from './components/virtualized'

const TABS = [
	{ id: 'base', label: 'Base', component: BaseExample },
	{ id: 'cell-types', label: 'Cell Types', component: CellTypesExample },
	{ id: 'delete-confirmation', label: 'Delete Confirmation', component: DeleteConfirmationExample },
	{ id: 'selection-bar', label: 'Selection Bar', component: SelectionBarExample },
	{ id: 'row-pinning', label: 'Row Pinning', component: RowPinningExample },
	{ id: 'column-pinning', label: 'Column Pinning', component: ColumnPinningExample },
	{ id: 'column-visibility', label: 'Column Visibility', component: ColumnVisibilityExample },
	{ id: 'filter-operators', label: 'Filter Operators', component: FilterOperatorsExample },
	{ id: 'crud', label: 'CRUD', component: CrudExample },
	{ id: 'filter-popover', label: 'Filter Popover', component: FilterPopoverExample },
	{ id: 'virtualized', label: 'Virtualized', component: VirtualizedExample },
	{ id: 'resizing', label: 'Resizing', component: ResizingExample },
] as const

type TabId = (typeof TABS)[number]['id']

export default function DataGridSandboxPage() {
	const [activeTab, setActiveTab] = useState<TabId>('base')

	const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? BaseExample

	return (
		<div
			style={{ padding: '2rem' }}
			className='[&_input]:border'
		>
			<h1 style={{ marginBottom: '1.5rem' }}>DataGrid Sandbox</h1>

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

			<ActiveComponent />
		</div>
	)
}
