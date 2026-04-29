import { loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'

import { docs } from 'collections/server';

import { docsContentRoute, docsImageRoute, docsRoute } from './shared'

import type { loader as createLoader } from 'fumadocs-core/source'

type LoaderSource = Parameters<typeof createLoader>[0]['source']
type DocsCollection = {
	toFumadocsSource: () => LoaderSource
}

type PageWithText = (typeof source)['$inferPage'] & {
	data: (typeof source)['$inferPage']['data'] & {
		getText: (mode: 'processed') => Promise<string>
	}
}

const docsCollection = docs as DocsCollection

export const source = loader({
	baseUrl: docsRoute,
	source: docsCollection.toFumadocsSource(),
	plugins: [lucideIconsPlugin()],
})

export function getPageImage(page: (typeof source)['$inferPage']) {
	const segments = [...page.slugs, 'image.png']

	return {
		segments,
		url: `${docsImageRoute}/${segments.join('/')}`,
	}
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
	const segments = [...page.slugs, 'content.md']

	return {
		segments,
		url: `${docsContentRoute}/${segments.join('/')}`,
	}
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
	const textPage = page as PageWithText
	const processed = await textPage.data.getText('processed')

	return `# ${textPage.data.title ?? textPage.url} (${textPage.url})

${processed}`
}
