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

export function GridComponentsProvider({ components, children }: GridComponentsProviderProps) {
	const parentComponents = useContext(GridComponentsContext)

	const value = useMemo(
		() => (components ? ({ ...parentComponents, ...components } as Required<GridComponents>) : parentComponents),
		[parentComponents, components],
	)

	return <GridComponentsContext value={value}>{children}</GridComponentsContext>
}

export function useGridComponents(): Required<GridComponents> {
	return useContext(GridComponentsContext)
}
