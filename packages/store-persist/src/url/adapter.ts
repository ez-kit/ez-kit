import { serializePersistAddress } from '@ez-kit/store-core'

import { fieldKey } from '../key-naming'

import type { CommitCtx, Keyed, MetaMerge, SyncSourcePort } from '../types'

/** Source id for the URL engine, shared by the adapter, the `persistUrl` decorator, and the provider. */
export const URL_SOURCE = 'url'

/** How a URL commit affects browser history. */
export enum UrlHistory {
	Push = 'push',
	Replace = 'replace',
}

/** Per-field URL metadata, packed into `FieldDescriptor.meta` by the `persistUrl` wrapper. */
export type UrlMeta = {
	/** Default history mode for commits driven by this field. */
	history?: UrlHistory
}

/**
 * The minimal capability the URL adapter needs from a router, as plain functions. A render-scoped
 * integration (next, react-router) constructs this from hooks; the engine never sees the router.
 */
export type UrlDriver = {
	/** Read the current location's search params. */
	read(): URLSearchParams
	/** Commit a fully-merged params object, choosing push vs replace navigation. */
	commit(next: URLSearchParams, history: UrlHistory): void
	/** Notify explicit external navigation (for example Back/Forward), after read reflects it.
	 * This disambiguates a POP to an old pending target from an acknowledgement of our own commit. */
	subscribe?: (onNavigate: () => void) => () => void
}

const DEFAULT_HISTORY = UrlHistory.Replace

/** History mode of a commit's meta, defaulting to replace. */
function historyOf(meta: unknown): UrlHistory {
	const value = (meta as UrlMeta | null | undefined)?.history
	return value === UrlHistory.Push ? UrlHistory.Push : DEFAULT_HISTORY
}

/**
 * Meta merge for the URL source: any `push` request in a coalesced batch makes the whole navigation
 * push, otherwise the latest history wins. This generalizes the old "first push in the batch wins".
 */
export const urlMetaMerge: MetaMerge = (prev, next) => {
	const previous = (prev as UrlMeta | null)?.history
	const incoming = (next as UrlMeta | null)?.history
	if (previous === UrlHistory.Push || incoming === UrlHistory.Push) {
		return { history: UrlHistory.Push }
	}
	return { history: incoming ?? previous ?? DEFAULT_HISTORY }
}

/** Read all current params as a {@link Keyed} (the URL key is already the descriptor's substrate key). */
function urlToKeyed(params: URLSearchParams): Keyed {
	const keyed: Keyed = new Map()
	for (const [key, value] of params) {
		keyed.set(key, value)
	}
	return keyed
}

/** Project canonical record keys to readable query keys while retaining pending navigation edits. */
export function createUrlPort(driver: UrlDriver): SyncSourcePort {
	type Navigation = { signature: string; patch: Map<string, string | null> }
	let observed: string | null = null
	const pending: Navigation[] = []
	function signature(params: URLSearchParams): string {
		const sorted = new URLSearchParams(params)
		sorted.sort()
		return sorted.toString()
	}
	function applyPatch(params: URLSearchParams, patch: ReadonlyMap<string, string | null>): void {
		for (const [key, value] of patch) {
			if (value === null) params.delete(key)
			else params.set(key, value)
		}
	}
	function read(): URLSearchParams {
		const actual = new URLSearchParams(driver.read())
		const nextObserved = signature(actual)
		if (observed !== null && nextObserved !== observed) {
			// An intermediate own acknowledgement must not erase edits submitted after it.
			let acknowledged = -1
			for (let index = pending.length - 1; index >= 0; index--) {
				if (pending[index]?.signature === nextObserved) {
					acknowledged = index
					break
				}
			}
			if (acknowledged < 0) pending.length = 0
			else pending.splice(0, acknowledged + 1)
		}
		observed = nextObserved
		for (const navigation of pending) applyPatch(actual, navigation.patch)
		return actual
	}
	return {
		capabilities: { recordVersions: false },
		keyForField: fieldKey,
		get(context) {
			const params = urlToKeyed(read())
			if (!context) return params
			const values: Keyed = new Map()
			for (const field of context.fields) {
				const value = params.get(fieldKey(field))
				if (value !== undefined)
					values.set(field.address ? serializePersistAddress(field.address) : fieldKey(field), value)
			}
			return values
		},
		set(desired: Keyed, ctx: CommitCtx): void {
			const params = read()
			const physical = new Map(
				ctx.fields.map((field) => [
					field.address ? serializePersistAddress(field.address) : fieldKey(field),
					fieldKey(field),
				]),
			)
			const patch = new Map<string, string | null>()
			for (const key of ctx.diff.set) {
				const value = desired.get(key)
				if (value !== undefined) patch.set(physical.get(key) ?? key, value)
			}
			for (const key of ctx.diff.removed) patch.set(physical.get(key) ?? key, null)
			applyPatch(params, patch)
			const navigation: Navigation = { signature: signature(params), patch }
			pending.push(navigation)
			try {
				driver.commit(params, historyOf(ctx.meta))
			} catch (error) {
				const index = pending.indexOf(navigation)
				if (index >= 0) pending.splice(index, 1)
				throw error
			}
		},
		...(driver.subscribe
			? {
					subscribe(onChange: () => void): () => void {
						return (
							driver.subscribe?.(() => {
								pending.length = 0
								observed = null
								onChange()
							}) ?? (() => undefined)
						)
					},
				}
			: {}),
	}
}
