'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

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

const useActiveTab = () => {
	const searchParams = useSearchParams()
	const activeTab = (searchParams.get('tab') ?? 'base') as DataGridExampleId
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

	return (
		<div className='[&_input]:border p-8'>
			<h1 className='mb-6'>DataGrid Sandbox - {type}</h1>

			<div className='flex gap-0.5 border-b border-zinc-200 mb-4 overflow-x-auto'>
				{TOP_LEVEL_TABS.map((tab) => {
					const isActive =
						tab.kind === 'single'
							? activeTab === tab.id
							: activeTopLevel?.kind === 'group' && activeTopLevel.id === tab.id

					return (
						<button
							key={tab.kind === 'single' ? tab.id : `group:${tab.id}`}
							onClick={() => {
								if (tab.kind === 'single') {
									setActiveTab(tab.id)
								} else {
									const first = tab.children[0]
									if (first) setActiveTab(first.id)
								}
							}}
							className='p-2 border-b-2 border-transparent bg-none cursor-pointer font-semibold text-zinc-900 text-zinc-500 mb-[-1px] transition-colors duration-150'
							style={isActive ? { borderColor: '#0f172a' } : {}}
						>
							{tab.label}
						</button>
					)
				})}
			</div>

			{activeTopLevel?.kind === 'group' && (
				<div className='flex gap-0.5 mb-4 overflow-x-auto'>
					{activeTopLevel.children.map((child) => (
						<button
							key={child.id}
							onClick={() => {
								setActiveTab(child.id)
							}}
							className='px-3 py-1 rounded-full text-sm cursor-pointer transition-colors duration-150 border'
							style={
								activeTab === child.id
									? { background: '#0f172a', color: 'white', borderColor: '#0f172a' }
									: { background: 'transparent', color: '#475569', borderColor: '#e4e4e7' }
							}
						>
							{child.label}
						</button>
					))}
				</div>
			)}

			{renderExample(activeTab)}
		</div>
	)
}
