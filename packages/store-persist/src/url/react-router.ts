'use client'

import { useContext, useEffect, useId, useInsertionEffect, useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigate, useNavigationType } from 'react-router'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'
import {
	acknowledgeNavigation,
	DataRouterContext,
	DataRouterStateContext,
	NAVIGATION_OWNER,
	navigationOwner,
	observableRouter,
} from './react-router-navigation'

import type { RenderScopedAdapter } from '../provider'
import type { SyncReadSourcePort } from '../types'

const useNavigationEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
/** Render-scoped URL adapter for react-router v6/v7 (BrowserRouter / data routers). */
export const reactRouterAdapter: RenderScopedAdapter = {
	source: URL_SOURCE,
	mergeMeta: urlMetaMerge,
	defaultMeta: { history: UrlHistory.Replace },

	usePort() {
		const location = useLocation()
		const navigate = useNavigate()
		const dataRouter = observableRouter(useContext(DataRouterContext), useContext(DataRouterStateContext))
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
		const snapshot = { location, navigate, dataRouter }
		const renderSnapshot = useRef(snapshot)
		renderSnapshot.current = snapshot
		const committed = useRef(snapshot)
		const commitListeners = useRef(new Set<(mounted: boolean) => void>())
		useInsertionEffect(() => {
			committed.current = snapshot
			for (const listener of [...commitListeners.current]) listener(true)
		})
		useInsertionEffect(
			() => () => {
				for (const listener of [...commitListeners.current]) listener(false)
			},
			[],
		)

		const portRef = useRef<SyncReadSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(committed.current.location.search),
			readRender: () => new URLSearchParams(renderSnapshot.current.location.search),
			subscribe: (onNavigate) => {
				listeners.current.add(onNavigate)
				return () => {
					listeners.current.delete(onNavigate)
				}
			},
			commit: (next, history) => {
				const token = `${owner}:${String(++sequence.current)}`
				ownNavigations.current.push(token)
				const current = committed.current
				const query = next.toString()
				const state: unknown = current.location.state
				const target = {
					pathname: current.location.pathname,
					search: query ? `?${query}` : '',
					hash: current.location.hash,
				}
				const options = {
					replace: history === UrlHistory.Replace,
					state: { ...(state !== null && typeof state === 'object' ? state : {}), [NAVIGATION_OWNER]: token },
				}
				const fail = (error: unknown): never => {
					const index = ownNavigations.current.indexOf(token)
					if (index >= 0) ownNavigations.current.splice(index, 1)
					throw error
				}
				try {
					if (current.dataRouter)
						return acknowledgeNavigation(current.dataRouter, target, options, token, {
							get: () => committed.current.location,
							subscribe: (listener) => {
								commitListeners.current.add(listener)
								return () => {
									commitListeners.current.delete(listener)
								}
							},
						}).catch(fail)
					const result = current.navigate(target, options)
					if (result !== undefined) return Promise.resolve(result).catch(fail)
				} catch (error) {
					fail(error)
				}
			},
		})

		return { port: portRef.current, changeKey: JSON.stringify([location.key, location.search]) }
	},
}
