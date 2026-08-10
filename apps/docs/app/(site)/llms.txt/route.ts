import { llms } from 'fumadocs-core/source'

import { stripLeadingHeading } from '../../../lib/llms'
import { appName, docsContentRoute, siteUrl } from '../../../lib/shared'
import { source } from '../../../lib/source'

export const revalidate = false

/** llms.txt opens with the project name and a one-line summary, per the llms.txt convention. */
const HEADER = `# ${appName}

> ESM-only React utility libraries: headless data grid (shadcn / HeroUI flavours), form kit,
> context-scoped state stores for Zustand and Valtio, and small UI/styling helpers.
> Published on npm under the \`@ez-kit/*\` scope.

- Every page is available as raw Markdown at \`${docsContentRoute}/<page-slug>\`
  (e.g. ${siteUrl}${docsContentRoute}/data-grid/getting-started).
- The full documentation as a single Markdown file: ${siteUrl}/llms-full.txt
- Scoped to one package: ${siteUrl}/llms.txt/<package> and ${siteUrl}/llms-full.txt/<package>
  (e.g. ${siteUrl}/llms-full.txt/zu-store).
- Source: https://github.com/ez-kit/ez-kit
`

export function GET() {
	return new Response(`${HEADER}\n${stripLeadingHeading(llms(source).index())}`, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	})
}
