'use client'

import { lazy, Suspense } from 'react'

import { useDataGridType } from './DataGrid'

import type { ComponentType } from 'react'

/**
 * A grid with drag and drop, per kit.
 *
 * A **second** switcher beside `shared/DataGrid.tsx`, and it has to be: that one lazy-loads each
 * kit's *prebuilt* `DataGrid`, which binds every component and every feature but deliberately no
 * drag adapter — a kit root is shipped to every consumer, and an adapter there would make an
 * optional peer a required install. Drag is reachable only through composition, so an example that
 * wants it composes a bundle of its own.
 *
 * The two per-kit modules exist for the same reason one level down: each names its own kit's
 * adapter, and a shared module naming both would put `@dnd-kit` in the bundle of every docs page.
 */
const HeroUiDnd = lazy(() => import('./data-grid-dnd/heroui').then((m) => ({ default: m.DataGridDnd })))
const ShadcnDnd = lazy(() => import('./data-grid-dnd/shadcn').then((m) => ({ default: m.DataGridDnd })))

export function DataGridDnd(props: Record<string, unknown>) {
	const { type } = useDataGridType()
	const Component = (type === 'heroui' ? HeroUiDnd : ShadcnDnd) as unknown as ComponentType<Record<string, unknown>>

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Component {...props} />
		</Suspense>
	)
}
