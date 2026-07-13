// Docs-app-only test setup, layered on top of the repo-shared `vitest.setup.ts`.
// `ExampleFrame` (apps/docs/components/example-frame.tsx) lazily loads its iframe via
// `IntersectionObserver`, which jsdom does not implement.
if (typeof globalThis.IntersectionObserver === 'undefined') {
	class IntersectionObserverMock implements IntersectionObserver {
		readonly root: Element | Document | null = null
		readonly rootMargin: string = ''
		readonly thresholds: readonly number[] = []
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
		takeRecords(): IntersectionObserverEntry[] {
			return []
		}
	}
	globalThis.IntersectionObserver = IntersectionObserverMock
}
