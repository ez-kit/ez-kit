'use client'

import { Suspense } from 'react'

import { useUrlState } from '../hooks/use-url-state'
import { dataGridPrimitiveExamples } from '../shared/data-grid/examples/generated/data-grid-primitive'
import { DataGridSandpackExample } from '../shared/data-grid/sandpack/DataGridSandpackExample'
import { DataGridTypeProvider } from '../shared/DataGrid'

import { DataGridSourcePanel } from './data-grid-source-panel'

import type { DataGridSandpackExampleId } from '../shared/data-grid/sandpack/DataGridSandpackExample'

export type DataGridDocsExampleFlavor = 'shadcn' | 'heroui' | 'shadcn-native'

export type DataGridDocsExampleProps = {
	exampleId: DataGridSandpackExampleId
	defaultType?: DataGridDocsExampleFlavor
	lockFlavor?: boolean
}

/** URL search param (and `localStorage` mirror key) that drives the active flavor. */
const FLAVOR_PARAM = 'kit'
const DEFAULT_FLAVOR: DataGridDocsExampleFlavor = 'shadcn'

const FLAVORS: readonly { value: DataGridDocsExampleFlavor; label: string }[] = [
	{ value: 'shadcn', label: 'shadcn' },
	{ value: 'heroui', label: 'HeroUI' },
	{ value: 'shadcn-native', label: 'shadcn-native' },
]

const FLAVOR_VALUES: readonly DataGridDocsExampleFlavor[] = FLAVORS.map((flavor) => flavor.value)

const ExampleCard = ({ view, source }: { view: React.ReactNode; source: React.ReactNode }) => {
	return (
		<div className='flex flex-col flex-1 border border-fd-border rounded-lg overflow-hidden'>
			<div className='border-b border-fd-border p-2'>{view}</div>
			{source && <div className=''>{source}</div>}
		</div>
	)
}

export function DataGridDocsExample({ exampleId, defaultType, lockFlavor }: DataGridDocsExampleProps) {
	if (lockFlavor === true && defaultType === undefined) {
		throw new Error(
			'<DataGridDocsExample />: `lockFlavor` requires `defaultType` to be set. Pass `defaultType="shadcn"`, `defaultType="heroui"`, or `defaultType="shadcn-native"`.',
		)
	}

	// Locked examples never read the URL — the flavor is fixed by the author.
	if (lockFlavor === true && defaultType !== undefined) {
		return (
			<ExampleShell>
				<ExampleCard
					view={
						<FlavorExample
							exampleId={exampleId}
							flavor={defaultType}
						/>
					}
					source={<DataGridSourcePanel exampleId={exampleId} />}
				/>
			</ExampleShell>
		)
	}

	const initialFlavor = defaultType ?? DEFAULT_FLAVOR

	// `useUrlState` reads `useSearchParams`, which Next requires to live under a
	// Suspense boundary so statically-rendered docs pages don't bail out.
	return (
		<Suspense
			fallback={
				<FlavorSwitcherView
					exampleId={exampleId}
					flavor={initialFlavor}
				/>
			}
		>
			<FlavorSwitcher
				exampleId={exampleId}
				defaultType={initialFlavor}
			/>
		</Suspense>
	)
}

function FlavorSwitcher({
	exampleId,
	defaultType,
}: {
	exampleId: DataGridSandpackExampleId
	defaultType: DataGridDocsExampleFlavor
}) {
	const [flavor, setFlavor] = useUrlState<DataGridDocsExampleFlavor>(FLAVOR_PARAM, {
		allowedValues: FLAVOR_VALUES,
		defaultValue: defaultType,
	})

	return (
		<FlavorSwitcherView
			exampleId={exampleId}
			flavor={flavor}
			onSelect={setFlavor}
		/>
	)
}

function FlavorSwitcherView({
	exampleId,
	flavor,
	onSelect,
}: {
	exampleId: DataGridSandpackExampleId
	flavor: DataGridDocsExampleFlavor
	onSelect?: ((flavor: DataGridDocsExampleFlavor) => void) | undefined
}) {
	return (
		<ExampleShell>
			<FlavorTabs
				active={flavor}
				onSelect={onSelect}
			/>
			<ExampleCard
				view={
					<FlavorExample
						exampleId={exampleId}
						flavor={flavor}
					/>
				}
				source={<DataGridSourcePanel exampleId={exampleId} />}
			/>
		</ExampleShell>
	)
}

function ExampleShell({ children }: { children: React.ReactNode }) {
	return <div className='not-prose flex flex-col gap-3'>{children}</div>
}

function FlavorTabs({
	active,
	onSelect,
}: {
	active: DataGridDocsExampleFlavor
	onSelect?: ((flavor: DataGridDocsExampleFlavor) => void) | undefined
}) {
	return (
		<div
			role='tablist'
			aria-label='Flavor'
			className='inline-flex w-fit gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1 text-sm dark:border-zinc-800 dark:bg-zinc-900'
		>
			{FLAVORS.map(({ value, label }) => {
				const isActive = active === value
				return (
					<button
						key={value}
						type='button'
						role='tab'
						aria-selected={isActive}
						onClick={
							onSelect
								? () => {
										onSelect(value)
									}
								: undefined
						}
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
	)
}

function FlavorExample({
	exampleId,
	flavor,
}: {
	exampleId: DataGridSandpackExampleId
	flavor: DataGridDocsExampleFlavor
}) {
	if (flavor === 'shadcn-native') {
		const Example = dataGridPrimitiveExamples[exampleId]

		return (
			<DataGridTypeProvider type='shadcn'>
				<Suspense fallback={<div>Loading…</div>}>
					<Example />
				</Suspense>
			</DataGridTypeProvider>
		)
	}

	return (
		<DataGridSandpackExample
			exampleId={exampleId}
			type={flavor}
		/>
	)
}
