/// <reference types="@testing-library/jest-dom" />
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fumadocs-ui/components/dynamic-codeblock', () => ({
	DynamicCodeBlock: ({ code, lang }: { code: string; lang: string }) => (
		<pre
			data-testid='mock-dyncode'
			data-lang={lang}
		>
			{code}
		</pre>
	),
}))

import { SourcePanel } from '../components/source-panel'

const SHORT_SOURCE = 'export const a = 1\n'
const LONG_SOURCE = Array.from({ length: 80 }, (_, i) => `const v${i.toString()} = ${i.toString()}`).join('\n') + '\n'

type RaiseHeight = (el: HTMLElement, height: number) => void

const raiseHeight: RaiseHeight = (el, height) => {
	Object.defineProperty(el, 'scrollHeight', {
		configurable: true,
		value: height,
	})
}

class MockResizeObserver {
	static instances: MockResizeObserver[] = []

	callback: ResizeObserverCallback
	observed: Element | null = null

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback
		MockResizeObserver.instances.push(this)
	}

	observe(target: Element) {
		this.observed = target
	}

	disconnect() {
		this.observed = null
	}

	unobserve() {
		this.observed = null
	}

	trigger() {
		if (this.observed) {
			this.callback([], this)
		}
	}
}

const originalResizeObserver = globalThis.ResizeObserver

beforeEach(() => {
	MockResizeObserver.instances = []
	globalThis.ResizeObserver = MockResizeObserver
})

afterEach(() => {
	globalThis.ResizeObserver = originalResizeObserver
	vi.clearAllMocks()
	vi.useRealTimers()
})

const findMeasuredNode = () => {
	const codeBlock = screen.getByTestId('mock-dyncode')
	const parent = codeBlock.parentElement
	if (!parent) {
		throw new Error('mock-dyncode has no parent element')
	}
	return parent
}

describe('<SourcePanel />', () => {
	it('renders the provided source string', () => {
		render(<SourcePanel source={'const answer = 42\n'} />)
		expect(screen.getByText(/const answer = 42/)).toBeTruthy()
	})

	it('renders the code via DynamicCodeBlock with the provided language', () => {
		render(
			<SourcePanel
				source={SHORT_SOURCE}
				language='tsx'
			/>,
		)

		const block = screen.getByTestId('mock-dyncode')
		expect(block).toHaveAttribute('data-lang', 'tsx')
		expect(block.textContent).toContain('export const a = 1')
	})

	it('hides the Show all toggle and gradient when the code fits within 100px', () => {
		const { container } = render(<SourcePanel source={SHORT_SOURCE} />)

		const measured = findMeasuredNode()
		act(() => {
			raiseHeight(measured, 40)
			const observer = MockResizeObserver.instances.at(-1)
			observer?.trigger()
		})

		expect(screen.queryByRole('button', { name: /show all|hide/i })).not.toBeInTheDocument()
		expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
	})

	it('reveals the Show all toggle and gradient when the code overflows 100px', () => {
		const { container } = render(<SourcePanel source={LONG_SOURCE} />)

		const measured = findMeasuredNode()
		act(() => {
			raiseHeight(measured, 1200)
			const observer = MockResizeObserver.instances.at(-1)
			observer?.trigger()
		})

		const toggle = screen.getByRole('button', { name: /show all/i })
		expect(toggle).toHaveAttribute('aria-expanded', 'false')
		expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
	})

	it('expands and collapses when the toggle is clicked', () => {
		const { container } = render(<SourcePanel source={LONG_SOURCE} />)

		const measured = findMeasuredNode()
		act(() => {
			raiseHeight(measured, 1200)
			MockResizeObserver.instances.at(-1)?.trigger()
		})

		const showAll = screen.getByRole('button', { name: /show all/i })
		fireEvent.click(showAll)

		const hide = screen.getByRole('button', { name: /hide/i })
		expect(hide).toHaveAttribute('aria-expanded', 'true')
		expect(container.querySelector('[aria-hidden="true"]')).toBeNull()

		fireEvent.click(hide)
		const showAllAgain = screen.getByRole('button', { name: /show all/i })
		expect(showAllAgain).toHaveAttribute('aria-expanded', 'false')
		expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
	})

	it('copies the raw code to the clipboard and shows transient Copied feedback', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.assign(navigator, { clipboard: { writeText } })

		render(<SourcePanel source={SHORT_SOURCE} />)

		fireEvent.click(screen.getByRole('button', { name: /^copy$/i }))

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('export const a = 1\n')
		})

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
		})

		await waitFor(
			() => {
				expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
			},
			{ timeout: 2500, interval: 100 },
		)
	})
})
