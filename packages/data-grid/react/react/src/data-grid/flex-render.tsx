import { isValidElement, type ReactNode } from 'react'

/**
 * Renders a TanStack cell/header value — handles:
 * - Functions (called with props)
 * - React elements (returned as-is)
 * - Strings and numbers (returned as-is)
 * - null / undefined → null
 */
export function flexRender(comp: unknown, props: Record<string, unknown>): ReactNode {
	if (comp === null || comp === undefined) return null
	if (isValidElement(comp)) return comp
	if (typeof comp === 'function') {
		return (comp as (p: Record<string, unknown>) => ReactNode)(props)
	}
	if (typeof comp === 'string' || typeof comp === 'number') {
		return comp as ReactNode
	}
	return null
}
