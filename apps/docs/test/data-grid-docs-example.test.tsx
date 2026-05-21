/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGridDocsExample } from '../components/data-grid-docs-example'

import type { ComponentProps } from 'react'

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

afterEach(() => {
	vi.clearAllMocks()
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

	it('switches to heroui when the HeroUI tab is clicked', () => {
		renderShortcode({ exampleId: 'base-plain' })

		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('shadcn')

		fireEvent.click(screen.getByRole('tab', { name: /heroui/i }))

		expect(screen.getByTestId('mock-sandpack').getAttribute('data-type')).toBe('heroui')
	})

	it('renders the native shadcn example without Sandpack when the shadcn-native tab is clicked', () => {
		renderShortcode({ exampleId: 'base-plain' })

		fireEvent.click(screen.getByRole('tab', { name: /shadcn-native/i }))

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

		const shadcnTab = screen.getByRole('tab', { name: /^shadcn$/i })
		const heroTab = screen.getByRole('tab', { name: /heroui/i })
		const nativeTab = screen.getByRole('tab', { name: /shadcn-native/i })

		expect(shadcnTab).toHaveAttribute('aria-selected', 'true')
		expect(heroTab).toHaveAttribute('aria-selected', 'false')
		expect(nativeTab).toHaveAttribute('aria-selected', 'false')

		fireEvent.click(nativeTab)

		expect(screen.getByRole('tab', { name: /^shadcn$/i })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByRole('tab', { name: /heroui/i })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByRole('tab', { name: /shadcn-native/i })).toHaveAttribute('aria-selected', 'true')
	})
})
