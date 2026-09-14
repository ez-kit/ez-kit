import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { renderGrid, testComponents, TEST_COLUMNS, TEST_ROWS, renderWithComponents } from '../test-utils'

const WRAPPER = "[data-slot='table-wrapper']"
const SCROLL = "[data-slot='table-scroll']"

/**
 * The shell's two boxes are the only elements this package renders itself, so they are the only
 * ones a kit cannot reach through `components` — and the outer one is the only box that sits
 * *outside* the scrollport, which is where a border has to live to not scroll with the content.
 */
describe('layout.classNames', () => {
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
	it('comes from a kit’s factory defaults, and the grid can still override a key', () => {
		const { DataGrid: Bound } = createDataGrid({
			components: testComponents,
			defaults: { layout: { classNames: { wrapper: 'kit-frame', scroll: 'kit-port' } } },
		})

		const { container } = renderWithComponents(
			<Bound
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				layout={{ classNames: { wrapper: 'app-frame' } }}
			/>,
		)

		expect(container.querySelector(WRAPPER)).toHaveClass('app-frame')
		expect(container.querySelector(WRAPPER)).not.toHaveClass('kit-frame')
		// The key the grid did not name still comes from the kit.
		expect(container.querySelector(SCROLL)).toHaveClass('kit-port')
	})
})
