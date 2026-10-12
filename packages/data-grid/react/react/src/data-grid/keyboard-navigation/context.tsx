'use client'

import { createContext, useContext } from 'react'

import type { ReactNode } from 'react'

/**
 * Whether this grid runs the package's own focus model.
 *
 * A **kit** statement, not a grid option: `createDataGrid({ keyboardNavigation: true })` publishes
 * it, and only a kit that brings no focus manager of its own says so. See
 * {@link useGridKeyboardNavigation} for why this is not a field of the grid config.
 *
 * `false` is the default, so the bare `@ez-kit/data-grid-react` renders exactly the DOM it did
 * before — no roles, no `tabIndex`, no key handler.
 */
const KeyboardNavigationContext = createContext(false)

export function KeyboardNavigationProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
	return <KeyboardNavigationContext.Provider value={enabled}>{children}</KeyboardNavigationContext.Provider>
}

/** True when the cells of this grid should carry grid roles and a roving `tabIndex`. */
export function useKeyboardNavigationEnabled(): boolean {
	return useContext(KeyboardNavigationContext)
}

/**
 * The role and tab stop one cell renders — spread onto the kit's `Th` or `Td`.
 *
 * `tabIndex` is a **static** `-1` here; the single stop is moved imperatively by the hook, so a
 * cell never re-renders because the focus moved. Empty when the model is off, which is what keeps
 * the DOM unchanged for a kit that manages focus itself.
 */
export function useCellNavigationProps(role: 'gridcell' | 'columnheader'): { role?: string; tabIndex?: number } {
	return useKeyboardNavigationEnabled() ? { role, tabIndex: -1 } : {}
}

/** The row's role, spread onto the kit's `Tr`. */
export function useRowNavigationProps(): { role?: string } {
	return useKeyboardNavigationEnabled() ? { role: 'row' } : {}
}
