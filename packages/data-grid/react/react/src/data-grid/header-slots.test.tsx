import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { renderWithComponents } from '../test-utils'

import { HeaderExtras, HeaderMain } from './header-slots'

import type { GridComponents } from '../contract'
import type { HeaderMainProps } from '../types'
import type { ReactElement } from 'react'

describe('header slot components', () => {
	// `renderWithComponents` supplies the test kit, which registers neither slot — the realistic
	// case, since neither kit in this repo does either.
	it('renders a plain div when no kit registers one', () => {
		const { container } = renderWithComponents(<HeaderMain>label</HeaderMain>)

		const main = container.querySelector("[data-slot='header-main']")
		expect(main?.tagName).toBe('DIV')
		expect(main?.textContent).toBe('label')
		expect(container.querySelector("[data-slot='header-extras']")).toBeNull()
	})

	it('renders the registered component instead, for each slot', () => {
		const components: GridComponents = {
			core: {
				HeaderMain: (props) => <section {...props} />,
				HeaderExtras: (props) => <aside {...props} />,
			},
		}
		const { container } = render(
			<GridComponentsProvider components={components}>
				<HeaderMain>label</HeaderMain>
				<HeaderExtras>filter</HeaderExtras>
			</GridComponentsProvider>,
		)

		expect(container.querySelector("[data-slot='header-main']")?.tagName).toBe('SECTION')
		expect(container.querySelector("[data-slot='header-extras']")?.tagName).toBe('ASIDE')
	})

	it('passes a given className through without authoring one', () => {
		const { container } = renderWithComponents(<HeaderMain className='from-the-caller' />)

		expect(container.querySelector("[data-slot='header-main']")?.className).toBe('from-the-caller')
	})

	/**
	 * `data-slot` is written after the spread precisely so this cannot happen: both kits' CSS
	 * and the structural stylesheet select on the slot, and a caller silently renaming it would
	 * cost the header its layout with nothing to show for it.
	 */
	it('does not let a caller displace the slot the stylesheet selects on', () => {
		// The prop is not in `HeaderMainProps`, so a call site has to work at it — which is what
		// makes the runtime behaviour worth pinning rather than leaving to the types.
		const hijacked = { 'data-slot': 'something-else' } as unknown as HeaderMainProps
		const element: ReactElement = <HeaderMain {...hijacked} />
		const { container } = renderWithComponents(element)

		expect(container.querySelector("[data-slot='something-else']")).toBeNull()
		expect(container.querySelector("[data-slot='header-main']")).not.toBeNull()
	})
})
