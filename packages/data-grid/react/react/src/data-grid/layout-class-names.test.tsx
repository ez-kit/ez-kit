import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { DataGridOptionsProvider } from '../data-grid-options-context'
import { renderGrid, testComponents, TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, renderWithComponents } from '../test-utils'

const ROOT = "[data-slot='grid-root']"
const WRAPPER = "[data-slot='table-wrapper']"
const SCROLL = "[data-slot='table-scroll']"

/**
 * The shell's two boxes are the only elements this package renders itself, so they are the only
 * ones a kit cannot reach through `components` — and the outer one is the only box that sits
 * *outside* the scrollport, which is where a border has to live to not scroll with the content.
 */
describe('layout.classNames', () => {
	it('classes the grid root', () => {
		const { container } = renderGrid({ layout: { classNames: { root: 'card' } } })

		expect(container.querySelector(ROOT)).toHaveClass('card')
	})

	// The root is what makes the grid one item in its parent's layout instead of a run of
	// siblings, so it is always rendered — a class is an addition to it, never what creates it.
	it('renders the root with or without a class, around the whole grid', () => {
		const { container } = renderGrid()
		const root = container.querySelector(ROOT)

		expect(root).not.toBeNull()
		expect(root?.className).toBe('')
		expect(root?.querySelector(WRAPPER)).not.toBeNull()
	})

	it('accumulates on the root the way it does on the other two boxes', () => {
		const { DataGrid: Bound } = createDataGrid({
			components: testComponents,
			defaults: { layout: { classNames: { root: 'kit-card' } } },
		})

		const { container } = renderWithComponents(
			<Bound
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				layout={{ classNames: { root: 'app-card' } }}
			/>,
		)

		expect(container.querySelector(ROOT)?.className).toBe('kit-card app-card')
	})

	it('classes both shell boxes', () => {
		const { container } = renderGrid({ layout: { classNames: { wrapper: 'kit-frame', scroll: 'kit-port' } } })

		expect(container.querySelector(WRAPPER)).toHaveClass('kit-frame')
		expect(container.querySelector(SCROLL)).toHaveClass('kit-port')
	})

	it('classes neither when the option is absent', () => {
		const { container } = renderGrid()

		expect(container.querySelector(WRAPPER)?.className).toBe('')
		expect(container.querySelector(SCROLL)?.className).toBe('')
	})

	it('takes one key without touching the other', () => {
		const { container } = renderGrid({ layout: { classNames: { wrapper: 'kit-frame' } } })

		expect(container.querySelector(WRAPPER)).toHaveClass('kit-frame')
		expect(container.querySelector(SCROLL)?.className).toBe('')
	})

	// The structural attributes are what the shipped stylesheet targets — a class must be
	// additional to them, never instead of them.
	it('leaves the structural data-slot attributes in place', () => {
		const { container } = renderGrid({
			layout: { stickyHeader: true, classNames: { wrapper: 'kit-frame', scroll: 'kit-port' } },
		})

		expect(container.querySelector(`${SCROLL}[data-sticky-header='true']`)).not.toBeNull()
	})

	it('classes the virtualized shell too', () => {
		const { container } = renderGrid({
			virtualization: { row: { estimateSize: 40 } },
			layout: { classNames: { wrapper: 'kit-frame', scroll: 'kit-port' } },
		})

		expect(container.querySelector(`${WRAPPER}[data-virtualized='true']`)).toHaveClass('kit-frame')
		expect(container.querySelector(`${SCROLL}[data-virtualized='true']`)).toHaveClass('kit-port')
	})

	// The point of putting this in the config rather than on a React prop: the kit states it
	// once and every grid it builds is framed, in both call shapes.
	it('comes from a kit’s factory defaults, and the grid adds to it rather than replacing it', () => {
		const { DataGrid: Bound } = createDataGrid({
			components: testComponents,
			defaults: { layout: { classNames: { wrapper: 'kit-frame', scroll: 'kit-port' } } },
		})

		const { container } = renderWithComponents(
			<Bound
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				layout={{ classNames: { wrapper: 'app-frame' } }}
			/>,
		)

		// Both land: classes compose, so a kit's frame survives an app that adds to it. The
		// grid's own class comes last, which is all the ordering this package promises — it
		// knows nothing about Tailwind and de-conflicts nothing.
		expect(container.querySelector(WRAPPER)).toHaveClass('kit-frame', 'app-frame')
		expect(container.querySelector(WRAPPER)?.className).toBe('kit-frame app-frame')
		// The key the grid did not name still comes from the kit alone.
		expect(container.querySelector(SCROLL)?.className).toBe('kit-port')
	})

	// Both orderings a consumer can build must behave the same, or "classes accumulate" would
	// hold only on the path that happens to be tested.
	it('accumulates through a DataGridOptionsProvider, and through nested ones', () => {
		const { DataGrid: Bound } = createDataGrid({
			components: testComponents,
			defaults: { layout: { classNames: { wrapper: 'kit-frame' } } },
		})

		const { container } = renderWithComponents(
			<DataGridOptionsProvider defaults={{ layout: { classNames: { wrapper: 'app-frame' } } }}>
				<DataGridOptionsProvider defaults={{ layout: { classNames: { wrapper: 'section-frame' } } }}>
					<Bound
						features={TEST_FEATURES}
						data={TEST_ROWS}
						columns={TEST_COLUMNS}
						layout={{ classNames: { wrapper: 'grid-frame' } }}
					/>
				</DataGridOptionsProvider>
			</DataGridOptionsProvider>,
		)

		expect(container.querySelector(WRAPPER)?.className).toBe('kit-frame app-frame section-frame grid-frame')
	})

	// A class is additional to the structural contract, never instead of it: the stylesheet
	// targets the `data-slot`, and the height custom properties ride the wrapper's `style`.
	it('leaves the wrapper’s own slot and height variables intact', () => {
		const { container } = renderGrid({
			layout: { maxHeight: '32rem', classNames: { wrapper: 'kit-frame' } },
		})

		const wrapper = container.querySelector(WRAPPER)
		expect(wrapper).toHaveClass('kit-frame')
		expect(wrapper?.getAttribute('data-slot')).toBe('table-wrapper')
		expect(wrapper?.getAttribute('style')).toContain('--dg-table-max-height: 32rem')
	})
})
