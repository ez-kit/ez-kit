'use client'

import { Suspense, useState } from 'react'

import { dataGridPrimitiveExamples } from '../shared/data-grid/examples/generated/data-grid-primitive'
import { DataGridTypeProvider } from '../shared/DataGrid'
import { DataGridSandpackExample } from '../shared/data-grid/sandpack/DataGridSandpackExample'
import { DataGridSourcePanel } from './data-grid-source-panel'

import type { DataGridSandpackExampleId } from '../shared/data-grid/sandpack/DataGridSandpackExample'

export type DataGridDocsExampleFlavor = 'shadcn' | 'heroui' | 'shadcn-native'

export interface DataGridDocsExampleProps {
	exampleId: DataGridSandpackExampleId
	defaultType?: DataGridDocsExampleFlavor
	lockFlavor?: boolean
}

const FLAVORS: ReadonlyArray<{ value: DataGridDocsExampleFlavor; label: string }> = [
	{ value: 'shadcn', label: 'shadcn' },
	{ value: 'heroui', label: 'HeroUI' },
	{ value: 'shadcn-native', label: 'shadcn-native' },
]

export function DataGridDocsExample({ exampleId, defaultType, lockFlavor }: DataGridDocsExampleProps) {
	if (lockFlavor === true && defaultType === undefined) {
		throw new Error(
			'<DataGridDocsExample />: `lockFlavor` requires `defaultType` to be set. Pass `defaultType="shadcn"`, `defaultType="heroui"`, or `defaultType="shadcn-native"`.',
		)
	}

	const [flavor, setFlavor] = useState<DataGridDocsExampleFlavor>(defaultType ?? 'shadcn')

	return (
		<div className='not-prose flex flex-col gap-3'>
			{lockFlavor !== true ? (
				<div
					role='tablist'
					aria-label='Flavor'
					className='inline-flex w-fit gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1 text-sm dark:border-zinc-800 dark:bg-zinc-900'
				>
					{FLAVORS.map(({ value, label }) => {
						const isActive = flavor === value
						return (
							<button
								key={value}
								type='button'
								role='tab'
								aria-selected={isActive}
								onClick={() => setFlavor(value)}
								className={
									isActive
										? 'rounded bg-white px-3 py-1 font-semibold underline underline-offset-4 shadow-sm dark:bg-zinc-800'
										: 'rounded px-3 py-1 font-normal text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
								}
							>
								{label}
							</button>
						)
					})}
				</div>
			) : null}
			{flavor === 'shadcn-native' ? (
				<DataGridNativeExample exampleId={exampleId} />
			) : (
				<DataGridSandpackExample exampleId={exampleId} type={flavor} />
			)}
			<DataGridSourcePanel exampleId={exampleId} />
		</div>
	)
}

function DataGridNativeExample({ exampleId }: { exampleId: DataGridSandpackExampleId }) {
	const Example = dataGridPrimitiveExamples[exampleId]

	return (
		<DataGridTypeProvider type='shadcn'>
			<Suspense fallback={<div>Loading…</div>}>
				<Example />
			</Suspense>
		</DataGridTypeProvider>
	)
}
