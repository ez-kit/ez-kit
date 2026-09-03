import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

if (typeof globalThis.ResizeObserver === 'undefined') {
	class ResizeObserverMock {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}
	globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
}

/**
 * jsdom implements no Web Animations API, and React Aria's `SharedElementTransition` calls
 * `element.getAnimations()` unconditionally while a HeroUI wizard swaps steps — the throw
 * unmounts the tree, leaving a test staring at an empty container. Returning nothing is the
 * honest answer here: without animations there is nothing running to wait on.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
	Element.prototype.getAnimations = function getAnimations(): Animation[] {
		return []
	}
}

/**
 * jsdom implements no Pointer Capture API. Radix's Slider calls `hasPointerCapture` from its
 * own pointer handlers, so a click on a thumb throws asynchronously — the test still passes
 * while Vitest reports an unhandled error and exits non-zero, which is the worst of both.
 * Reporting "nothing is captured" is the truthful answer in an environment with no pointers.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.hasPointerCapture !== 'function') {
	Element.prototype.hasPointerCapture = function hasPointerCapture(): boolean {
		return false
	}
	Element.prototype.setPointerCapture = function setPointerCapture(): void {}
	Element.prototype.releasePointerCapture = function releasePointerCapture(): void {}
}

afterEach(() => {
	if (typeof document !== 'undefined') {
		cleanup()
	}
})
