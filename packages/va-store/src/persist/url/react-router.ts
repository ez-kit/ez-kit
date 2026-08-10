'use client'

import { useRef } from 'react'
import { useSearchParams } from 'react-router'

import { createUrlPort, URL_SOURCE, UrlHistory, urlMetaMerge } from './adapter'

import type { RenderScopedAdapter } from '../provider'
import type { SyncSourcePort } from '../types'

/** Render-scoped URL adapter for react-router v6/v7 (BrowserRouter / data routers). */
export const reactRouterAdapter: RenderScopedAdapter = {
	source: URL_SOURCE,
	mergeMeta: urlMetaMerge,
	defaultMeta: { history: UrlHistory.Replace },

	usePort() {
		const [params, setParams] = useSearchParams()
		const paramsRef = useRef(params)
		paramsRef.current = params
		const setRef = useRef(setParams)
		setRef.current = setParams

		const portRef = useRef<SyncSourcePort | null>(null)
		portRef.current ??= createUrlPort({
			read: () => new URLSearchParams(paramsRef.current),
			commit: (next, history) => {
				setRef.current(next, { replace: history === UrlHistory.Replace })
			},
		})

		return { port: portRef.current, changeKey: params.toString() }
	},
}
