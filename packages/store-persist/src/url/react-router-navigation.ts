import { createContext } from 'react'
import * as ReactRouter from 'react-router'

import { SourceMutationCancelledError } from '../source-errors'

import type { Context } from 'react'

type Location = { key: string; pathname: string; search: string; hash: string; state: unknown }
type NavigationState = {
	location: Location
	navigation: { state: string; location?: Location }
	blockers: ReadonlyMap<string, { state: string; location?: Location }>
}
export type ObservableRouter = {
	basename: string
	state: NavigationState
	subscribe(listener: () => void): () => void
	navigate(
		target: { pathname: string; search: string; hash: string },
		options: { replace: boolean; state: unknown },
	): void | Promise<void>
}

const exports = ReactRouter as unknown as Record<string, unknown>
const fallback = createContext<unknown>(null)
// These explicitly exported integration contexts are optional on the declared older peer range.
// Reading a namespace property avoids a missing named-export link error on React Router 6.0.
export const DataRouterContext = (('UNSAFE_DataRouterContext' in exports
	? exports.UNSAFE_DataRouterContext
	: undefined) ?? fallback) as Context<unknown>
export const DataRouterStateContext = (('UNSAFE_DataRouterStateContext' in exports
	? exports.UNSAFE_DataRouterStateContext
	: undefined) ?? fallback) as Context<unknown>

export const NavigationContext = (('UNSAFE_NavigationContext' in exports
	? exports.UNSAFE_NavigationContext
	: undefined) ?? fallback) as Context<unknown>

type HistoryNavigator = { readonly location: { key: string } }
/** Basic routers publish their history as the navigator; read its generated key without patching it. */
export function historyNavigator(context: unknown): HistoryNavigator | undefined {
	const navigator = context !== null && typeof context === 'object' && 'navigator' in context ? context.navigator : null
	if (navigator !== null && typeof navigator === 'object' && 'location' in navigator) {
		const location = navigator.location
		if (location !== null && typeof location === 'object' && 'key' in location && typeof location.key === 'string')
			return navigator as HistoryNavigator
	}
	return undefined
}

function identityUnavailable(): Error {
	return new Error(
		'[ez-kit/store-persist] React Router navigation identity requires synchronously observable location keys',
	)
}

export function observableRouter(context: unknown, stateContext: unknown): ObservableRouter | undefined {
	if (context === null || context === undefined) {
		if (stateContext !== null && stateContext !== undefined)
			throw new Error('[ez-kit/store-persist] React Router data navigation acknowledgement is unavailable')
		return undefined
	}
	const router = typeof context === 'object' && 'router' in context ? context.router : undefined
	if (
		router !== null &&
		typeof router === 'object' &&
		'state' in router &&
		'navigate' in router &&
		'subscribe' in router &&
		'basename' in router
	) {
		const state = router.state
		if (
			typeof router.navigate === 'function' &&
			typeof router.subscribe === 'function' &&
			typeof router.basename === 'string' &&
			state !== null &&
			typeof state === 'object' &&
			'location' in state &&
			'navigation' in state &&
			'blockers' in state &&
			state.blockers !== null &&
			typeof state.blockers === 'object' &&
			'values' in state.blockers &&
			typeof state.blockers.values === 'function'
		)
			return router as ObservableRouter
	}
	throw new Error(
		'[ez-kit/store-persist] React Router data navigation acknowledgement requires observable router state and blockers',
	)
}

function searchSignature(search: string): string {
	const params = new URLSearchParams(search)
	params.sort()
	return params.toString()
}

/** Resolve only for an accepted target; blocking waits for proceed/reset instead of acknowledging a void command. */
export function acknowledgeNavigation(
	router: ObservableRouter,
	target: { pathname: string; search: string; hash: string },
	options: { replace: boolean; state: unknown },
	own: (key: string) => void,
	committed: { get(): { key: string }; subscribe(listener: (mounted: boolean) => void): () => void },
): Promise<void> {
	return new Promise((resolve, reject) => {
		let finished = false
		let completed = false
		let unsubscribe = (): void => undefined
		let unsubscribeCommit = (): void => undefined
		const keys = new Set<string>()
		let frame = 0
		let publishedFrame = 0
		let capture: ReadonlySet<string> | undefined
		const locations = (): Location[] => [
			router.state.location,
			...(router.state.navigation.location ? [router.state.navigation.location] : []),
			...[...router.state.blockers.values()].flatMap((blocker) => (blocker.location ? [blocker.location] : [])),
		]
		const expectedPath = `${router.basename === '/' ? '' : router.basename.replace(/\/$/, '')}${target.pathname}`
		const matches = (location: Location): boolean =>
			location.pathname === expectedPath &&
			searchSignature(location.search) === searchSignature(target.search) &&
			location.hash === target.hash
		const finish = (error?: Error): void => {
			if (finished) return
			finished = true
			unsubscribe()
			unsubscribeCommit()
			if (error === undefined) resolve()
			else reject(error)
		}
		const fail = (error: unknown): void => {
			finish(
				error instanceof Error ? error : new Error('[ez-kit/store-persist] URL navigation rejected', { cause: error }),
			)
		}
		const inspect = (): void => {
			if (finished) return
			if (capture)
				for (const location of locations()) {
					if (capture.has(location.key) || !matches(location)) continue
					publishedFrame = frame
					if (!keys.has(location.key)) {
						keys.add(location.key)
						own(location.key)
					}
					capture = undefined
					break
				}
			if (!completed) return
			const state = router.state
			// The router can finish a transition while React still displays the previous screen.
			// Reconcile only after its operational snapshot commits, never from a suspended render.
			if (state.location.key !== committed.get().key) return
			if (keys.has(state.location.key) && matches(state.location)) {
				finish()
				return
			}
			if (state.navigation.state !== 'idle' && state.navigation.location && keys.has(state.navigation.location.key))
				return
			for (const blocker of state.blockers.values())
				if (blocker.state !== 'unblocked' && blocker.location && keys.has(blocker.location.key)) return
			finish(
				new SourceMutationCancelledError(
					'[ez-kit/store-persist] URL navigation was cancelled or redirected before acknowledgement',
				),
			)
		}
		try {
			unsubscribe = router.subscribe(inspect)
			unsubscribeCommit = committed.subscribe((mounted) => {
				if (mounted) inspect()
				else finish(new Error('[ez-kit/store-persist] URL adapter unmounted before acknowledgement'))
			})
			// A state getter preserves the exact user value while reopening observation when a
			// blocked navigation proceeds: React Router invokes the retained options again.
			// Only keys published in that synchronous dispatch are owned. Matching a later URL
			// alone cannot distinguish an external navigation to the same query.
			const observedOptions = {
				replace: options.replace,
				get state(): unknown {
					const currentFrame = ++frame
					capture = new Set(locations().map((location) => location.key))
					queueMicrotask(() => {
						if (finished || currentFrame !== frame) return
						capture = undefined
						// A delayed publication could belong to another command. Its outcome is
						// uncertain, so this is deliberately not a proven cancellation signal.
						if (publishedFrame !== currentFrame) finish(identityUnavailable())
					})
					return options.state
				},
			}
			const result = router.navigate(target, observedOptions)
			capture = undefined
			Promise.resolve(result).then(() => {
				completed = true
				if (keys.size === 0) finish(identityUnavailable())
				else inspect()
			}, fail)
		} catch (error) {
			fail(error)
		}
	})
}
