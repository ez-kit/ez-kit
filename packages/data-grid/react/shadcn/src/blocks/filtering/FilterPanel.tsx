'use client'

import type { FilterPanelProps } from '@ez-kit/data-grid-react'

export function FilterPanel({ children }: FilterPanelProps) {
	return <div className='mb-3 flex flex-wrap items-center gap-2'>{children}</div>
}
