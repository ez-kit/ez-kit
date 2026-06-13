import { useCallback } from 'react'
import { useSearchParams as useRouterSearchParams } from 'react-router'

import { SearchParamsHistory } from '../types'

import type { RouterAdapter, SearchParamsUpdater } from '../types'

/** Read the current location's search without depending on React (for the async flush). */
function snapshot(): URLSearchParams {
	return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
}

/** `RouterAdapter` for react-router v6/v7 (BrowserRouter / data routers). */
export const reactRouterAdapter: RouterAdapter = {
	useSearchParams: () => useRouterSearchParams()[0],

	useUpdater: (): SearchParamsUpdater => {
		const [, setSearchParams] = useRouterSearchParams()
		return useCallback<SearchParamsUpdater>(
			(next, { history }) => {
				setSearchParams(next, { replace: history === SearchParamsHistory.Replace })
			},
			[setSearchParams],
		)
	},

	getSnapshot: snapshot,
}
