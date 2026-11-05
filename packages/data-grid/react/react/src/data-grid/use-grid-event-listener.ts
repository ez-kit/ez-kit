import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

/** React capture reaches portalled children as well as DOM descendants. */
const eventOwners = new WeakMap<Event, string>()
const SCOPE_ATTRIBUTE = 'data-grid-event-scope'

export const GridEventScopeContext = createContext<string | null>(null)

export function markGridEvent(event: Event, scope: string): void {
	eventOwners.set(event, scope)
}

export function useGridEventRoot(): () => Element | null {
	const scope = useContext(GridEventScopeContext)
	return useCallback(() => (scope === null ? null : document.querySelector(`[${SCOPE_ATTRIBUTE}="${scope}"]`)), [scope])
}

/** Native listeners survive kit primitives that do not forward DOM handlers. */
export function useGridEventListener<K extends keyof DocumentEventMap>(
	type: K,
	listener: (event: DocumentEventMap[K]) => void,
	{
		enabled = true,
		capture = false,
		outside = false,
	}: { enabled?: boolean; capture?: boolean; outside?: boolean } = {},
): void {
	const scope = useContext(GridEventScopeContext)
	const getRoot = useGridEventRoot()
	const latest = useRef(listener)
	useSafeLayoutEffect(() => {
		latest.current = listener
	})
	useEffect(() => {
		if (!enabled) return undefined
		const handle = (event: DocumentEventMap[K]): void => {
			if (!outside) {
				const owner = eventOwners.get(event)
				if (owner !== undefined) {
					if (owner !== scope) return
				} else {
					const target = event.target === document ? document.activeElement : event.target
					const root = getRoot()
					if (!(target instanceof Element) || root === null || target.closest(`[${SCOPE_ATTRIBUTE}]`) !== root) return
				}
			}
			latest.current(event)
		}
		document.addEventListener(type, handle, capture)
		return () => {
			document.removeEventListener(type, handle, capture)
		}
	}, [type, enabled, capture, outside, scope, getRoot])
}
