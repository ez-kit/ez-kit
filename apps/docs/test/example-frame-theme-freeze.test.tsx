/// <reference types="@testing-library/jest-dom" />
import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ExampleFrame } from '@/components/example-frame'

// The docs theme toggle changes `useTheme().resolvedTheme` reactively. `ExampleFrame` must NOT
// fold that reactive value into the iframe `src` on every render — doing so changes `src`,
// which makes the browser navigate/reload the iframe and destroys all grid state (sort/
// selection/expansion/scroll). This test drives `useTheme` directly (bypassing next-themes'
// DOM/localStorage machinery, which is unnecessary to prove the regression and would be
// flakier to drive through jsdom) and asserts the iframe `src` is frozen after first mount.
let mockResolvedTheme: 'light' | 'dark' = 'light'

vi.mock('next-themes', () => ({
	useTheme: () => ({ resolvedTheme: mockResolvedTheme }),
}))

// jsdom has no IntersectionObserver; the repo-wide docs mock (vitest.setup.docs.ts) installs a
// no-op stub that never fires, which is fine for tests that don't need `ExampleFrame` to become
// visible. This test needs the iframe to actually mount, so it swaps in a stub whose `observe`
// synchronously reports the target as intersecting.
class ImmediateIntersectionObserver implements IntersectionObserver {
	readonly root: Element | Document | null = null
	readonly rootMargin: string = ''
	readonly thresholds: readonly number[] = []
	private readonly callback: IntersectionObserverCallback

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback
	}

	observe(target: Element): void {
		const entry = { isIntersecting: true, target } as IntersectionObserverEntry
		this.callback([entry], this)
	}

	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IntersectionObserverEntry[] {
		return []
	}
}

let originalIntersectionObserver: typeof IntersectionObserver

beforeEach(() => {
	mockResolvedTheme = 'light'
	originalIntersectionObserver = globalThis.IntersectionObserver
	globalThis.IntersectionObserver = ImmediateIntersectionObserver
})

afterEach(() => {
	globalThis.IntersectionObserver = originalIntersectionObserver
})

test('iframe src is frozen at first-visible theme and does not change when the docs theme toggles', () => {
	const { container, rerender } = render(
		<ExampleFrame
			kit='shadcn'
			slug='base-sorting'
		/>,
	)

	const iframe = container.querySelector('iframe')
	expect(iframe).not.toBeNull()
	const initialSrc = iframe?.getAttribute('src')
	expect(initialSrc).toContain('theme=light')

	// Simulate the user toggling the docs theme (next-themes flips resolvedTheme reactively).
	mockResolvedTheme = 'dark'
	rerender(
		<ExampleFrame
			kit='shadcn'
			slug='base-sorting'
		/>,
	)

	const srcAfterToggle = container.querySelector('iframe')?.getAttribute('src')
	// If the fix is reverted (src reads the live `theme` instead of a frozen ref), this
	// becomes `theme=dark` and the assertion below fails — proving the regression is caught.
	expect(srcAfterToggle).toBe(initialSrc)
	expect(srcAfterToggle).toContain('theme=light')
})
