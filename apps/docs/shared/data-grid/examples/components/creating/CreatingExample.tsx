'use client'

import { useState } from 'react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
			<div className='mb-6 overflow-x-auto'>
				<Tabs
					value={active}
					onValueChange={(value) => {
						setActive(value as SubTabId)
					}}
				>
					<TabsList variant='line'>
						{SUB_TABS.map((t) => (
							<TabsTrigger
								key={t.id}
								value={t.id}
							>
								{t.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>

			<tab.Component />
		</div>
	)
}
