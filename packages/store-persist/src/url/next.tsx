'use client'

import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef } from 'react'

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
		const searchRef = useRef(search)
		searchRef.current = search
		const routerRef = useRef(router)
		routerRef.current = router
		const pathnameRef = useRef(pathname)
		pathnameRef.current = pathname

		const listeners = useRef(new Set<() => void>())
		const previousPathname = useRef(pathname)
		useNavigationEffect(() => {
			if (previousPathname.current === pathname) return
			previousPathname.current = pathname
			for (const listener of [...listeners.current]) listener()
		}, [pathname])

		const portRef = useRef<SyncSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(searchRef.current),
			subscribe: (onNavigate) => {
				listeners.current.add(onNavigate)
				const onPopState = (): void => {
					searchRef.current = window.location.search.slice(1)
					pathnameRef.current = window.location.pathname
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
				const url = `${pathnameRef.current}${query ? `?${query}` : ''}${hash}`
				if (history === UrlHistory.Push) {
					routerRef.current.push(url)
				} else {
					routerRef.current.replace(url)
				}
			},
		})

		return { port: portRef.current, changeKey: JSON.stringify([pathname, search]) }
	},
}
