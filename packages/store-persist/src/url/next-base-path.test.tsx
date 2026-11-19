import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
	replace: vi.fn<(url: string) => void>(),
}))
vi.mock('next/navigation', () => ({
	useSearchParams: () => new URLSearchParams('q=newer'),
	usePathname: () => '/layout',
	useRouter: () => navigation,
}))

import { nextAdapter } from './next'
it('writes to the same App Router page after popstate with a Next basePath', () => {
	const view = renderHook(() => nextAdapter.usePort())
	const port = view.result.current.port
	const unsubscribe = port.subscribe?.(() => undefined)
	try {
		window.history.replaceState(null, '', '/dashboard/layout?q=older')
		window.dispatchEvent(new PopStateEvent('popstate'))
		expect(port.get().get('q')).toBe('older')
		void port.set(new Map([['page', '2']]), { fields: [], diff: { set: ['page'], removed: [] }, meta: {} })
		const href = navigation.replace.mock.calls.at(-1)?.[0]
		if (href === undefined) throw new Error('Missing navigation')
		// Next internally calls addBasePath(href) before resolving it against window.location.
		const prefixed = href.startsWith('/') ? '/dashboard' + href : href
		expect(new URL(prefixed, window.location.href).pathname).toBe('/dashboard/layout')
	} finally {
		unsubscribe?.()
		view.unmount()
		window.history.replaceState(null, '', '/')
	}
})
