import { loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'collections/server';

import { docsContentRoute, docsImageRoute, docsRoute } from './shared'

export const source = loader({
	baseUrl: docsRoute,
	source: (docs as any).toFumadocsSource(),
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
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
	const processed = await (page.data as any).getText('processed')

	return `# ${page.data.title} (${page.url})

${processed}`
}
