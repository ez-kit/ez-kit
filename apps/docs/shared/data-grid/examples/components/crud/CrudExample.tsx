'use client'

import { useState } from 'react'

import { CrudClientExample } from './CrudClientExample'

const SUB_TABS = [
	{ id: 'client', label: 'Client Side', Component: CrudClientExample },
	{ id: 'server', label: 'Server Side', Component: ServerSidePlaceholder },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

function ServerSidePlaceholder() {
	return <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Server-side CRUD example coming soon.</p>
}

export function CrudExample() {
	const [active, setActive] = useState<SubTabId>('client')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<div
				style={{
					display: 'flex',
					gap: '0.25rem',
					borderBottom: '1px solid #e2e8f0',
					marginBottom: '1.5rem',
				}}
			>
				{SUB_TABS.map((t) => (
					<button
						key={t.id}
						onClick={() => {
							setActive(t.id)
						}}
						style={{
							padding: '0.375rem 0.75rem',
							border: 'none',
							borderBottom: active === t.id ? '2px solid #0f172a' : '2px solid transparent',
							background: 'none',
							cursor: 'pointer',
							fontSize: '0.875rem',
							fontWeight: active === t.id ? 600 : 400,
							color: active === t.id ? '#0f172a' : '#64748b',
							marginBottom: '-1px',
						}}
					>
						{t.label}
					</button>
				))}
			</div>

			<tab.Component />
		</div>
	)
}
