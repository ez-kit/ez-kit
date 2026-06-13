'use client'

import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { SearchParamsHistory } from '../types'

import type { RouterAdapter, SearchParamsUpdater } from '../types'

function snapshot(): URLSearchParams {
	return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
}

/**
 * `RouterAdapter` for the Next.js App Router. Writes go through `router.replace`/`push`
 * (re-running server components); client-held Valtio state survives the refetch. Shallow,
 * RSC-free updates are a future optimisation.
 */
export const nextAdapter: RouterAdapter = {
	useSearchParams: () => new URLSearchParams(useNextSearchParams().toString()),

	useUpdater: (): SearchParamsUpdater => {
		const router = useRouter()
		const pathname = usePathname()
		return useCallback<SearchParamsUpdater>(
			(next, { history }) => {
				const query = next.toString()
				const url = query ? `${pathname}?${query}` : pathname
				if (history === SearchParamsHistory.Push) {
					router.push(url)
				} else {
					router.replace(url)
				}
			},
			[router, pathname],
		)
	},

	getSnapshot: snapshot,
}
