import { notFound } from 'next/navigation'

import { ExampleRenderer } from '@/components/example-renderer'
import { exampleEntries, findExample } from '@/shared/examples-registry'

export function generateStaticParams() {
	return exampleEntries.map((entry) => ({ slug: entry.id }))
}

export default async function ShadcnExamplePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params

	if (!findExample(slug)) {
		notFound()
	}

	return (
		<ExampleRenderer
			kit='shadcn'
			slug={slug}
		/>
	)
}
