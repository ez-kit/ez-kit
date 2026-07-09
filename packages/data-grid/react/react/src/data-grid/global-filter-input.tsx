import { useEffect, useRef, useState } from 'react'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { GLOBAL_FILTERING_KEY } from '../use-data-grid'
import { useDebouncedValue } from '../utils/use-debounced-value'

import { useTable } from './table-context'

import type { NormalizedGlobalFilteringConfig } from '../use-data-grid'

type GlobalFilterInputCompoundProps = {
	/** Override the placeholder configured via `globalFiltering.placeholder`. */
	placeholder?: string
}

/**
 * Headless wrapper around `GridComponents.GlobalFilterInput`.
 *
 * Reads the normalized {@link NormalizedGlobalFilteringConfig} stored on the
 * table instance via the {@link GLOBAL_FILTERING_KEY} symbol, holds a local
 * draft of the input value, debounces commits to `table.setGlobalFilter`, and
 * syncs back when external code mutates `state.globalFilter` (e.g. programmatic
 * reset, controlled mode).
 */
export function GlobalFilterInput({ placeholder: placeholderProp }: GlobalFilterInputCompoundProps = {}) {
	const table = useTable()
	const { GlobalFilterInput: Component } = useGridComponents().filtering

	const cfg = (table as unknown as Record<symbol, unknown>)[GLOBAL_FILTERING_KEY] as
		| NormalizedGlobalFilteringConfig
		| undefined

	const debounce = cfg?.debounce ?? DATA_GRID_DEFAULTS.globalFiltering.debounce
	const placeholder = placeholderProp ?? cfg?.placeholder ?? DATA_GRID_DEFAULTS.globalFiltering.placeholder

	const committed = String(table.getState().globalFilter ?? '')
	const [draft, setDraft] = useState(committed)
	const debouncedDraft = useDebouncedValue(draft, debounce)

	// React state-during-render pattern: detect external mutations of
	// `state.globalFilter` (programmatic reset, controlled mode) and pull the new
	// value into our draft without an effect.
	const [prevCommitted, setPrevCommitted] = useState(committed)
	if (committed !== prevCommitted) {
		setPrevCommitted(committed)
		if (committed !== draft && committed !== debouncedDraft) {
			setDraft(committed)
		}
	}

	const isFirstRunRef = useRef(true)
	useEffect(() => {
		if (isFirstRunRef.current) {
			isFirstRunRef.current = false
			return
		}
		table.setGlobalFilter(debouncedDraft === '' ? undefined : debouncedDraft)
		// `table` is a stable ref — intentionally omitted from deps to avoid
		// resubscribing every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedDraft])

	return (
		<Component
			value={draft}
			onChange={setDraft}
			placeholder={placeholder}
			debounce={debounce}
			data-slot='global-filter-input'
		/>
	)
}
