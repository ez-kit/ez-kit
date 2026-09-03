import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react'

/**
 * A value the grid can render: a ready element, a literal, or something mountable.
 *
 * `ComponentType` covers plain function components and class components; the exotic wrappers
 * (`memo`, `forwardRef`) are objects rather than functions and are recognised at runtime by
 * {@link isExoticComponent}.
 */
export type Renderable<TProps extends object> = ReactNode | ComponentType<TProps>

/**
 * `memo(...)` and `forwardRef(...)` return objects carrying a `$$typeof` symbol, not functions,
 * so a bare `typeof === 'function'` check rejects them.
 */
function isExoticComponent(comp: unknown): comp is ComponentType<never> {
	if (typeof comp !== 'object' || comp === null) return false
	const tag = (comp as { $$typeof?: unknown }).$$typeof
	return typeof tag === 'symbol' && (tag.description === 'react.memo' || tag.description === 'react.forward_ref')
}

/**
 * Renders a cell / header / custom slot value.
 *
 * A renderer is **mounted**, not called: `createElement(Comp, props)` gives it its own fiber, so
 * it may use hooks, be wrapped in `memo` / `forwardRef`, sit under an error boundary, and show up
 * in React DevTools. Invoking it as `Comp(props)` — which this did — smuggled its hooks into the
 * caller's fiber, where a branch that swapped one renderer for another (the filter input does
 * exactly that when the operator changes) reordered them and crashed the caller.
 *
 * Same contract as `@tanstack/react-table`'s own `flexRender`, which this package reimplements
 * because it depends on `@tanstack/table-core` alone.
 *
 * The renderer's identity is its component type, so a renderer rebuilt on every render remounts
 * on every render. Column definitions already have to be stable for TanStack's sake; this makes
 * an unstable one visible instead of merely wasteful.
 */
export function flexRender(comp: unknown, props: object): ReactNode {
	if (comp === null || comp === undefined) return null
	if (isValidElement(comp)) return comp
	if (typeof comp === 'function' || isExoticComponent(comp)) {
		return createElement(comp as ComponentType<object>, props)
	}
	if (typeof comp === 'string' || typeof comp === 'number') return comp
	return null
}
