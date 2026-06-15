import { fieldKey } from '../key-naming'

import type { CommitCtx, FieldDescriptor, Keyed, MetaMerge, SyncSourcePort } from '../types'

/** How a URL commit affects browser history. */
export enum UrlHistory {
	Push = 'push',
	Replace = 'replace',
}

/** Per-field URL metadata, packed into `FieldDescriptor.meta` by the `persistUrl` wrapper. */
export type UrlMeta = {
	/** Default history mode for commits driven by this field. */
	history?: UrlHistory
	/** Key prefix prepended to this field's substrate key (e.g. a per-store namespace). */
	prefix?: string
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

function metaOf(field: FieldDescriptor): UrlMeta | undefined {
	return field.meta as UrlMeta | undefined
}

/** The URL substrate key for a field: its logical key with the field's `meta.prefix` prepended. */
function urlKey(field: FieldDescriptor): string {
	return fieldKey(field, metaOf(field)?.prefix ?? '')
}

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

/** Index a commit's descriptors by their logical key so a `Keyed` entry resolves back to its field. */
function indexByLogicalKey(fields: FieldDescriptor[]): Map<string, FieldDescriptor> {
	const byKey = new Map<string, FieldDescriptor>()
	for (const field of fields) {
		byKey.set(fieldKey(field), field)
	}
	return byKey
}

/**
 * Build a {@link SourcePort} over a {@link UrlDriver} for a (dynamic) set of fields. Render-scoped:
 * the provider constructs this from the router's read/commit and supplies `fields` as a thunk over
 * every connected binding, so `get()` can read all owned params. The port maps the URL's prefixed
 * substrate keys to/from the engine's logical keys, preserves foreign params, and deletes owned keys
 * that were removed (returned to default).
 */
export function createUrlPort(driver: UrlDriver, fields: () => FieldDescriptor[]): SyncSourcePort {
	return {
		get(): Keyed {
			const params = driver.read()
			const keyed: Keyed = new Map()
			for (const field of fields()) {
				const substrateKey = urlKey(field)
				if (params.has(substrateKey)) {
					keyed.set(fieldKey(field), params.get(substrateKey) ?? '')
				}
			}
			return keyed
		},

		set(desired: Keyed, ctx: CommitCtx): void {
			const params = new URLSearchParams(driver.read())
			const byLogicalKey = indexByLogicalKey(ctx.fields)
			const substrateKeyFor = (logicalKey: string): string => {
				const field = byLogicalKey.get(logicalKey)
				return field ? urlKey(field) : logicalKey
			}
			for (const [logicalKey, value] of desired) {
				params.set(substrateKeyFor(logicalKey), value)
			}
			for (const logicalKey of ctx.diff.removed) {
				params.delete(substrateKeyFor(logicalKey))
			}
			driver.commit(params, historyOf(ctx.meta))
		},
	}
}
