import { createContext, useContext } from 'react'

import type { Virtualizer } from '@tanstack/react-virtual'

type RowVirtualizer = Virtualizer<HTMLDivElement, Element>

type VirtualContextValue = {
	rowVirtualizer: RowVirtualizer | null
}

const VirtualContext = createContext<VirtualContextValue>({ rowVirtualizer: null })

export function VirtualProvider({
	rowVirtualizer,
	children,
}: {
	rowVirtualizer: RowVirtualizer
	children: React.ReactNode
}) {
	return <VirtualContext value={{ rowVirtualizer }}>{children}</VirtualContext>
}

export function useVirtualContext(): VirtualContextValue {
	return useContext(VirtualContext)
}
