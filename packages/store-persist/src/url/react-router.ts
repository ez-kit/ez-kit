'use client'

import { useContext, useEffect, useInsertionEffect, useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigate, useNavigationType } from 'react-router'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'
import {
	acknowledgeNavigation,
	DataRouterContext,
	DataRouterStateContext,
	historyNavigator,
	NavigationContext,
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
		const navigator = historyNavigator(useContext(NavigationContext))
		const ownNavigations = useRef<string[]>([])
		const listeners = useRef(new Set<() => void>())
		const previousLocation = useRef(location.key)
		useNavigationEffect(() => {
			if (previousLocation.current === location.key) return
			previousLocation.current = location.key
			const acknowledged = ownNavigations.current.indexOf(location.key)
			if (navigationType !== NavigationType.Pop && acknowledged >= 0) {
				ownNavigations.current.splice(0, acknowledged + 1)
				return
			}
			ownNavigations.current.length = 0
			for (const listener of [...listeners.current]) listener()
		}, [location.key, location.state, navigationType])
		const snapshot = { location, navigate, dataRouter, navigator }
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
				const ownedKeys = new Set<string>()
				const own = (key: string): void => {
					ownedKeys.add(key)
					ownNavigations.current.push(key)
				}
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
					state,
				}
				const fail = (error: unknown): never => {
					ownNavigations.current = ownNavigations.current.filter((key) => !ownedKeys.has(key))
					throw error
				}
				try {
					if (current.dataRouter)
						return acknowledgeNavigation(current.dataRouter, target, options, own, {
							get: () => committed.current.location,
							subscribe: (listener) => {
								commitListeners.current.add(listener)
								return () => {
									commitListeners.current.delete(listener)
								}
							},
						}).catch(fail)
					if (!current.navigator)
						throw new Error(
							'[ez-kit/store-persist] React Router navigation identity requires an observable navigator location',
						)
					const previous = current.navigator.location.key
					const result = current.navigate(target, options)
					const key = current.navigator.location.key
					if (key === previous)
						throw new Error('[ez-kit/store-persist] React Router navigation did not publish a location key')
					own(key)
					if (result !== undefined) return Promise.resolve(result).catch(fail)
				} catch (error) {
					fail(error)
				}
			},
		})

		return { port: portRef.current, changeKey: JSON.stringify([location.key, location.search]) }
	},
}
