'use client'

import { useDataGridTable } from './data-grid/table-context'

import type { ResolvedGridOptions } from './resolved-options'

/**
 * Everything the grid resolved from its config — merged option layers, settled defaults, and
 * the split between headless and UI fields.
 *
 * Use it from a custom compound child or a UI-kit component that needs to agree with the grid
 * rather than guess: what debounce the inputs use, which page sizes the sizer offers, which
 * features are on. Before this existed, that information sat behind private `Symbol()` keys and
 * a kit could only re-derive it from its own constants.
 *
 * Refreshes when the grid's configuration, data or column definitions change. This is separate
 * from table state: subscribe to that with `useDataGridState`
 * when you need that.
 *
 * @example
 * const { filtering } = useGridOptions()
 * const configuredDelay = filtering.debounce // Built-in draft inputs bypass this delay.
 */
export function useGridOptions(): ResolvedGridOptions {
	return useDataGridTable().grid
}
