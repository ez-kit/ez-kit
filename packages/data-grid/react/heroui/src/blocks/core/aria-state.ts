import { useIsomorphicLayoutEffect } from '../../hooks/use-isomorphic-layout-effect'

import type { RefObject } from 'react'

/**
 * The ARIA state attributes the shared layer writes, and React Aria drops.
 *
 * `@ez-kit/data-grid-react` authors `aria-sort`, `aria-selected`, `aria-expanded`,
 * `aria-rowcount`, `aria-rowindex`, `aria-busy` and `aria-multiselectable` for every kit — see
 * `data-grid/aria-state.ts` there. None of them reaches the DOM in this kit: React Aria builds
 * its own DOM prop bag with `filterDOMProps`, which lets `data-*` through (which is why
 * `data-slot` and `data-column-id` survive) and keeps only `aria-label`, `aria-labelledby`,
 * `aria-describedby` and `aria-details` of the aria family. Everything else is discarded before
 * the element exists.
 *
 * A `ref` is not a way round it either. `Table` forwards one to the real `<table>`, but `Column`
 * and `Row` are **collection** elements: React Aria renders them once to build its collection and
 * again as DOM, and a ref handed to one never reaches the node. Measured, not assumed — see
 * `aria-state.test.tsx`, where the table's ref lands and the column's and row's do not.
 *
 * So the value travels as `data-aria-*`, which React Aria does forward, and {@link useAriaStateMirror}
 * copies it onto the real attribute. Two passes, because the two halves are driven by different
 * renders: the observer catches a row re-rendering on its own, which an effect on the table would
 * sleep through.
 */
const MIRRORED = ['sort', 'selected', 'expanded', 'rowcount', 'rowindex', 'busy', 'multiselectable'] as const

const ARIA_NAMES = new Set(MIRRORED.map((name) => `aria-${name}`))
const DATA_NAMES = MIRRORED.map((name) => `data-aria-${name}`)
const CARRIER_SELECTOR = DATA_NAMES.map((name) => `[${name}]`).join(', ')

/**
 * Rewrites the ARIA state props of an incoming prop bag as `data-aria-*`, leaving everything else
 * — including the aria attributes React Aria does forward — untouched.
 */
export function asAriaStateCarrier(props: object): Record<string, unknown> {
	const source = props as Record<string, unknown>
	const carried = Object.fromEntries(Object.entries(source).filter(([key]) => !ARIA_NAMES.has(key))) as Record<
		string,
		unknown
	>

	for (const name of MIRRORED) {
		const value = source[`aria-${name}`]
		if (value !== undefined && value !== null) carried[`data-aria-${name}`] = String(value)
	}

	return carried
}

function applyTo(element: Element): void {
	for (const name of MIRRORED) {
		const value = element.getAttribute(`data-aria-${name}`)
		if (value === null) element.removeAttribute(`aria-${name}`)
		else element.setAttribute(`aria-${name}`, value)
	}
}

function syncSubtree(root: Element): void {
	if (root.matches(CARRIER_SELECTOR)) applyTo(root)
	root.querySelectorAll(CARRIER_SELECTOR).forEach(applyTo)
}

/**
 * Keeps every `data-aria-*` carrier under `ref` mirrored onto its real ARIA attribute.
 *
 * Mounted once, on the `<table>`. `apps/docs/e2e/packages/data-grid/a11y/state-semantics.spec.ts`
 * asserts the result in a browser for both kits, so the day React Aria stops filtering these — or
 * starts authoring one itself — the spec says so rather than this quietly fighting it.
 */
export function useAriaStateMirror<T extends HTMLElement>(ref: RefObject<T | null>): void {
	useIsomorphicLayoutEffect(() => {
		const root = ref.current
		if (root === null) return

		syncSubtree(root)

		const observer = new MutationObserver((records) => {
			for (const record of records) {
				if (record.type === 'attributes' && record.target instanceof Element) applyTo(record.target)
				record.addedNodes.forEach((node) => {
					if (node instanceof Element) syncSubtree(node)
				})
			}
		})
		observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: DATA_NAMES })

		return () => {
			observer.disconnect()
		}
	}, [ref])
}
