'use client'

import { Suspense } from 'react'

import { ExampleFrame } from '@/components/example-frame'
import { ExamplePreview } from '@/components/example-preview'
import { rewriteExampleImports } from '@/components/rewrite-example-imports'
import { useUrlState } from '@/hooks/use-url-state'

import type { DataGridDocsExampleFlavor } from './kit-example'
import type { ExampleFile } from '@/components/example-file'

const FLAVOR_PARAM = 'kit'
const DEFAULT_FLAVOR: DataGridDocsExampleFlavor = 'shadcn'

const FLAVORS: readonly { value: DataGridDocsExampleFlavor; label: string }[] = [
	{ value: 'shadcn', label: 'shadcn' },
	{ value: 'heroui', label: 'HeroUI' },
]

const FLAVOR_VALUES: readonly DataGridDocsExampleFlavor[] = FLAVORS.map((flavor) => flavor.value)

function rewriteFiles(files: readonly ExampleFile[], flavor: DataGridDocsExampleFlavor): ExampleFile[] {
	return files.map((file) => ({ ...file, source: rewriteExampleImports(file.source, flavor) }))
}

type ClientProps = {
	exampleId: string
	files: readonly ExampleFile[]
	defaultType?: DataGridDocsExampleFlavor | undefined
	lockFlavor: boolean
}

export function KitExampleClient({ exampleId, files, defaultType, lockFlavor }: ClientProps) {
	// Invariant: `lockFlavor` always arrives with a `defaultType`. The server
	// wrapper in `data-grid-docs-example.tsx` throws when `lockFlavor` is set
	// without one, so the `&& defaultType` guard here can never fall through to
	// the unlocked UI in practice.
	if (lockFlavor && defaultType) {
		return (
			<ExamplePreview
				view={
					<ExampleFrame
						kit={defaultType}
						slug={exampleId}
					/>
				}
				files={rewriteFiles(files, defaultType)}
			/>
		)
	}

	return (
		<Suspense
			fallback={
				<Switcher
					exampleId={exampleId}
					files={files}
					flavor={defaultType ?? DEFAULT_FLAVOR}
				/>
			}
		>
			<UrlSwitcher
				exampleId={exampleId}
				files={files}
				defaultType={defaultType ?? DEFAULT_FLAVOR}
			/>
		</Suspense>
	)
}

function UrlSwitcher({
	exampleId,
	files,
	defaultType,
}: {
	exampleId: string
	files: readonly ExampleFile[]
	defaultType: DataGridDocsExampleFlavor
}) {
	const [flavor, setFlavor] = useUrlState<DataGridDocsExampleFlavor>(FLAVOR_PARAM, {
		allowedValues: FLAVOR_VALUES,
		defaultValue: defaultType,
	})
	return (
		<Switcher
			exampleId={exampleId}
			files={files}
			flavor={flavor}
			onSelect={setFlavor}
		/>
	)
}

function Switcher({
	exampleId,
	files,
	flavor,
	onSelect,
}: {
	exampleId: string
	files: readonly ExampleFile[]
	flavor: DataGridDocsExampleFlavor
	onSelect?: ((flavor: DataGridDocsExampleFlavor) => void) | undefined
}) {
	return (
		<ExamplePreview
			view={
				<ExampleFrame
					kit={flavor}
					slug={exampleId}
				/>
			}
			files={rewriteFiles(files, flavor)}
			header={
				<FlavorTabs
					active={flavor}
					onSelect={onSelect}
				/>
			}
		/>
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
