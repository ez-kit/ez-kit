import { notFound } from 'next/navigation'

import { docsSections, getSection, getSectionIndex } from '../../../../lib/llms'
import { siteUrl } from '../../../../lib/shared'

export const revalidate = false

export async function GET(_req: Request, { params }: RouteContext<'/llms.txt/[section]'>) {
	const { section } = await params
	const meta = getSection(section)
	const index = getSectionIndex(section)
	if (!meta || !index) notFound()

	const header = `# ez-kit — ${meta.title}

> Documentation for the ez-kit ${meta.title} package only. The whole site: ${siteUrl}/llms.txt

- Every page below is available as raw Markdown at \`/llms.mdx<page-url>\`.
- This section as a single Markdown file: ${siteUrl}/llms-full.txt/${section}
`

	return new Response(`${header}\n${index}`, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	})
}

export function generateStaticParams() {
	return docsSections.map(({ slug }) => ({ section: slug }))
}
