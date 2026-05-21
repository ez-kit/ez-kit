'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDataGridType } from 'shared/DataGrid'

import { dataGridExamplesManifest, type DataGridExampleId } from './generated/data-grid-primitive'

type DataGridExamplesBrowserProps = {
	renderExample: (exampleId: DataGridExampleId) => React.ReactNode
}

type ManifestEntry = (typeof dataGridExamplesManifest)[number]
type GroupedEntry = ManifestEntry & { group: string; groupLabel: string }

const isGrouped = (entry: ManifestEntry): entry is GroupedEntry =>
	'group' in entry && typeof (entry as { group?: unknown }).group === 'string'

type TopLevelTab =
	| { kind: 'single'; id: DataGridExampleId; label: string }
	| { kind: 'group'; id: string; label: string; children: { id: DataGridExampleId; label: string }[] }

const GROUP_VALUE_PREFIX = 'group:'

const TOP_LEVEL_TABS: TopLevelTab[] = (() => {
	const tabs: TopLevelTab[] = []
	const groupIndex = new Map<string, number>()

	for (const entry of dataGridExamplesManifest) {
		if (isGrouped(entry)) {
			const existingIndex = groupIndex.get(entry.group)
			if (existingIndex === undefined) {
				groupIndex.set(entry.group, tabs.length)
				tabs.push({
					kind: 'group',
					id: entry.group,
					label: entry.groupLabel,
					children: [{ id: entry.id, label: entry.label }],
				})
			} else {
				const tab = tabs[existingIndex]
				if (tab?.kind === 'group') {
					tab.children.push({ id: entry.id, label: entry.label })
				}
			}
		} else {
			tabs.push({ kind: 'single', id: entry.id, label: entry.label })
		}
	}

	return tabs
})()

const findTabForExample = (exampleId: DataGridExampleId): TopLevelTab | undefined =>
	TOP_LEVEL_TABS.find((tab) =>
		tab.kind === 'single' ? tab.id === exampleId : tab.children.some((c) => c.id === exampleId),
	)

const KNOWN_EXAMPLE_IDS = new Set<string>(dataGridExamplesManifest.map((entry) => entry.id))

const resolveDefaultTab = (): DataGridExampleId => {
	const first = TOP_LEVEL_TABS[0]
	if (!first) throw new Error('TOP_LEVEL_TABS must not be empty')
	if (first.kind === 'group') {
		const child = first.children[0]
		if (!child) throw new Error('Top-level group must have at least one child')
		return child.id
	}
	return first.id
}

const DEFAULT_TAB: DataGridExampleId = resolveDefaultTab()

const resolveTab = (raw: string | null): DataGridExampleId => {
	if (raw && KNOWN_EXAMPLE_IDS.has(raw)) {
		return raw as DataGridExampleId
	}

	if (raw) {
		const groupTab = TOP_LEVEL_TABS.find((tab) => tab.kind === 'group' && tab.id === raw)
		if (groupTab?.kind === 'group') {
			const first = groupTab.children[0]
			if (first) return first.id
		}
	}

	return DEFAULT_TAB
}

const topLevelValueFor = (tab: TopLevelTab): string =>
	tab.kind === 'single' ? tab.id : `${GROUP_VALUE_PREFIX}${tab.id}`

const useActiveTab = () => {
	const searchParams = useSearchParams()
	const activeTab = resolveTab(searchParams.get('tab'))
	const router = useRouter()
	const pathname = usePathname()

	const setActiveTab = (tab: DataGridExampleId) => {
		const params = new URLSearchParams(searchParams.toString())
		params.set('tab', tab)
		router.push(`${pathname}?${params.toString()}`)
	}

	return { activeTab, setActiveTab }
}

export function DataGridExamplesBrowser({ renderExample }: DataGridExamplesBrowserProps) {
	const { activeTab, setActiveTab } = useActiveTab()
	const { type } = useDataGridType()

	const activeTopLevel = findTabForExample(activeTab)
	const activeTopLevelValue = activeTopLevel ? topLevelValueFor(activeTopLevel) : ''

	const handleTopLevelChange = (value: string) => {
		if (value.startsWith(GROUP_VALUE_PREFIX)) {
			const groupId = value.slice(GROUP_VALUE_PREFIX.length)
			const groupTab = TOP_LEVEL_TABS.find((tab) => tab.kind === 'group' && tab.id === groupId)
			if (groupTab?.kind === 'group') {
				const first = groupTab.children[0]
				if (first) setActiveTab(first.id)
			}
			return
		}

		setActiveTab(value as DataGridExampleId)
	}

	const handleSubTabChange = (value: string) => {
		setActiveTab(value as DataGridExampleId)
	}

	return (
		<div className='[&_input]:border p-8'>
			<h1 className='mb-6'>DataGrid Sandbox - {type}</h1>

			<div className='mb-4 overflow-x-auto'>
				<Tabs
					value={activeTopLevelValue}
					onValueChange={handleTopLevelChange}
				>
					<TabsList variant='line'>
						{TOP_LEVEL_TABS.map((tab) => (
							<TabsTrigger
								key={topLevelValueFor(tab)}
								value={topLevelValueFor(tab)}
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>

			{activeTopLevel?.kind === 'group' && (
				<div className='mb-4 overflow-x-auto'>
					<Tabs
						value={activeTab}
						onValueChange={handleSubTabChange}
					>
						<TabsList>
							{activeTopLevel.children.map((child) => (
								<TabsTrigger
									key={child.id}
									value={child.id}
								>
									{child.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</div>
			)}

			{renderExample(activeTab)}
		</div>
	)
}
