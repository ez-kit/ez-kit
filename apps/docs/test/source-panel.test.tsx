/// <reference types="@testing-library/jest-dom" />
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

import type { ExampleFile } from '../components/example-file'

const file = (name: string, source: string, language = 'tsx'): ExampleFile => ({
	name,
	path: name,
	source,
	language,
})

const SHORT_SOURCE = 'export const a = 1\n'
const LONG_SOURCE = Array.from({ length: 80 }, (_, i) => `const v${i.toString()} = ${i.toString()}`).join('\n') + '\n'

const SHORT_FILES = [file('Example.tsx', SHORT_SOURCE)]
const LONG_FILES = [file('Example.tsx', LONG_SOURCE)]

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
		render(<SourcePanel files={[file('Example.tsx', 'const answer = 42\n')]} />)
		expect(screen.getByText(/const answer = 42/)).toBeTruthy()
	})

	it('renders the code via DynamicCodeBlock with the file language', () => {
		render(<SourcePanel files={SHORT_FILES} />)

		const block = screen.getByTestId('mock-dyncode')
		expect(block).toHaveAttribute('data-lang', 'tsx')
		expect(block.textContent).toContain('export const a = 1')
	})

	it('hides the Show all toggle and gradient when the code fits within 100px', () => {
		const { container } = render(<SourcePanel files={SHORT_FILES} />)

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
		const { container } = render(<SourcePanel files={LONG_FILES} />)

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
		const { container } = render(<SourcePanel files={LONG_FILES} />)

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

		render(<SourcePanel files={SHORT_FILES} />)

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

const MULTI_FILES = [
	file('Example.tsx', 'export const entry = 1\n'),
	file('data.ts', 'export const columns = []\n', 'ts'),
]

describe('<SourcePanel /> file tabs', () => {
	it('renders no tablist for a single file', () => {
		render(<SourcePanel files={SHORT_FILES} />)
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
	})

	it('renders one tab per file, entry active first', () => {
		render(<SourcePanel files={MULTI_FILES} />)

		expect(screen.getByRole('tablist', { name: /example files/i })).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: 'Example.tsx' })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByRole('tab', { name: 'data.ts' })).toHaveAttribute('aria-selected', 'false')
		expect(screen.getByTestId('mock-dyncode').textContent).toContain('export const entry = 1')
	})

	it('shows the selected file source and language when a tab is clicked', async () => {
		const user = userEvent.setup({ writeToClipboard: false })
		render(<SourcePanel files={MULTI_FILES} />)

		await user.click(screen.getByRole('tab', { name: 'data.ts' }))

		const block = screen.getByTestId('mock-dyncode')
		expect(block.textContent).toContain('export const columns = []')
		expect(block).toHaveAttribute('data-lang', 'ts')
	})

	it('copies the selected file', async () => {
		const user = userEvent.setup({ writeToClipboard: false })
		// `navigator.clipboard` may already be userEvent's stub from an earlier test in
		// this file (its accessor has no setter), so spy on the method rather than
		// reassigning the whole `clipboard` object.
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

		render(<SourcePanel files={MULTI_FILES} />)
		await user.click(screen.getByRole('tab', { name: 'data.ts' }))
		fireEvent.click(screen.getByRole('button', { name: /^copy$/i }))

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('export const columns = []\n')
		})
	})
})
