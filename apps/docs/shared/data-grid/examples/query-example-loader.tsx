'use client'

import { createDataGrid } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { withQuery } from '@ez-kit/qc-react/data-grid'
import { lazy, Suspense } from 'react'

import { useDataGridType } from 'shared/DataGrid'
import { allComponents, cellTypes } from 'shared/GridKit'

import type { ComponentType } from 'react'

const kit = withQuery(createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures }))
// Bundle-based examples need kit injection in addition to the ordinary DataGrid switcher.
// Keep this runtime-only concern outside the files presented in the source panel.
function withQueryExampleKit(Example: ComponentType<{ kit?: typeof kit }>) {
	const HeroExample = lazy(async () => {
		const hero = await import('@ez-kit/data-grid-heroui')
		const heroKit = withQuery(
			createDataGrid({ components: hero.allComponents, cellTypes: hero.cellTypes, features: allDataGridFeatures }),
		)
		return { default: () => <Example kit={heroKit} /> }
	})
	return function KitExample() {
		const { type } = useDataGridType()
		return (
			<Suspense fallback={<p>Loading example…</p>}>
				{type === 'heroui' ? <HeroExample /> : <Example kit={kit} />}
			</Suspense>
		)
	}
}
export async function loadQuerySourceExample() {
	const { QuerySourceExample } = await import('./components/query-source')
	return { QuerySourceExample: withQueryExampleKit(QuerySourceExample) }
}
export async function loadQueryModalExample() {
	const { QueryModalExample } = await import('./components/editing/query-modal')
	return { QueryModalExample: withQueryExampleKit(QueryModalExample) }
}
