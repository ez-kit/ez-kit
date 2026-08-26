import { createContext, useContext, useMemo } from 'react'

import type { FieldState } from '@ez-kit/data-grid-core'
import type { ComponentType, ReactNode } from 'react'

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
	/**
	 * View-mode renderer.
	 *
	 * Typed `ComponentType`, not `(props) => ReactNode`: renderers are **mounted**, so they get
	 * their own fiber and may use hooks, and `memo(...)` / `forwardRef(...)` — objects rather
	 * than functions — are accepted here as well as at runtime. Every plain function component
	 * still fits.
	 */
	view?: ComponentType<CellViewProps<TConfig>>
	/**
	 * Edit-mode input. Receives a {@link FieldState} with id/label/description/error/onBlur.
	 * In inline contexts (cell-mode, creating-row, filter) `label`/`description` are
	 * omitted so the composite can skip the corresponding chrome.
	 * No fallback — when omitted, edit mode renders the default input component.
	 */
	edit?: ComponentType<FieldState<TConfig>>
	/** Create-mode input. Same shape as `edit`. Falls back to `edit` when omitted. */
	creating?: ComponentType<FieldState<TConfig>>
	/**
	 * Filter-mode input. Receives a {@link FieldState} with `label`/`description`/`errors`
	 * left empty (filters do not surface validation). Falls back to `edit` when omitted.
	 */
	filter?: ComponentType<FieldState<TConfig>>
	/** Default operator IDs for this cell type when `filtering.operators: true`. */
	operators?: string[]
	/** Default operator ID override for this cell type. */
	defaultOperator?: string
}

/**
 * Declares a cell type and pins the shape of its `cell.config` in one place.
 *
 * The config type is recorded in a phantom `__config`, which is **type-only** — this returns
 * the definition object unchanged, so nothing reaches the bundle. The marker exists because a
 * config type cannot be recovered from the renderer slots: `view`, `edit`, `creating` and
 * `filter` are four independent inference sites for one parameter, and a type that registers
 * only some of them infers something arbitrary from the rest.
 *
 * The call is curried so `TConfig` can be given explicitly while `TDefinition` stays inferred —
 * the definition keeps its precise type (which renderers it actually has) either way.
 *
 * A type that takes no config omits the parameter — it defaults to `never`, which is what makes
 * `config` **rejected outright** on its columns rather than merely optional. An empty object
 * would not: `{}` accepts any object literal, so `config: { anything: 1 }` would slip through.
 *
 * @example
 * export const ratingCellType = defineCellType<{ max: number }>()({
 *   view: RatingCellView,
 *   edit: RatingCellInput,
 * })
 * // → its columns require `cell: { type: 'rating', config: { max } }`
 */
export function defineCellType<TConfig = never>() {
	return <TDefinition extends CellTypeDefinition<TConfig>>(
		definition: TDefinition,
	): TDefinition & { __config?: TConfig } => definition
}

/**
 * A map of cell type id to its definition, each carrying the config it declared.
 *
 * The value bound keeps `CellTypeDefinition<any>` so readers still see the renderer slots;
 * `any` is what lets a definition whose renderers take `FieldState<SomeConfig>` satisfy it,
 * since `ComponentType`'s class branch would otherwise make those props invariant.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CellTypeRegistry = Record<string, CellTypeDefinition<any> & { __config?: unknown }>

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
