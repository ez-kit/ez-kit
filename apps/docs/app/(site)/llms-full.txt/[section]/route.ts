import { notFound } from 'next/navigation'

import { docsSections, getSectionFullText } from '../../../../lib/llms'

export const revalidate = false

export async function GET(_req: Request, { params }: RouteContext<'/llms-full.txt/[section]'>) {
	const { section } = await params
	const text = await getSectionFullText(section)
	if (text === undefined) notFound()

	return new Response(text, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	})
}

export function generateStaticParams() {
	return docsSections.map(({ slug }) => ({ section: slug }))
}
