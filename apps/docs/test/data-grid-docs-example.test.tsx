/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGridDocsExample } from '../components/data-grid-docs-example'

import type { ComponentProps } from 'react'

// Mutable mock of the current URL query string, driven by `replaceMock` so the
// component round-trips through the URL exactly like Next's navigation does.
let currentSearch = ''
const replaceMock = vi.fn((url: string) => {
	currentSearch = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
})

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock, push: replaceMock }),
	usePathname: () => '/docs/data-grid/getting-started',
	useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('../shared/data-grid/sandpack/DataGridSandpackExample', () => ({
	DataGridSandpackExample: vi.fn(({ exampleId, type }: { exampleId: string; type: 'shadcn' | 'heroui' }) => (
		<div data-testid='mock-sandpack' data-example-id={exampleId} data-type={type} />
	)),
}))

vi.mock('../shared/data-grid/examples/generated/data-grid-primitive', () => ({
	dataGridPrimitiveExamples: {
		'base-plain': () => <div data-testid='mock-native' />,
	},
}))

vi.mock('../shared/DataGrid', () => ({
	DataGridTypeProvider: ({ type, children }: { type: string; children: React.ReactNode }) => (
		<div data-testid='mock-type-provider' data-type={type}>
			{children}
		</div>
	),
}))

vi.mock('../components/data-grid-source-panel', () => ({
	DataGridSourcePanel: ({ exampleId }: { exampleId: string }) => (
		<div data-testid='mock-source-panel' data-example-id={exampleId} />
	),
}))

type ToggleProps = ComponentProps<typeof DataGridDocsExample>

const renderShortcode = (props: ToggleProps) => render(<DataGridDocsExample {...props} />)

const FLAVOR_STORAGE_KEY = 'ez-docs:url-state:kit'

afterEach(() => {
	vi.clearAllMocks()
	currentSearch = ''
	window.localStorage.clear()
})

describe('<DataGridDocsExample />', () => {
	it('renders the shadcn flavor by default and shows the toggle', () => {
		renderShortcode({ exampleId: 'base-plain' })

		const sandpack = screen.getByTestId('mock-sandpack')
		expect(sandpack.getAttribute('data-type')).toBe('shadcn')
		expect(sandpack.getAttribute('data-example-id')).toBe('base-plain')

		expect(screen.getByRole('tablist')).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: /^shadcn$/i })).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: /heroui/i })).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: /shadcn-native/i })).toBeInTheDocument()
	})

	it('honors defaultType="heroui" for the initial render', () => {
		renderShortcode({ exampleId: 'base-plain', defaultType: 'heroui' })

		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('heroui')
	})

	it('reads the active flavor from the URL, overriding the default', () => {
		currentSearch = 'kit=heroui'

		renderShortcode({ exampleId: 'base-plain' })

		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('heroui')
	})

	it('ignores an unknown flavor in the URL and falls back to the default', () => {
		currentSearch = 'kit=bootstrap'

		renderShortcode({ exampleId: 'base-plain' })

		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('shadcn')
	})

	it('writes the selected flavor to the URL when the HeroUI tab is clicked', () => {
		const view = renderShortcode({ exampleId: 'base-plain' })

		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('shadcn')

		fireEvent.click(screen.getByRole('tab', { name: /heroui/i }))

		expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('kit=heroui'), expect.anything())

		// Re-render with the new URL the router would have produced.
		view.rerender(<DataGridDocsExample exampleId='base-plain' />)
		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('heroui')
	})

	it('mirrors the selected flavor to localStorage so it survives navigation', () => {
		renderShortcode({ exampleId: 'base-plain' })

		fireEvent.click(screen.getByRole('tab', { name: /heroui/i }))

		expect(window.localStorage.getItem(FLAVOR_STORAGE_KEY)).toBe('heroui')
	})

	it('writes the shadcn-native flavor to the URL and renders the native example after navigation', () => {
		const view = renderShortcode({ exampleId: 'base-plain' })

		fireEvent.click(screen.getByRole('tab', { name: /shadcn-native/i }))

		expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('kit=shadcn-native'), expect.anything())

		view.rerender(<DataGridDocsExample exampleId='base-plain' />)
		expect(screen.queryByTestId('mock-sandpack')).not.toBeInTheDocument()
		expect(screen.getByTestId('mock-native')).toBeInTheDocument()
		expect(screen.getByTestId('mock-type-provider').getAttribute('data-type')).toBe('shadcn')
	})

	it('honors defaultType="shadcn-native" for the initial render', () => {
		renderShortcode({ exampleId: 'base-plain', defaultType: 'shadcn-native' })

		expect(screen.queryByTestId('mock-sandpack')).not.toBeInTheDocument()
		expect(screen.getByTestId('mock-native')).toBeInTheDocument()
	})

	it('hides the toggle when lockFlavor is set with a defaultType', () => {
		renderShortcode({ exampleId: 'base-plain', defaultType: 'shadcn', lockFlavor: true })

		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
		expect(screen.queryByRole('tab')).not.toBeInTheDocument()
		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('shadcn')
	})

	it('does not touch the URL when lockFlavor is set', () => {
		currentSearch = 'kit=heroui'

		renderShortcode({ exampleId: 'base-plain', defaultType: 'shadcn', lockFlavor: true })

		// Locked flavor wins over the URL, and the URL is never rewritten.
		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('shadcn')
		expect(replaceMock).not.toHaveBeenCalled()
	})

	it('hides the toggle when lockFlavor is set with defaultType="shadcn-native"', () => {
		renderShortcode({ exampleId: 'base-plain', defaultType: 'shadcn-native', lockFlavor: true })

		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
		expect(screen.queryByRole('tab')).not.toBeInTheDocument()
		expect(screen.getByTestId('mock-native')).toBeInTheDocument()
	})

	it('throws a contracted error when lockFlavor is true without defaultType', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		try {
			expect(() =>
				renderShortcode({
					exampleId: 'base-plain',
					lockFlavor: true,
				} as unknown as ToggleProps),
			).toThrow(/lockFlavor.*defaultType/i)
		} finally {
			consoleError.mockRestore()
		}
	})

	it('exposes correct ARIA attributes on the toggle', () => {
		renderShortcode({ exampleId: 'base-plain' })

		const tablist = screen.getByRole('tablist')
		expect(tablist).toHaveAttribute('aria-label', expect.stringMatching(/flavor/i))

		expect(screen.getByRole('tab', { name: /^shadcn$/i })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByRole('tab', { name: /heroui/i })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByRole('tab', { name: /shadcn-native/i })).toHaveAttribute('aria-selected', 'false')
	})

	it('reflects the URL-derived flavor in the ARIA selected state', () => {
		currentSearch = 'kit=shadcn-native'

		renderShortcode({ exampleId: 'base-plain' })

		expect(screen.getByRole('tab', { name: /^shadcn$/i })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByRole('tab', { name: /heroui/i })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByRole('tab', { name: /shadcn-native/i })).toHaveAttribute('aria-selected', 'true')
	})
})
