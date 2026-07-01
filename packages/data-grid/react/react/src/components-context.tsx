import { createContext, useContext, useMemo } from 'react'

import type { GridComponents } from './types'
import type { ReactNode } from 'react'

export const defaultComponents: Required<GridComponents> = {} as Required<GridComponents>

// ── context ───────────────────────────────────────────────────────────────

const GridComponentsContext = createContext<Required<GridComponents>>(defaultComponents)

export type GridComponentsProviderProps = {
	components?: GridComponents
	children: ReactNode
}

/**
 * DI registry for visual UI primitives consumed by the headless data-grid.
 *
 * This package ships **zero visual styling** — all colors, fonts, spacing,
 * borders, hover/focus, animations, and icon choices live in the UI kit
 * components you register here (`Table`, `Thead`, `Tr`, `Th`, `Td`, `Input`,
 * `Checkbox`, `NumberInput`, `Modal`, `Pagination`, …).
 *
 * Pair with `import '@ez-kit/data-grid-react/styles.css'` once at the kit /
 * app root to apply the shared structural CSS (positioning, layout, overflow,
 * z-index, cursor). Visuals are then layered on top by the kit's own CSS.
 */
export function GridComponentsProvider({ components, children }: GridComponentsProviderProps) {
	const parentComponents = useContext(GridComponentsContext)

	const value = useMemo(
		() => (components ? { ...parentComponents, ...components } : parentComponents),
		[parentComponents, components],
	)

	return <GridComponentsContext value={value}>{children}</GridComponentsContext>
}

export function useGridComponents(): Required<GridComponents> {
	return useContext(GridComponentsContext)
}
