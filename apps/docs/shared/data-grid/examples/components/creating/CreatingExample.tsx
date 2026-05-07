'use client'

import { useState } from 'react'

import { CreatingModalExample } from './CreatingModalExample'
import { CreatingPinRowExample } from './CreatingPinRowExample'
import { CreatingRowExample } from './CreatingRowExample'

const SUB_TABS = [
	{ id: 'row', label: 'Row', Component: CreatingRowExample },
	{ id: 'modal', label: 'Modal', Component: CreatingModalExample },
	{ id: 'pin-row', label: 'Pin Row', Component: CreatingPinRowExample },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function CreatingExample() {
	const [active, setActive] = useState<SubTabId>('row')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Demonstrates the three creating modes: inline row, modal dialog, and pinned row.
			</p>

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
