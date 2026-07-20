import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveVerticalScrollElement } from './table'

// resolveVerticalScrollElement drives infinite-scroll edge detection / reset-to-top: it must
// return the element that actually scrolls *vertically* under the table-scroll root. Usually
// that is the root itself; a UI kit (HeroUI) may instead relocate the vertical bound onto a
// nested `[data-slot='table-scroll-container']`, which is only the vertical scroller when its
// computed `overflow-y` scrolls. jsdom has no layout, so the overflow probe is stubbed.

const SCROLL_ROOT_SLOT = 'table-scroll'
const INNER_CONTAINER_SLOT = 'table-scroll-container'

function makeScrollRoot(): HTMLElement {
	const root = document.createElement('div')
	root.setAttribute('data-slot', SCROLL_ROOT_SLOT)
	return root
}

function withInnerContainer(root: HTMLElement): HTMLElement {
	const inner = document.createElement('div')
	inner.setAttribute('data-slot', INNER_CONTAINER_SLOT)
	root.appendChild(inner)
	return inner
}

/** Stub getComputedStyle so only `el` reports the given overflow-y; everything else is visible. */
function stubOverflowY(el: HTMLElement, overflowY: string): void {
	vi.spyOn(window, 'getComputedStyle').mockImplementation(
		(target: Element) => ({ overflowY: target === el ? overflowY : 'visible' }) as CSSStyleDeclaration,
	)
}

describe('resolveVerticalScrollElement', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('returns the scroll root when there is no inner container (shadcn shape)', () => {
		const root = makeScrollRoot()
		expect(resolveVerticalScrollElement(root)).toBe(root)
	})

	it('returns the inner container when it is the vertical scroller (HeroUI sticky-header shape)', () => {
		const root = makeScrollRoot()
		const inner = withInnerContainer(root)
		stubOverflowY(inner, 'auto')
		expect(resolveVerticalScrollElement(root)).toBe(inner)
	})

	it('accepts "scroll" as a scrolling overflow value', () => {
		const root = makeScrollRoot()
		const inner = withInnerContainer(root)
		stubOverflowY(inner, 'scroll')
		expect(resolveVerticalScrollElement(root)).toBe(inner)
	})

	it('falls back to the scroll root when the inner container grows freely in height', () => {
		// HeroUI's default: the inner container scrolls horizontally but its overflow-y is
		// `visible`, so it is NOT the vertical scroller — treating it as one reports
		// "already at the bottom" forever.
		const root = makeScrollRoot()
		const inner = withInnerContainer(root)
		stubOverflowY(inner, 'visible')
		expect(resolveVerticalScrollElement(root)).toBe(root)
	})
})
