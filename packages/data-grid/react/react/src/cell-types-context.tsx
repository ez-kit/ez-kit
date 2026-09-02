import { createContext, useContext, useMemo } from 'react'

import type { CellViewCtx, FieldState, FilterOperatorId } from '@ez-kit/data-grid-core'
import type { ComponentType, ReactNode } from 'react'

// ── prop types ────────────────────────────────────────────────────────────

/**
 * Props a registered cell type's `view` receives — the core {@link CellViewCtx} with `row` and
 * `value` erased, because one registry entry serves grids of every row shape.
 *
 * An alias rather than a second hand-written shape: the two used to be separate declarations
 * of the same three fields, differing only in that this one carried `config`, so an author
 * writing both a column's `cell.component` and a cell type's `view` had two names for one
 * thing.
 */
export type CellViewProps<TConfig = unknown> = CellViewCtx<unknown, unknown, TConfig>

// ── registry types ────────────────────────────────────────────────────────

/**
 * The renderers and filtering defaults one cell type contributes.
 *
 * The four renderer slots are named for the **features they serve** — `view`, `editing`,
 * `creating`, `filtering` — which is the same ray of names a column uses for the same four
 * things (`cell.component`, `editing.component`, `creating.component`,
 * `filtering.component`). Two of them used to be spelled `edit` and `filter`, so an author
 * writing a cell type and a column in the same file needed both spellings for one concept;
 * `creating` already matched, which is what the other two are now measured against.
 */
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
	editing?: ComponentType<FieldState<TConfig>>
	/** Create-mode input. Same shape as `editing`. Falls back to `editing` when omitted. */
	creating?: ComponentType<FieldState<TConfig>>
	/**
	 * Filter-mode input. Receives a {@link FieldState} with `label`/`description`/`errors`
	 * left empty (filters do not surface validation). Falls back to `editing` when omitted.
	 */
	filtering?: ComponentType<FieldState<TConfig>>
	/**
	 * Operator ids this cell type offers when a column sets `filtering.operators: true` and
	 * the type is not one of the built-ins. Typed {@link FilterOperatorId}, not `string`.
	 */
	operators?: FilterOperatorId[]
	/** Which of them the filter opens with. */
	defaultOperator?: FilterOperatorId
}

/**
 * Declares a cell type and pins the shape of its `cell.config` in one place.
 *
 * The config type is recorded in a phantom `__config`, which is **type-only** — this returns
 * the definition object unchanged, so nothing reaches the bundle. The marker exists because a
 * config type cannot be recovered from the renderer slots: `view`, `editing`, `creating` and
 * `filtering` are four independent inference sites for one parameter, and a type that registers
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
 *   editing: RatingCellInput,
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

/**
 * Layers one registry over another, **per entry** rather than per id.
 *
 * A shallow `{ ...base, ...override }` replaces a whole cell type whenever both sides name it,
 * which is almost never what the caller means. `{ date: { view: MyDate } }` reads as "keep the
 * kit's date cell, swap its view" and would instead drop its `editing`, `filtering` and the config it
 * declared; `baseCellTypes` — whose six renderer-less entries exist precisely so kits can spread
 * them — would blank out every renderer the kit registered.
 *
 * Merging entry by entry makes both cases mean what they read as: keys the override omits keep
 * the base's value. Full replacement is still available by spelling the whole definition out.
 */
export function mergeCellTypes(base: CellTypeRegistry, override: CellTypeRegistry): CellTypeRegistry {
	const merged: CellTypeRegistry = { ...base }
	for (const [id, definition] of Object.entries(override)) {
		const existing = merged[id]
		merged[id] = existing === undefined ? definition : { ...existing, ...definition }
	}
	return merged
}

// ── context ───────────────────────────────────────────────────────────────

/**
 * Default registry is **empty**. This package ships zero built-in cell types —
 * consumers/UI kits register renderers via {@link CellTypesProvider} or via
 * `createDataGrid({ cellTypes })`. Common cell types live under the
 * `@ez-kit/data-grid-react`.
 */
const CellTypesContext = createContext<CellTypeRegistry>({})

export type CellTypesProviderProps = {
	/**
	 * The registry to register. Spelled `cellTypes`, the one word this API spends on it —
	 * `useDataGrid({ cellTypes })`, `<DataGrid cellTypes>`, `createDataGrid({ cellTypes })`,
	 * `ResolvedGridOptions.cellTypes`. It was `types`, so one concept changed its name
	 * depending on which of the four you were writing.
	 */
	cellTypes: CellTypeRegistry
	children: ReactNode
}

/**
 * Registers cell-type renderers (`view` / `editing` / `creating` / `filtering`) for
 * the columns of every descendant `<DataGrid>`.
 *
 * The headless package ships **no built-in cell types**. Common ones —
 * `numberCellType`, `textCellType`, `booleanCellType` — are available under
 * `@ez-kit/data-grid-react` and compose with the DI primitives from
 * {@link GridComponentsProvider} (`NumberInput`, `Input`, `Checkbox`).
 *
 * Providers nest: children's registry is merged on top of the parent's, so
 * apps can override a kit-provided cell type for a specific subtree without
 * forking the kit.
 */
export function CellTypesProvider({ cellTypes, children }: CellTypesProviderProps) {
	const parent = useContext(CellTypesContext)
	const merged = useMemo(() => mergeCellTypes(parent, cellTypes), [parent, cellTypes])
	return <CellTypesContext value={merged}>{children}</CellTypesContext>
}

export function useCellTypes(): CellTypeRegistry {
	return useContext(CellTypesContext)
}
