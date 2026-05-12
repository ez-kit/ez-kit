import { describe, expect, it } from 'vitest'

import { CellTypesProvider, useCellTypes } from './cell-types-context'
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
			<CellTypesProvider types={{ a: { view: parentView }, b: { view: parentView } }}>
				<CellTypesProvider types={{ b: { view: childView } }}>
					<Probe onMount={(r) => (captured = r)} />
				</CellTypesProvider>
			</CellTypesProvider>,
		)
		expect(captured?.a?.view).toBe(parentView)
		expect(captured?.b?.view).toBe(childView)
	})
})
