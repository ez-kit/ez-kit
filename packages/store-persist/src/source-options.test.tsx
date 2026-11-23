import { useCapabilities, useServices } from '@ez-kit/store-core/react'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { persistHandle } from './handle'
import { PersistProvider } from './provider'
import { objectPort, observable } from './test-kit'
import { createUrlPort } from './url/adapter'
import { applyPersist } from './with-persist'

import type { CommitCtx, Keyed, PersistOptions, SourcePort } from './types'

function Mount({ store }: { store: object }) {
	useCapabilities(store, useServices(), { path: [], name: 'source-options', id: 'one' })
	return null
}

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((yes) => {
		resolve = yes
	})
	return { promise, resolve }
}

afterEach(() => {
	vi.useRealTimers()
})

describe('source-specific write and restore options', () => {
	it('writes the URL immediately and the remote source after 500ms in one persist declaration', async () => {
		vi.useFakeTimers()
		const state = observable({ q: '', note: '', draft: '' })
		const write = Object.freeze({
			sources: Object.freeze({
				router: Object.freeze({ throttleMs: 0 }),
				remote: Object.freeze({ throttleMs: 500, clearOnDefault: false }),
				unused: Object.freeze({ clearOnDefault: false }),
			}),
		})
		const options: PersistOptions = { throttleMs: 200, clearOnDefault: true, write }
		applyPersist<typeof state, typeof state>(state, objectPort, {
			...options,
			fields: (field) => [
				field((s) => s.q, { source: 'router' }),
				field((s) => s.note, {}),
				field((s) => s.draft, { source: 'remote' }),
			],
		})
		let params = new URLSearchParams('foreign=keep')
		const commit = vi.fn((next: URLSearchParams) => {
			params = next
		})
		const url = createUrlPort({ read: () => params, commit })
		const set = vi.fn((_desired: Keyed, _context: CommitCtx) => undefined)
		const remote = { get: () => new Map<string, string>(), set }
		const adapters = {
			router: { usePort: () => ({ port: url, changeKey: 'initial' }) },
			remote: { source: 'ignored-original-name', port: remote },
			unused: { port: { get: () => new Map<string, string>(), set: () => undefined } },
		}
		render(
			<PersistProvider
				adapters={adapters}
				defaultSource='remote'
			>
				<Mount store={state} />
			</PersistProvider>,
		)
		await act(async () => {
			state.q = 'boots'
			state.note = 'hello'
			state.draft = 'new'
			await vi.advanceTimersByTimeAsync(0)
		})
		expect(params.get('q')).toBe('boots')
		expect(params.get('foreign')).toBe('keep')
		expect(commit).toHaveBeenCalledTimes(1)
		expect(set).not.toHaveBeenCalled()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(499)
		})
		expect(set).not.toHaveBeenCalled()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1)
		})
		expect(set).toHaveBeenCalledTimes(1)
		expect(Array.from(set.mock.calls[0]?.[0].values() ?? []).sort()).toEqual(['hello', 'new'])
		expect(set.mock.calls[0]?.[1].diff.set).toHaveLength(2)
		await act(async () => {
			state.q = ''
			state.note = ''
			state.draft = ''
			await vi.advanceTimersByTimeAsync(0)
		})
		expect(params.has('q')).toBe(false)
		expect(set).toHaveBeenCalledTimes(1)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(500)
		})
		expect(set).toHaveBeenCalledTimes(2)
		expect(Array.from(set.mock.calls[1]?.[0].values() ?? [])).toEqual(['', ''])
		expect(set.mock.calls[1]?.[1].diff.removed).toEqual([])
		expect(write.sources.router).toEqual({ throttleMs: 0 })
		expect(options.throttleMs).toBe(200)
	})

	it('rejects an unknown write alias before render seeding or ambient connection reads', () => {
		const state = observable({ q: '', note: '' })
		applyPersist<typeof state, typeof state>(state, objectPort, {
			write: { sources: { typo: { throttleMs: 500 } } },
			fields: (field) => [field((s) => s.q, { source: 'router' }), field((s) => s.note, { source: 'remote' })],
		})
		const read = vi.fn(() => new URLSearchParams())
		const get = vi.fn(() => new Map<string, string>())
		const url = createUrlPort({ read, commit: () => undefined })
		const adapters = {
			router: { usePort: () => ({ port: url, changeKey: 'initial' }) },
			remote: { port: { get, set: () => undefined } },
		}
		expect(() =>
			render(
				<PersistProvider adapters={adapters}>
					<Mount store={state} />
				</PersistProvider>,
			),
		).toThrow(/Unknown write source "typo"; available: remote, router/)
		expect(read).not.toHaveBeenCalled()
		expect(get).not.toHaveBeenCalled()
	})

	it('inherits finite defaults and supports unlimited source overrides, retries and pending joins', async () => {
		vi.useFakeTimers()
		const state = observable({ fast: '', unlimited: '' })
		// JavaScript callers can provide explicit undefined; it inherits rather than disabling the deadline.
		const inherited = Object.freeze(Object.defineProperty({}, 'timeoutMs', { value: undefined, enumerable: true }))
		applyPersist<typeof state, typeof state>(state, objectPort, {
			restore: { timeoutMs: 10, sources: { fast: inherited, unlimited: { timeoutMs: null } } },
			fields: (field) => [field((s) => s.fast, { source: 'fast' }), field((s) => s.unlimited, { source: 'unlimited' })],
		})
		let fastRead = deferred<Keyed>()
		let unlimitedRead = deferred<Keyed>()
		const fast: SourcePort = { get: () => fastRead.promise, set: () => undefined }
		const unlimited: SourcePort = { get: () => unlimitedRead.promise, set: () => undefined }
		render(
			<PersistProvider adapters={{ fast: { port: fast }, unlimited: { port: unlimited } }}>
				<Mount store={state} />
			</PersistProvider>,
		)
		const unlimitedHandle = persistHandle(state, 'unlimited')
		const fastHandle = persistHandle(state, 'fast')
		const joinedUnlimited = unlimitedHandle.restore({ timeoutMs: 1 })
		const joinedFast = fastHandle.restore({ timeoutMs: null })
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100)
		})
		expect(fastHandle.getStatus().restore).toBe('timeout')
		expect((await joinedFast).status).toBe('timeout')
		expect(unlimitedHandle.getStatus().restore).toBe('pending')
		await act(async () => {
			unlimitedRead.resolve(new Map())
			await joinedUnlimited
		})
		expect(unlimitedHandle.getStatus().restore).toBe('ready')

		unlimitedRead = deferred<Keyed>()
		fastRead = deferred<Keyed>()
		let inheritedRetry!: ReturnType<typeof unlimitedHandle.restore>
		let explicitRetry!: ReturnType<typeof fastHandle.restore>
		await act(async () => {
			inheritedRetry = unlimitedHandle.restore()
			explicitRetry = fastHandle.restore({ timeoutMs: null })
			void fastHandle.restore({ timeoutMs: 1 })
			await vi.advanceTimersByTimeAsync(100)
		})
		expect(unlimitedHandle.getStatus().restore).toBe('pending')
		expect(fastHandle.getStatus().restore).toBe('pending')
		await act(async () => {
			unlimitedRead.resolve(new Map())
			fastRead.resolve(new Map())
			await Promise.all([inheritedRetry, explicitRetry])
		})
		expect(unlimitedHandle.getStatus().restore).toBe('ready')
		expect(fastHandle.getStatus().restore).toBe('ready')

		unlimitedRead = deferred<Keyed>()
		let finiteRetry!: ReturnType<typeof unlimitedHandle.restore>
		await act(async () => {
			finiteRetry = unlimitedHandle.restore({ timeoutMs: 5 })
			await vi.advanceTimersByTimeAsync(5)
		})
		expect((await finiteRetry).status).toBe('timeout')
	})
})
