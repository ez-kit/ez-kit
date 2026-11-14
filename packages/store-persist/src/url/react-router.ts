'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType, useSearchParams } from 'react-router'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'

import type { RenderScopedAdapter } from '../provider'
import type { SyncSourcePort } from '../types'

const useNavigationEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Render-scoped URL adapter for react-router v6/v7 (BrowserRouter / data routers). */
export const reactRouterAdapter: RenderScopedAdapter = {
	source: URL_SOURCE,
	mergeMeta: urlMetaMerge,
	defaultMeta: { history: UrlHistory.Replace },

	usePort() {
		const [params, setParams] = useSearchParams()
		const location = useLocation()
		const navigationType = useNavigationType()
		const listeners = useRef(new Set<() => void>())
		const previousLocation = useRef(location.key)
		useNavigationEffect(() => {
			if (previousLocation.current === location.key) return
			previousLocation.current = location.key
			if (navigationType === NavigationType.Pop) for (const listener of [...listeners.current]) listener()
		}, [location.key, navigationType])
		const paramsRef = useRef(params)
		paramsRef.current = params
		const setRef = useRef(setParams)
		setRef.current = setParams

		const portRef = useRef<SyncSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(paramsRef.current),
			subscribe: (onNavigate) => {
				listeners.current.add(onNavigate)
				return () => {
					listeners.current.delete(onNavigate)
				}
			},
			commit: (next, history) => {
				setRef.current(next, { replace: history === UrlHistory.Replace })
			},
		})

		return { port: portRef.current, changeKey: JSON.stringify([location.key, params.toString()]) }
	},
}
