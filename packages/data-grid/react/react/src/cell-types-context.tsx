import { createContext, useContext, useMemo } from 'react'

import { BUILT_IN_CELL_TYPES } from './built-in-cell-types'

import type { ReactNode } from 'react'

// ── prop types ────────────────────────────────────────────────────────────

export type CellViewProps<TConfig = unknown> = {
	value: unknown
	row: unknown
	rowIndex: number
	config?: TConfig
}

export type CellInputProps<TConfig = unknown> = {
	value: unknown
	onChange: (value: unknown) => void
	config?: TConfig
}

// ── registry types ────────────────────────────────────────────────────────

export type CellTypeDefinition<TConfig = unknown> = {
	/** View-mode renderer. */
	view?: (props: CellViewProps<TConfig>) => ReactNode
	/** Edit-mode input. Falls back to `creating` when omitted. */
	edit?: (props: CellInputProps<TConfig>) => ReactNode
	/** Create-mode input. Falls back to `edit` when omitted. */
	creating?: (props: CellInputProps<TConfig>) => ReactNode
	/** Filter-mode input. Falls back to `edit` when omitted. */
	filter?: (props: CellInputProps<TConfig>) => ReactNode
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
