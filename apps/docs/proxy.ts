import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation'
import { NextResponse } from 'next/server'

import { docsContentRoute, docsRoute } from '@/lib/shared'

import type { NextRequest } from 'next/server'


const rewriteDocs = rewritePath(`${docsRoute}{/*path}`, `${docsContentRoute}{/*path}/content.md`)
const rewriteSuffix = rewritePath(`${docsRoute}{/*path}.mdx`, `${docsContentRoute}{/*path}/content.md`)

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
