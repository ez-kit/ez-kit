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

/**
 * Build a {@link SourcePort} over a {@link UrlDriver}. Stateless: because key naming (incl. `prefix`)
 * lives on the descriptor, the engine's {@link Keyed} keys already equal the URL substrate keys, so
 * the port maps verbatim — `get()` reads every param, `set()` merges the desired keys and deletes the
 * removed ones, preserving foreign params. The engine ignores keys that match no connected field.
 */
export function createUrlPort(driver: UrlDriver): SyncSourcePort {
	return {
		get: () => urlToKeyed(driver.read()),

		set(desired: Keyed, ctx: CommitCtx): void {
			const params = new URLSearchParams(driver.read())
			for (const [key, value] of desired) {
				params.set(key, value)
			}
			for (const key of ctx.diff.removed) {
				params.delete(key)
			}
			driver.commit(params, historyOf(ctx.meta))
		},
	}
}
