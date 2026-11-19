'use client'

import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'
import { useEffect, useInsertionEffect, useLayoutEffect, useRef } from 'react'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'

import type { RenderScopedAdapter } from '../provider'
import type { SyncSourcePort } from '../types'

const useNavigationEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

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
		const snapshot = { search, router, pathname, fromPop: false }
		const renderSnapshot = useRef(snapshot)
		renderSnapshot.current = snapshot
		const committed = useRef(snapshot)
		// Publish operational refs before descendant layout effects, never during an abandoned render.
		useInsertionEffect(() => {
			committed.current = snapshot
		})

		const listeners = useRef(new Set<() => void>())
		const previousPathname = useRef(pathname)
		useNavigationEffect(() => {
			if (previousPathname.current === pathname) return
			previousPathname.current = pathname
			for (const listener of [...listeners.current]) listener()
		}, [pathname])

		const portRef = useRef<SyncSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(committed.current.search),
			readRender: () => new URLSearchParams(renderSnapshot.current.search),
			subscribe: (onNavigate) => {
				listeners.current.add(onNavigate)
				const onPopState = (): void => {
					committed.current = {
						...committed.current,
						search: window.location.search.slice(1),
						fromPop: true,
					}
					onNavigate()
				}
				window.addEventListener('popstate', onPopState)
				return () => {
					listeners.current.delete(onNavigate)
					window.removeEventListener('popstate', onPopState)
				}
			},
			commit: (next, history) => {
				const query = next.toString()
				const hash = typeof window === 'undefined' ? '' : window.location.hash
				// The browser's POP destination already includes basePath. A query-relative href
				// addresses that destination while Next catches up with its committed pathname.
				const url = committed.current.fromPop
					? `?${query}${hash}`
					: `${committed.current.pathname}${query ? `?${query}` : ''}${hash}`
				if (history === UrlHistory.Push) {
					committed.current.router.push(url)
				} else {
					committed.current.router.replace(url)
				}
			},
		})

		return { port: portRef.current, changeKey: JSON.stringify([pathname, search]) }
	},
}
