'use client'

import { lazy, Suspense } from 'react'

import { useDataGridType } from '../DataGrid'

import type { ComponentType } from 'react'

/**
 * The drag handles of whichever kit the example is rendering in — one per axis.
 *
 * Each kit wraps the shared control with its own glyph — the shared one authors no visual, since
 * nothing in `@ez-kit/data-grid-react` may. An example is written once for both kits, so it reaches
 * the handle the same way it reaches the grid: through the kit context.
 */
const HeroUiHandle = lazy(() =>
	import('@ez-kit/data-grid-heroui').then((m) => ({ default: m.RowDragHandle as ComponentType })),
)
const ShadcnHandle = lazy(() =>
	import('@ez-kit/data-grid-shadcn').then((m) => ({ default: m.RowDragHandle as ComponentType })),
)

const HeroUiColumnHandle = lazy(() =>
	import('@ez-kit/data-grid-heroui').then((m) => ({ default: m.ColumnDragHandle as ComponentType })),
)
const ShadcnColumnHandle = lazy(() =>
	import('@ez-kit/data-grid-shadcn').then((m) => ({ default: m.ColumnDragHandle as ComponentType })),
)

export function RowDragHandle() {
	const { type } = useDataGridType()
	const Component = type === 'heroui' ? HeroUiHandle : ShadcnHandle

	return (
		<Suspense fallback={null}>
			<Component />
		</Suspense>
	)
}

/** The column axis' twin of {@link RowDragHandle}, reached the same way. */
export function ColumnDragHandle() {
	const { type } = useDataGridType()
	const Component = type === 'heroui' ? HeroUiColumnHandle : ShadcnColumnHandle

	return (
		<Suspense fallback={null}>
			<Component />
		</Suspense>
	)
}
