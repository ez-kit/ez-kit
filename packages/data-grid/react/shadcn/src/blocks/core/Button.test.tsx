import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@grid-shadcn/components/ui/button'

/**
 * What ARIA survives the `core.Button` slot, which is a question about the drag handle.
 *
 * `<DataGrid.RowDragHandle>` and its column sibling render this slot and nothing else, so every
 * accessibility attribute the grid wants on a handle arrives as a prop here. One of them is
 * `aria-roledescription`: `@dnd-kit/dom`'s `Accessibility` plugin writes `"draggable"` onto each
 * handle, in English, **only when the attribute is absent** (`index.js:251-258`) — so whether the
 * grid can replace that text with the message catalogue's is decided entirely by whether this slot
 * puts the attribute on the element.
 *
 * It is tested against the vendored primitive rather than a `blocks/` wrapper because that is what
 * `core-components.ts` binds: this kit has no `Button` adapter, and the module imported here is the
 * one a grid actually renders. Nothing under `components/ui/**` is edited by this file.
 *
 * The matching case in the heroui kit records the **opposite** result for the same prop, and the
 * difference is the point of having both.
 */
describe('shadcn Button', () => {
	it('puts aria-roledescription on the element, so the grid can name the gesture', () => {
		render(<Button aria-roledescription='sortable row'>Drag</Button>)

		expect(screen.getByRole('button')).toHaveAttribute('aria-roledescription', 'sortable row')
	})
})
