'use client'

import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigate, useNavigationType } from 'react-router'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'

import type { RenderScopedAdapter } from '../provider'
import type { SyncSourcePort } from '../types'

const useNavigationEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const NAVIGATION_OWNER = '@ez-kit/store-persist:url-navigation'

function navigationOwner(state: unknown): unknown {
	return state !== null && typeof state === 'object' && NAVIGATION_OWNER in state ? state[NAVIGATION_OWNER] : undefined
}

/** Render-scoped URL adapter for react-router v6/v7 (BrowserRouter / data routers). */
export const reactRouterAdapter: RenderScopedAdapter = {
	source: URL_SOURCE,
	mergeMeta: urlMetaMerge,
	defaultMeta: { history: UrlHistory.Replace },

	usePort() {
		const location = useLocation()
		const navigate = useNavigate()
		const navigationType = useNavigationType()
		const owner = useId()
		const sequence = useRef(0)
		const ownNavigations = useRef<string[]>([])
		const listeners = useRef(new Set<() => void>())
		const previousLocation = useRef(location.key)
		useNavigationEffect(() => {
			if (previousLocation.current === location.key) return
			previousLocation.current = location.key
			const token = navigationOwner(location.state)
			const acknowledged = typeof token === 'string' ? ownNavigations.current.indexOf(token) : -1
			if (navigationType !== NavigationType.Pop && acknowledged >= 0) {
				ownNavigations.current.splice(0, acknowledged + 1)
				return
			}
			ownNavigations.current.length = 0
			for (const listener of [...listeners.current]) listener()
		}, [location.key, location.state, navigationType])
		const locationRef = useRef(location)
		locationRef.current = location
		const navigateRef = useRef(navigate)
		navigateRef.current = navigate

		const portRef = useRef<SyncSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(locationRef.current.search),
			subscribe: (onNavigate) => {
				listeners.current.add(onNavigate)
				return () => {
					listeners.current.delete(onNavigate)
				}
			},
			commit: (next, history) => {
				const token = `${owner}:${String(++sequence.current)}`
				ownNavigations.current.push(token)
				const current = locationRef.current
				const query = next.toString()
				const state: unknown = current.state
				try {
					// Keep application object state while tagging our own navigation. URL equality alone
					// cannot distinguish an external link to an earlier pending target from its ACK.
					void navigateRef.current(
						{ pathname: current.pathname, search: query ? `?${query}` : '', hash: current.hash },
						{
							replace: history === UrlHistory.Replace,
							state: {
								...(state !== null && typeof state === 'object' ? state : {}),
								[NAVIGATION_OWNER]: token,
							},
						},
					)
				} catch (error) {
					const index = ownNavigations.current.indexOf(token)
					if (index >= 0) ownNavigations.current.splice(index, 1)
					throw error
				}
			},
		})

		return { port: portRef.current, changeKey: JSON.stringify([location.key, location.search]) }
	},
}
