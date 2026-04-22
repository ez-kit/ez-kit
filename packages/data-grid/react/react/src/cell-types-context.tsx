import { createContext, useContext, useMemo } from 'react'

import { BUILT_IN_CELL_TYPES } from './built-in-cell-types'

import type { ReactNode } from 'react'

// ── prop types ────────────────────────────────────────────────────────────

export interface CellViewProps {
	value: unknown
	row: unknown
	rowIndex: number
	cellConfig?: Record<string, unknown>
}

export interface CellInputProps {
	value: unknown
	onChange: (value: unknown) => void
	cellConfig?: Record<string, unknown>
}

// ── registry types ────────────────────────────────────────────────────────

export interface CellTypeDefinition {
	/** View-mode renderer. */
	view?: (props: CellViewProps) => ReactNode
	/** Edit-mode input. Falls back to `creating` when omitted. */
	edit?: (props: CellInputProps) => ReactNode
	/** Create-mode input. Falls back to `edit` when omitted. */
	creating?: (props: CellInputProps) => ReactNode
	/** Filter-mode input. Falls back to `edit` when omitted. */
	filter?: (props: CellInputProps) => ReactNode
	/** Default operator IDs for this cell type when `filtering.operators: true`. */
	operators?: string[]
	/** Default operator ID override for this cell type. */
	defaultOperator?: string
}

export type CellTypeRegistry = Record<string, CellTypeDefinition>

// ── context ───────────────────────────────────────────────────────────────

const CellTypesContext = createContext(BUILT_IN_CELL_TYPES)

export interface CellTypesProviderProps {
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
