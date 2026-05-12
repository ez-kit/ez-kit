import { createContext, useContext, useMemo } from 'react'

import { BUILT_IN_CELL_TYPES } from './built-in-cell-types'

import type { FieldState } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

// ── prop types ────────────────────────────────────────────────────────────

export type CellViewProps<TConfig = unknown> = {
	value: unknown
	row: unknown
	rowIndex: number
	config?: TConfig
}

/**
 * Loose input props for filter-mode renderers (no validation surface).
 * For `edit` / `creating` modes, renderers receive the richer {@link FieldState}.
 */
export type CellInputProps<TConfig = unknown> = {
	value: unknown
	onChange: (value: unknown) => void
	config?: TConfig
}

// ── registry types ────────────────────────────────────────────────────────

export type CellTypeDefinition<TConfig = unknown> = {
	/** View-mode renderer. */
	view?: (props: CellViewProps<TConfig>) => ReactNode
	/**
	 * Edit-mode input. Receives a {@link FieldState} with id/label/description/error/onBlur.
	 * In inline contexts (cell-mode, creating-row, filter) `label`/`description` are
	 * omitted so the composite can skip the corresponding chrome.
	 * Falls back to `creating` when omitted.
	 */
	edit?: (props: FieldState<TConfig>) => ReactNode
	/** Create-mode input. Same shape as `edit`. Falls back to `edit` when omitted. */
	creating?: (props: FieldState<TConfig>) => ReactNode
	/**
	 * Filter-mode input. Receives a {@link FieldState} with `label`/`description`/`errors`
	 * left empty (filters do not surface validation). Falls back to `edit` when omitted.
	 */
	filter?: (props: FieldState<TConfig>) => ReactNode
	/** Default operator IDs for this cell type when `filtering.operators: true`. */
	operators?: string[]
	/** Default operator ID override for this cell type. */
	defaultOperator?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CellTypeRegistry = Record<string, CellTypeDefinition<any>>

// ── context ───────────────────────────────────────────────────────────────

const CellTypesContext = createContext(BUILT_IN_CELL_TYPES)

export type CellTypesProviderProps = {
	types: CellTypeRegistry
	children: ReactNode
}

export function CellTypesProvider({ types, children }: CellTypesProviderProps) {
	const parent = useContext(CellTypesContext)
	const merged = useMemo(() => ({ ...parent, ...types }), [parent, types])
	return <CellTypesContext value={merged}>{children}</CellTypesContext>
}

export function useCellTypes(): CellTypeRegistry {
	return useContext(CellTypesContext)
}
