import { createColumns } from '@ez-kit/data-grid-core'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataGrid } from './data-grid/data-grid'
import { TEST_FEATURES, testComponents } from './test-utils'

import type { GridComponents } from './contract'

type Row = { id: number; name: string }

const ROWS: Row[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

/** The complete kit minus one component of one group — what a *partial* kit looks like. */
function withoutComponent(feature: 'resizing' | 'fallbacks', key: string): GridComponents {
	const group = Object.fromEntries(
		Object.entries(testComponents[feature] as Record<string, unknown>).filter(([name]) => name !== key),
	)
	return { ...testComponents, [feature]: group }
}

function renderGrid(components: GridComponents, config: Record<string, unknown> = {}) {
	return render(
		<DataGrid
			features={TEST_FEATURES}
			data={ROWS}
			columns={COLUMNS}
			components={components}
			{...config}
		/>,
	)
}

describe('guardComponents (render-time completeness)', () => {
	it('stays silent while the missing component is only read, never rendered', () => {
		// `header-cell.tsx` destructures `Resizer` on every header cell, whatever the column
		// does. A guard that threw on the *read* would fire here — on a grid that resizes
		// nothing, in a kit that never claimed to support resizing.
		expect(() => renderGrid(withoutComponent('resizing', 'Resizer'))).not.toThrow()
	})

	it('names the component and its group when the grid does render it', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => renderGrid(withoutComponent('resizing', 'Resizer'), { resizing: true })).toThrow(
			/Missing required UI-kit component\(s\)[\s\S]*Resizer \(resizing\)/,
		)

		errorSpy.mockRestore()
	})

	it('names the component when the whole group is absent', () => {
		// Without the wrapper this is "cannot destructure property 'EmptyState' of undefined" —
		// one level away from the cause.
		const { fallbacks: _omitted, ...rest } = testComponents
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() =>
			render(
				<DataGrid
					features={TEST_FEATURES}
					data={[]}
					columns={COLUMNS}
					components={rest as GridComponents}
				/>,
			),
		).toThrow(/Missing required UI-kit component\(s\)[\s\S]*EmptyState \(fallbacks\)/)

		errorSpy.mockRestore()
	})

	it('leaves an unregistered optional slot undefined so its default applies', () => {
		// `HeaderMain` is in FEATURE_OPTIONAL_COMPONENTS and neither kit registers one — the
		// header cell falls back to a plain `div`, which only works while the read answers
		// `undefined`.
		const { container } = renderGrid(testComponents)

		expect(container.querySelector('[data-slot="header-main"]')).not.toBeNull()
	})
})
