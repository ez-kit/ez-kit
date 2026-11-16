import { createContext } from 'react'
import * as ReactRouter from 'react-router'

import { SourceMutationCancelledError } from '../source-errors'

import type { Context } from 'react'

type Location = { key: string; pathname: string; search: string; state: unknown }
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

export const NAVIGATION_OWNER = '@ez-kit/store-persist:url-navigation'
export function navigationOwner(state: unknown): unknown {
	return state !== null && typeof state === 'object' && NAVIGATION_OWNER in state ? state[NAVIGATION_OWNER] : undefined
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
	token: string,
	committed: { get(): { key: string }; subscribe(listener: (mounted: boolean) => void): () => void },
): Promise<void> {
	return new Promise((resolve, reject) => {
		let finished = false
		let completed = false
		let unsubscribe = (): void => undefined
		let unsubscribeCommit = (): void => undefined
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
			if (finished || !completed) return
			const state = router.state
			// The router can finish a transition while React still displays the previous screen.
			// Reconcile only after its operational snapshot commits, never from a suspended render.
			if (state.location.key !== committed.get().key) return
			const expectedPath = `${router.basename === '/' ? '' : router.basename.replace(/\/$/, '')}${target.pathname}`
			if (
				navigationOwner(state.location.state) === token &&
				state.location.pathname === expectedPath &&
				searchSignature(state.location.search) === searchSignature(target.search)
			) {
				finish()
				return
			}
			if (state.navigation.state !== 'idle' && navigationOwner(state.navigation.location?.state) === token) return
			for (const blocker of state.blockers.values())
				if (blocker.state !== 'unblocked' && navigationOwner(blocker.location?.state) === token) return
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
			Promise.resolve(router.navigate(target, options)).then(() => {
				completed = true
				inspect()
			}, fail)
		} catch (error) {
			fail(error)
		}
	})
}
