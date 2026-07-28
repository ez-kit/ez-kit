import { createContext, useContext, useMemo } from 'react'

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
	 * No fallback — when omitted, edit mode renders the default input component.
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

/**
 * Default registry is **empty**. This package ships zero built-in cell types —
 * consumers/UI kits register renderers via {@link CellTypesProvider} or via
 * `createDataGrid({ cellTypes })`. Common cell types live under the
 * `@ez-kit/data-grid-react/cell-types` sub-export.
 */
const CellTypesContext = createContext<CellTypeRegistry>({})

export type CellTypesProviderProps = {
	types: CellTypeRegistry
	children: ReactNode
}

/**
 * Registers cell-type renderers (`view` / `edit` / `creating` / `filter`) for
 * the columns of every descendant `<DataGrid>`.
 *
 * The headless package ships **no built-in cell types**. Common ones —
 * `numberCellType`, `textCellType`, `booleanCellType` — are available under
 * `@ez-kit/data-grid-react/cell-types` and compose with the DI primitives from
 * {@link GridComponentsProvider} (`NumberInput`, `Input`, `Checkbox`).
 *
 * Providers nest: children's registry is merged on top of the parent's, so
 * apps can override a kit-provided cell type for a specific subtree without
 * forking the kit.
 */
export function CellTypesProvider({ types, children }: CellTypesProviderProps) {
	const parent = useContext(CellTypesContext)
	const merged = useMemo(() => ({ ...parent, ...types }), [parent, types])
	return <CellTypesContext value={merged}>{children}</CellTypesContext>
}

export function useCellTypes(): CellTypeRegistry {
	return useContext(CellTypesContext)
}
