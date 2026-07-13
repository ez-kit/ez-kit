'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

import manifest from '@/shared/data-grid/examples/manifest.json'
import { exampleModules } from '@/shared/data-grid/examples/registry'
import { DataGridTypeProvider } from '@/shared/DataGrid'

type ManifestEntry = { id: string; sourceFile: string; exportName: string }
type ExampleKit = 'heroui' | 'shadcn'

const entries = manifest as ManifestEntry[]

interface ExampleRendererProps {
	kit: ExampleKit
	slug: string
}

// The `@ez-kit/data-grid-heroui` bundle contains a dynamic `require` that Turbopack/RSC
// cannot execute during server-side rendering (`Error: dynamic usage of require is not
// supported`). SSR of example content is not required by spec, so every example — for
// both kits — renders client-only via `next/dynamic` with `ssr: false`. This keeps the
// shadcn and heroui routes on one shared, symmetric rendering path instead of shadcn
// SSRing while heroui silently falls back to client rendering.
function loadExample(slug: string) {
	const entry = entries.find((item) => item.id === slug)

	if (!entry) {
		throw new Error(`Example "${slug}" has no manifest entry`)
	}

	const loadModule = exampleModules[entry.sourceFile]

	if (!loadModule) {
		throw new Error(`Example "${slug}" has no registry entry for "${entry.sourceFile}"`)
	}

	return loadModule().then((mod) => {
		const Example = mod[entry.exportName]

		if (!Example) {
			throw new Error(`Example "${slug}" has no export "${entry.exportName}"`)
		}

		return { default: Example }
	})
}

export function ExampleRenderer({ kit, slug }: ExampleRendererProps) {
	// `next/dynamic` returns a fresh component identity on every call, so calling it inline in
	// the render body would remount the example (losing grid state, re-flashing the loading
	// fallback) on every re-render. The loaded module depends only on `slug`, so memoize the
	// dynamic component to keep its identity stable per slug.
	const Example = useMemo(() => dynamic(() => loadExample(slug), { ssr: false }), [slug])

	return (
		<DataGridTypeProvider type={kit}>
			<Example />
		</DataGridTypeProvider>
	)
}
