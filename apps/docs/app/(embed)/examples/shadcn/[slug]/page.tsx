import { notFound } from 'next/navigation'

import manifest from '@/shared/data-grid/examples/manifest.json'
import { exampleModules } from '@/shared/data-grid/examples/registry'
import { DataGridTypeProvider } from '@/shared/DataGrid'

type ManifestEntry = { id: string; sourceFile: string; exportName: string }

const entries = manifest as ManifestEntry[]

export function generateStaticParams() {
	return entries.map((entry) => ({ slug: entry.id }))
}

export default async function ShadcnExamplePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const entry = entries.find((item) => item.id === slug)

	if (!entry) {
		notFound()
	}

	// Turbopack cannot statically analyze `import(variable)` over a directory whose
	// files are 'use client' components consumed from a Server Component (it leaks
	// client-only hooks into the server compile graph). Resolve via the hand-maintained
	// registry instead — see shared/data-grid/examples/registry.ts.
	const loadModule = exampleModules[entry.sourceFile]

	if (!loadModule) {
		throw new Error(`Example "${slug}" has no registry entry for "${entry.sourceFile}"`)
	}

	const mod = await loadModule()
	const Example = mod[entry.exportName]

	if (!Example) {
		throw new Error(`Example "${slug}" has no export "${entry.exportName}"`)
	}

	return (
		<DataGridTypeProvider type='shadcn'>
			<Example />
		</DataGridTypeProvider>
	)
}
