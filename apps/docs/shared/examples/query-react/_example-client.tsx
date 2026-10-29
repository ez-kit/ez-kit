'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'

import type { ReactNode } from 'react'

/**
 * Every live example runs under its own `QueryClient`, so one example's cache never answers
 * another's queries. Retries are off so a simulated failure lands at once instead of after
 * TanStack's three retries with backoff.
 */
export function ExampleQueryClient({ children }: { children: ReactNode }) {
	const [client] = useState(
		() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
	)
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** A badge counting how many times the component it sits in has rendered. */
export function RenderCount({ label = 'renders' }: { label?: string }) {
	const count = useRef(0)
	count.current += 1
	return (
		<Badge
			variant='outline'
			className='font-mono tabular-nums'
		>
			{label}: {count.current}
		</Badge>
	)
}
