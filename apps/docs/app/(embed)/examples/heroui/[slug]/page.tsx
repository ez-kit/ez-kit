import { notFound } from 'next/navigation'

import { ExampleRenderer } from '@/components/example-renderer'
import manifest from '@/shared/data-grid/examples/manifest.json'

type ManifestEntry = { id: string; sourceFile: string; exportName: string }

const entries = manifest as ManifestEntry[]

export function generateStaticParams() {
	return entries.map((entry) => ({ slug: entry.id }))
}

export default async function HerouiExamplePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const entry = entries.find((item) => item.id === slug)

	if (!entry) {
		notFound()
	}

	return (
		<ExampleRenderer
			kit='heroui'
			slug={slug}
		/>
	)
}
