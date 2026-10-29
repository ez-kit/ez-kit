import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { Component } from 'react'

import type { ReactElement, ReactNode } from 'react'

/** A client per test, without retries, so a rejected `queryFn` settles into an error at once. */
export function createTestClient(): QueryClient {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export type TestRender = {
	client: QueryClient
	container: HTMLElement
	rerender: (ui: ReactElement) => void
}

/** Renders `ui` under its own `QueryClientProvider`; `rerender` keeps the same client. */
export function renderWithClient(ui: ReactElement, client: QueryClient = createTestClient()): TestRender {
	function Wrapper({ children }: { children: ReactNode }): ReactNode {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>
	}
	const { container, rerender } = render(ui, { wrapper: Wrapper })
	return { client, container, rerender }
}

export type Deferred<T> = {
	promise: Promise<T>
	resolve: (value: T) => void
	reject: (reason: unknown) => void
}

/** A promise settled from the outside, to hold a query in flight for as long as a test needs. */
export function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

type ErrorBoundaryProps = {
	children: ReactNode
	fallback: (error: unknown, reset: () => void) => ReactNode
}

type ErrorBoundaryState = { error: unknown; hasError: boolean }

/** The smallest error boundary that can be reset; React offers boundaries only as classes. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	override state: ErrorBoundaryState = { error: undefined, hasError: false }

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return { error, hasError: true }
	}

	reset = (): void => {
		this.setState({ error: undefined, hasError: false })
	}

	override render(): ReactNode {
		if (this.state.hasError) return this.props.fallback(this.state.error, this.reset)
		return this.props.children
	}
}
