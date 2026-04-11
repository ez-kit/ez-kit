import { createContext, useContext, useMemo } from 'react'

import type { ReactNode } from 'react'

// ── prop types ────────────────────────────────────────────────────────────

export interface CellViewProps {
	value: unknown
	row: unknown
	rowIndex: number
}

export interface CellInputProps {
	value: unknown
	onChange: (value: unknown) => void
}

// ── registry types ────────────────────────────────────────────────────────

export interface CellTypeDefinition {
	/** View-mode renderer. */
	view?: (props: CellViewProps) => ReactNode
	/** Edit-mode input. Falls back to `creating` when omitted. */
	edit?: (props: CellInputProps) => ReactNode
	/** Create-mode input. Falls back to `edit` when omitted. */
	creating?: (props: CellInputProps) => ReactNode
}

export type CellTypeRegistry = Record<string, CellTypeDefinition>

// ── context ───────────────────────────────────────────────────────────────

const CellTypesContext = createContext<CellTypeRegistry>({})

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
