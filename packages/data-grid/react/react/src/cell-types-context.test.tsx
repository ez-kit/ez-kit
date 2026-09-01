import { describe, expect, it } from 'vitest'

import { CellTypesProvider, mergeCellTypes, useCellTypes } from './cell-types-context'
import { renderWithComponents } from './test-utils'

import type { CellTypeRegistry } from './cell-types-context'
import type { ReactNode } from 'react'

function Probe({ onMount }: { onMount: (registry: CellTypeRegistry) => void }): ReactNode {
	const registry = useCellTypes()
	onMount(registry)
	return null
}

describe('CellTypesContext', () => {
	it('defaults to an empty registry (no built-in cell types)', () => {
		let captured: CellTypeRegistry | undefined
		renderWithComponents(<Probe onMount={(r) => (captured = r)} />)
		expect(captured).toEqual({})
	})

	it('merges nested providers (child overrides parent on key collision)', () => {
		const parentView = () => 'parent'
		const childView = () => 'child'
		let captured: CellTypeRegistry | undefined
		renderWithComponents(
			<CellTypesProvider cellTypes={{ a: { view: parentView }, b: { view: parentView } }}>
				<CellTypesProvider cellTypes={{ b: { view: childView } }}>
					<Probe onMount={(r) => (captured = r)} />
				</CellTypesProvider>
			</CellTypesProvider>,
		)
		expect(captured?.a?.view).toBe(parentView)
		expect(captured?.b?.view).toBe(childView)
	})

	it('keeps the parent renderers a nested provider does not name', () => {
		const parentEdit = () => 'parent-edit'
		const childView = () => 'child-view'
		let captured: CellTypeRegistry | undefined
		renderWithComponents(
			<CellTypesProvider cellTypes={{ date: { editing: parentEdit, operators: ['equals'] } }}>
				<CellTypesProvider cellTypes={{ date: { view: childView } }}>
					<Probe onMount={(r) => (captured = r)} />
				</CellTypesProvider>
			</CellTypesProvider>,
		)
		expect(captured?.date?.view).toBe(childView)
		expect(captured?.date?.editing).toBe(parentEdit)
		expect(captured?.date?.operators).toEqual(['equals'])
	})
})

describe('mergeCellTypes', () => {
	const kitView = () => 'kit-view'
	const kitEdit = () => 'kit-edit'
	const kit: CellTypeRegistry = { date: { view: kitView, editing: kitEdit } }

	it('layers entry by entry — omitted keys keep the base value', () => {
		const ownView = () => 'own-view'

		const merged = mergeCellTypes(kit, { date: { view: ownView } })

		expect(merged.date?.view).toBe(ownView)
		expect(merged.date?.editing).toBe(kitEdit)
	})

	it('a renderer-less declaration does not blank out the kit entry', () => {
		// This is the `baseCellTypes` shape: six entries declare only their config.
		const merged = mergeCellTypes(kit, { date: {} })

		expect(merged.date?.view).toBe(kitView)
		expect(merged.date?.editing).toBe(kitEdit)
	})

	it('adds ids the base does not have', () => {
		const ratingView = () => 'rating'

		const merged = mergeCellTypes(kit, { rating: { view: ratingView } })

		expect(merged.rating?.view).toBe(ratingView)
		expect(merged.date?.view).toBe(kitView)
	})

	it('mutates neither argument', () => {
		const override: CellTypeRegistry = { date: { view: () => 'own' } }
		const kitSnapshot = { ...kit.date }
		const overrideSnapshot = { ...override.date }

		mergeCellTypes(kit, override)

		expect(kit.date).toEqual(kitSnapshot)
		expect(override.date).toEqual(overrideSnapshot)
	})
})
