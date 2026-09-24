import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation'
import { NextResponse } from 'next/server'

import { docsContentRoute, docsRoute } from '@/lib/shared'

import type { NextRequest } from 'next/server'

/*
 * The destination is the content route **plus the slug and nothing else**. Both of these used to
 * append `/content.md`, which is a path no route serves: `app/(site)/llms.mdx/docs/[[...slug]]`
 * hands its whole slug to `source.getPage()`, so the extra segment made the slug
 * `['data-grid', 'sorting', 'content.md']`, which resolves to no page and 404s. That is why the
 * `.mdx` suffix and `Accept: text/markdown` answered 404 for *every* page while
 * `/llms.mdx/docs/<slug>` served markdown fine — the two mechanisms pointed one segment past the
 * route. Middleware runs before routing, so this file is what decides it; the `rewrites()` entry
 * in `next.config.mjs` has the right destination but sits in `afterFiles`, where `/docs/[[...slug]]`
 * has already matched `<slug>.mdx` as a slug and answered.
 */
const rewriteDocs = rewritePath(`${docsRoute}{/*path}`, `${docsContentRoute}{/*path}`)
const rewriteSuffix = rewritePath(`${docsRoute}{/*path}.mdx`, `${docsContentRoute}{/*path}`)

export default function proxy(request: NextRequest) {
	const result = rewriteSuffix.rewrite(request.nextUrl.pathname)
	if (result) {
		return NextResponse.rewrite(new URL(result, request.nextUrl))
	}

	if (isMarkdownPreferred(request)) {
		const result = rewriteDocs.rewrite(request.nextUrl.pathname)

		if (result) {
			return NextResponse.rewrite(new URL(result, request.nextUrl))
		}
	}

	return NextResponse.next()
}
