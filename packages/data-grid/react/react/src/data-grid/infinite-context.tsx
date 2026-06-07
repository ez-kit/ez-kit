import { createContext, useContext } from 'react'

import type { ReactNode } from 'react'

/**
 * Shares the resolved scroll element with the infinite-scroll machinery.
 *
 * `DataGridTable` owns scroll-element resolution (the virtualizer's container in
 * virtualized mode, or the `data-slot="table-scroll"` element otherwise). The
 * `LoadMoreFooter` (IntersectionObserver root) and the reset-on-query logic
 * (scroll-to-top) read it from here instead of re-resolving the DOM.
 */
type InfiniteContextValue = {
	getScrollElement: () => HTMLElement | null
}

const InfiniteContext = createContext<InfiniteContextValue>({ getScrollElement: () => null })

export function InfiniteProvider({
	getScrollElement,
	children,
}: {
	getScrollElement: () => HTMLElement | null
	children: ReactNode
}) {
	return <InfiniteContext value={{ getScrollElement }}>{children}</InfiniteContext>
}

export function useInfiniteContext(): InfiniteContextValue {
	return useContext(InfiniteContext)
}
