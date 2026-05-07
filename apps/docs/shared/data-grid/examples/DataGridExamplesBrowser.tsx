'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useDataGridType } from 'shared/DataGrid'

import { dataGridExamplesManifest, type DataGridExampleId } from './generated/data-grid-primitive'

type DataGridExamplesBrowserProps = {
	renderExample: (exampleId: DataGridExampleId) => React.ReactNode
}

const TABS = dataGridExamplesManifest.map(({ id, label }) => ({ id, label }))

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
	console.log('activeTab', activeTab)
	const { type } = useDataGridType()

	return (
		<div className='[&_input]:border p-8'>
			<h1 className='mb-6'>DataGrid Sandbox - {type}</h1>

			<div className='flex gap-0.5 border-b border-zinc-200 mb-4 overflow-x-auto'>
				{TABS.map((tab) => (
					<button
						key={tab.id}
						onClick={() => {
							setActiveTab(tab.id)
						}}
						className='p-2 border-b-2 border-transparent bg-none cursor-pointer font-semibold text-zinc-900 text-zinc-500 mb-[-1px] transition-colors duration-150'
						style={activeTab === tab.id ? { borderColor: '#0f172a' } : {}}
					>
						{tab.label}
					</button>
				))}
			</div>

			{renderExample(activeTab)}
		</div>
	)
}
