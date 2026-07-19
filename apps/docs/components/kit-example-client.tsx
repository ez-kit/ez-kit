'use client'

import { Suspense } from 'react'

import { ExampleCard, ExampleShell } from '@/components/example-card'
import { ExampleFrame } from '@/components/example-frame'
import { rewriteExampleImports } from '@/components/rewrite-example-imports'
import { SourcePanel } from '@/components/source-panel'
import { useUrlState } from '@/hooks/use-url-state'

import type { DataGridDocsExampleFlavor } from './kit-example'

const FLAVOR_PARAM = 'kit'
const DEFAULT_FLAVOR: DataGridDocsExampleFlavor = 'shadcn'

const FLAVORS: readonly { value: DataGridDocsExampleFlavor; label: string }[] = [
	{ value: 'shadcn', label: 'shadcn' },
	{ value: 'heroui', label: 'HeroUI' },
]

const FLAVOR_VALUES: readonly DataGridDocsExampleFlavor[] = FLAVORS.map((flavor) => flavor.value)

type ClientProps = {
	exampleId: string
	source: string
	defaultType?: DataGridDocsExampleFlavor | undefined
	lockFlavor: boolean
}

export function KitExampleClient({ exampleId, source, defaultType, lockFlavor }: ClientProps) {
	// Invariant: `lockFlavor` always arrives with a `defaultType`. The server
	// wrapper in `data-grid-docs-example.tsx` throws when `lockFlavor` is set
	// without one, so the `&& defaultType` guard here can never fall through to
	// the unlocked UI in practice.
	if (lockFlavor && defaultType) {
		return (
			<ExampleShell>
				<ExampleCard
					view={
						<ExampleFrame
							kit={defaultType}
							slug={exampleId}
						/>
					}
					source={<SourcePanel source={rewriteExampleImports(source, defaultType)} />}
				/>
			</ExampleShell>
		)
	}

	return (
		<Suspense
			fallback={
				<Switcher
					exampleId={exampleId}
					source={source}
					flavor={defaultType ?? DEFAULT_FLAVOR}
				/>
			}
		>
			<UrlSwitcher
				exampleId={exampleId}
				source={source}
				defaultType={defaultType ?? DEFAULT_FLAVOR}
			/>
		</Suspense>
	)
}

function UrlSwitcher({
	exampleId,
	source,
	defaultType,
}: {
	exampleId: string
	source: string
	defaultType: DataGridDocsExampleFlavor
}) {
	const [flavor, setFlavor] = useUrlState<DataGridDocsExampleFlavor>(FLAVOR_PARAM, {
		allowedValues: FLAVOR_VALUES,
		defaultValue: defaultType,
	})
	return (
		<Switcher
			exampleId={exampleId}
			source={source}
			flavor={flavor}
			onSelect={setFlavor}
		/>
	)
}

function Switcher({
	exampleId,
	source,
	flavor,
	onSelect,
}: {
	exampleId: string
	source: string
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
					<ExampleFrame
						kit={flavor}
						slug={exampleId}
					/>
				}
				source={<SourcePanel source={rewriteExampleImports(source, flavor)} />}
			/>
		</ExampleShell>
	)
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
