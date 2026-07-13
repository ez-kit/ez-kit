import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useUrlState } from '../hooks/use-url-state'

let currentSearch = ''
const replaceMock = vi.fn((url: string) => {
	currentSearch = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
})

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock, push: replaceMock }),
	usePathname: () => '/docs/data-grid',
	useSearchParams: () => new URLSearchParams(currentSearch),
}))

const FLAVORS = ['shadcn', 'heroui'] as const
type Flavor = (typeof FLAVORS)[number]

const STORAGE_KEY = 'ez-docs:url-state:kit'

const renderUrlState = (defaultValue: Flavor = 'shadcn', persistAcrossNavigation = true) =>
	renderHook(() => useUrlState<Flavor>('kit', { allowedValues: FLAVORS, defaultValue, persistAcrossNavigation }))

afterEach(() => {
	vi.clearAllMocks()
	currentSearch = ''
	window.localStorage.clear()
})

describe('useUrlState', () => {
	it('returns the default value when the URL has no matching param', () => {
		const { result } = renderUrlState('shadcn')

		expect(result.current[0]).toBe('shadcn')
	})

	it('reads a valid value from the URL', () => {
		currentSearch = 'kit=heroui'

		const { result } = renderUrlState('shadcn')

		expect(result.current[0]).toBe('heroui')
	})

	it('falls back to the default for a value outside the allowed set', () => {
		currentSearch = 'kit=bootstrap'

		const { result } = renderUrlState('shadcn')

		expect(result.current[0]).toBe('shadcn')
	})

	it('writes the value to the URL and localStorage when set', () => {
		const { result } = renderUrlState('shadcn')

		act(() => {
			result.current[1]('heroui')
		})

		expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('kit=heroui'), { scroll: false })
		expect(window.localStorage.getItem(STORAGE_KEY)).toBe('heroui')
	})

	it('preserves unrelated search params when writing', () => {
		currentSearch = 'tab=sorting'

		const { result } = renderUrlState('shadcn')

		act(() => {
			result.current[1]('heroui')
		})

		const [written] = replaceMock.mock.calls[0] ?? []
		expect(written).toContain('tab=sorting')
		expect(written).toContain('kit=heroui')
	})

	it('re-applies the stored value to the URL after a navigation drops the query string', () => {
		window.localStorage.setItem(STORAGE_KEY, 'heroui')

		renderUrlState('shadcn')

		expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('kit=heroui'), { scroll: false })
	})

	it('does not re-apply the stored value when it equals the default', () => {
		window.localStorage.setItem(STORAGE_KEY, 'shadcn')

		renderUrlState('shadcn')

		expect(replaceMock).not.toHaveBeenCalled()
	})

	it('does not read or write storage when persistAcrossNavigation is false', () => {
		window.localStorage.setItem(STORAGE_KEY, 'heroui')

		const { result } = renderUrlState('shadcn', false)

		expect(replaceMock).not.toHaveBeenCalled()

		act(() => {
			result.current[1]('heroui')
		})

		expect(window.localStorage.getItem(STORAGE_KEY)).toBe('heroui') // pre-seeded value untouched
		expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining('kit=heroui'), { scroll: false })
	})
})
