'use client'

import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'
import { useRef } from 'react'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'

import type { RenderScopedAdapter } from '../provider'
import type { SyncSourcePort } from '../types'

/**
 * Render-scoped URL adapter for the Next.js App Router. Writes go through `router.replace`/`push`
 * (re-running server components); client-held Valtio state survives the refetch.
 */
export const nextAdapter: RenderScopedAdapter = {
	source: URL_SOURCE,
	mergeMeta: urlMetaMerge,
	defaultMeta: { history: UrlHistory.Replace },

	usePort() {
		const params = useNextSearchParams()
		const router = useRouter()
		const pathname = usePathname()

		const search = params.toString()
		const searchRef = useRef(search)
		searchRef.current = search
		const routerRef = useRef(router)
		routerRef.current = router
		const pathnameRef = useRef(pathname)
		pathnameRef.current = pathname

		const portRef = useRef<SyncSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(searchRef.current),
			commit: (next, history) => {
				const query = next.toString()
				const url = query ? `${pathnameRef.current}?${query}` : pathnameRef.current
				if (history === UrlHistory.Push) {
					routerRef.current.push(url)
				} else {
					routerRef.current.replace(url)
				}
			},
		})

		return { port: portRef.current, changeKey: search }
	},
}
