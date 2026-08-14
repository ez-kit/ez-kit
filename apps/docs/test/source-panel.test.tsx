/// <reference types="@testing-library/jest-dom" />
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fumadocs-ui/components/dynamic-codeblock', () => ({
	// Mirrors fumadocs' real DynamicCodeBlock, whose code viewport renders with the
	// `fd-scroll-container` class and caps its own rendered height at 600px via CSS
	// (`overflow-auto max-h-[600px]`) — independent of how tall the code really is.
	// jsdom has no layout engine, so `viewportOffsetHeight` below stands in for what a
	// real browser would compute for that clamped box; the source panel is expected to
	// neutralize it (inline `maxHeight`/`overflow`) before measuring.
	DynamicCodeBlock: ({ code, lang }: { code: string; lang: string }) => (
		<div
			className='fd-scroll-container'
			data-testid='mock-fd-viewport'
		>
			<pre
				data-testid='mock-dyncode'
				data-lang={lang}
			>
				{code}
			</pre>
		</div>
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

/** The `contentRef` div the source panel measures — one level above the mock fumadocs viewport. */
const findMeasuredNode = () => {
	const viewport = screen.getByTestId('mock-fd-viewport')
	const parent = viewport.parentElement
	if (!parent) {
		throw new Error('mock-fd-viewport has no parent element')
	}
	return parent
}

/** The mock fumadocs code viewport, which the source panel must un-clamp before measuring. */
const findViewportNode = () => screen.getByTestId('mock-fd-viewport')

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

	it('un-clamps the fumadocs viewport instead of trusting its own rendered height', () => {
		render(<SourcePanel files={LONG_FILES} />)

		const measured = findMeasuredNode()
		act(() => {
			raiseHeight(measured, 1200)
			MockResizeObserver.instances.at(-1)?.trigger()
		})

		const viewport = findViewportNode()
		expect(viewport.style.maxHeight).toBe('none')
		expect(viewport.style.overflow).toBe('visible')
	})

	it('re-measures and grows the panel when switching the active file tab while expanded', async () => {
		const user = userEvent.setup({ writeToClipboard: false })
		const DATA_SOURCE = Array.from({ length: 20 }, (_, i) => `export const v${i.toString()} = ${i.toString()}`).join(
			'\n',
		)
		const SERVER_SOURCE = Array.from({ length: 120 }, (_, i) => `export const w${i.toString()} = ${i.toString()}`).join(
			'\n',
		)
		const files = [file('data.ts', DATA_SOURCE, 'ts'), file('server.ts', SERVER_SOURCE, 'ts')]

		render(<SourcePanel files={files} />)

		// Expand data.ts.
		act(() => {
			raiseHeight(findMeasuredNode(), 643)
			MockResizeObserver.instances.at(-1)?.trigger()
		})
		fireEvent.click(screen.getByRole('button', { name: /show all/i }))

		const outer = () => {
			const panel = screen.getByRole('tabpanel')
			const div = panel.firstElementChild
			if (!(div instanceof HTMLElement)) {
				throw new Error('tabpanel has no wrapping div')
			}
			return div
		}
		expect(outer().style.maxHeight).toBe('643px')
		expect(findViewportNode().style.maxHeight).toBe('none')
		expect(findViewportNode().style.overflow).toBe('visible')

		// Switch to server.ts, whose real (un-clamped) height is much taller. The panel must
		// re-measure server.ts's own viewport rather than staying locked at data.ts's 643px, and
		// the toggle must keep saying "Hide" only because the full file is now actually shown.
		await user.click(screen.getByRole('tab', { name: 'server.ts' }))
		act(() => {
			raiseHeight(findMeasuredNode(), 3454)
			MockResizeObserver.instances.at(-1)?.trigger()
		})

		expect(outer().style.maxHeight).toBe('3454px')
		expect(findViewportNode().style.maxHeight).toBe('none')
		expect(findViewportNode().style.overflow).toBe('visible')
		expect(screen.getByRole('button', { name: /hide/i })).toHaveAttribute('aria-expanded', 'true')

		// Collapse, then switch back to data.ts and expand again — height and label must never
		// disagree at any point in that sequence.
		fireEvent.click(screen.getByRole('button', { name: /hide/i }))
		expect(outer().style.maxHeight).toBe('100px')

		await user.click(screen.getByRole('tab', { name: 'data.ts' }))
		act(() => {
			raiseHeight(findMeasuredNode(), 643)
			MockResizeObserver.instances.at(-1)?.trigger()
		})
		fireEvent.click(screen.getByRole('button', { name: /show all/i }))

		expect(outer().style.maxHeight).toBe('643px')
		expect(screen.getByRole('button', { name: /hide/i })).toHaveAttribute('aria-expanded', 'true')
	})
})
