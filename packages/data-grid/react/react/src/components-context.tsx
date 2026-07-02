import { createContext, useContext, useMemo } from 'react'

import type { GridFeature , FullGridComponents, GridComponents } from './contract'
import type { ReactNode } from 'react'

export const defaultComponents: FullGridComponents = {} as FullGridComponents

// ── context ───────────────────────────────────────────────────────────────

/**
 * The context holds the resolved, **nested** registry (`FullGridComponents`). Kits register
 * a nested, feature-grouped object and consumers read it the same way — no flattening — e.g.
 * `const { Table, Tr } = useGridComponents().core`.
 */
const GridComponentsContext = createContext<FullGridComponents>(defaultComponents)

export type GridComponentsProviderProps = {
	components?: GridComponents
	children: ReactNode
}

/**
 * Per-group shallow merge: an override may supply only some components of a feature group,
 * so each group is merged member-by-member over the inherited registry.
 */
function mergeGridComponents(base: FullGridComponents, override: GridComponents): FullGridComponents {
	const merged = { ...base } as Record<GridFeature, Record<string, unknown>>
	for (const feature of Object.keys(override) as GridFeature[]) {
		merged[feature] = { ...merged[feature], ...override[feature] }
	}
	return merged as unknown as FullGridComponents
}

/**
 * DI registry for visual UI primitives consumed by the headless data-grid.
 *
 * This package ships **zero visual styling** — all colors, fonts, spacing,
 * borders, hover/focus, animations, and icon choices live in the UI kit
 * components you register here. Components are registered as a nested,
 * feature-grouped object (`GridComponents` / `FullGridComponents`), e.g.
 * `{ core: { Table, Thead, … }, pagination: { Pagination, PageSizer }, … }`,
 * and are merged group-by-group over the inherited registry.
 *
 * Pair with `import '@ez-kit/data-grid-react/styles.css'` once at the kit /
 * app root to apply the shared structural CSS (positioning, layout, overflow,
 * z-index, cursor). Visuals are then layered on top by the kit's own CSS.
 */
export function GridComponentsProvider({ components, children }: GridComponentsProviderProps) {
	const parentComponents = useContext(GridComponentsContext)

	const value = useMemo(
		() => (components ? mergeGridComponents(parentComponents, components) : parentComponents),
		[parentComponents, components],
	)

	return <GridComponentsContext value={value}>{children}</GridComponentsContext>
}

export function useGridComponents(): FullGridComponents {
	return useContext(GridComponentsContext)
}
