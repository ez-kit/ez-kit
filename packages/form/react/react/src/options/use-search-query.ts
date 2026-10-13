import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Searchable, SearchSettings } from '@ez-kit/form-core'

/** The query state of one searchable field: what the kit shows, and what the source may see. */
export type SearchQuery = {
	/** What the user typed, immediately — what the kit's input shows. */
	query: string
	onQueryChange: (query: string) => void
	/** What the source's hooks receive: debounced; `undefined` below `minLength`. */
	sourceQuery: string | undefined
	minLength: number
	belowMinLength: boolean
	/** A debounce is running: the source has not seen the latest text yet. */
	pending: boolean
	reset: () => void
}

/**
 * The settings one field searches with: the field's own object over the source's over the
 * defaults, key by key — a field may tune `minLength` and keep the source's `debounce`.
 */
export function resolveSearchSettings(
	field: Searchable | undefined,
	source: SearchSettings | undefined,
	defaults: Required<SearchSettings>,
): Required<SearchSettings> {
	const own = typeof field === 'object' ? field : undefined
	return {
		debounce: own?.debounce ?? source?.debounce ?? defaults.debounce,
		minLength: own?.minLength ?? source?.minLength ?? defaults.minLength,
	}
}

/**
 * The typed text, and what the source may see of it.
 *
 * The kit gets the text immediately; the source gets it after `debounce` ms without typing and
 * only once it is `minLength` long — below that, `undefined`, which a source reads as "no
 * search". The gate reads the **typed** text, so deleting below the minimum withdraws the query
 * at once rather than a pause later, and nothing is pending while there is nothing to search. A
 * `debounce` of `0` is synchronous: no timer, the same render.
 */
export function useSearchQuery({ debounce, minLength }: Required<SearchSettings>): SearchQuery {
	const [query, setQuery] = useState('')
	const [settled, setSettled] = useState('')
	const isImmediate = debounce === 0
	const live = isImmediate ? query : settled

	useEffect(() => {
		if (isImmediate) return undefined
		const timer = setTimeout(() => {
			setSettled(query)
		}, debounce)
		return () => {
			clearTimeout(timer)
		}
	}, [query, debounce, isImmediate])

	const reset = useCallback(() => {
		setQuery('')
		setSettled('')
	}, [])

	return useMemo(() => {
		const belowMinLength = query.length < minLength
		const isLiveSearchable = !belowMinLength && live.length >= minLength
		return {
			query,
			onQueryChange: setQuery,
			sourceQuery: isLiveSearchable ? live : undefined,
			minLength,
			belowMinLength,
			pending: !isImmediate && !belowMinLength && settled !== query,
			reset,
		}
	}, [query, live, settled, minLength, isImmediate, reset])
}
