import { persistField, type PersistFieldOptions } from '../decorators'

import { URL_SOURCE, type UrlHistory, type UrlMeta } from './adapter'

import type { AccessorFieldOptions } from '../accessor'
import type { Parser } from '../types'

/** Options for the `persistUrl` field decorator. `prefix`/`history` are packed into the URL `meta`. */
export type PersistUrlOptions<V> = {
	/** Override the leaf segment of the URL key (relative) — defaults to the property name. */
	key?: string
	/** Pin to an exact top-level URL key, ignoring ancestor segments. */
	absolute?: boolean
	/** Explicit parser. Omit to auto-resolve from the field's runtime value. */
	parser?: Parser<V>
	/** Key prefix prepended to this field's URL key. */
	prefix?: string
	/** Default history mode for commits driven by this field. */
	history?: UrlHistory
}

function urlMeta(options: { history?: UrlHistory }): UrlMeta {
	const meta: UrlMeta = {}
	if (options.history !== undefined) {
		meta.history = options.history
	}
	return meta
}

/**
 * URL field decorator — a thin wrapper over {@link persistField} that targets the URL source. `key`,
 * `absolute`, and `prefix` are source-agnostic key naming (on the descriptor); only `history` is URL
 * `meta` for the adapter to read.
 */
export function persistUrl<V>(options: PersistUrlOptions<V> = {}) {
	const fieldOptions: PersistFieldOptions<V, UrlMeta> = { source: URL_SOURCE, meta: urlMeta(options) }
	if (options.key !== undefined) {
		fieldOptions.key = options.key
	}
	if (options.absolute !== undefined) {
		fieldOptions.absolute = options.absolute
	}
	if (options.prefix !== undefined) {
		fieldOptions.prefix = options.prefix
	}
	if (options.parser !== undefined) {
		fieldOptions.parser = options.parser
	}
	return persistField<V, UrlMeta>(fieldOptions)
}

/** Accessor-front options for a URL field (parity with `persistUrl` for non-decorator toolchains). */
export type UrlFieldOptions<V> = Omit<PersistUrlOptions<V>, never>

/** Build accessor options for a URL field — for use with the `field(select, …)` builder. */
export function urlField<V>(options: UrlFieldOptions<V> = {}): AccessorFieldOptions<V, UrlMeta> {
	const accessor: AccessorFieldOptions<V, UrlMeta> = { source: URL_SOURCE, meta: urlMeta(options) }
	if (options.key !== undefined) {
		accessor.key = options.key
	}
	if (options.absolute !== undefined) {
		accessor.absolute = options.absolute
	}
	if (options.prefix !== undefined) {
		accessor.prefix = options.prefix
	}
	if (options.parser !== undefined) {
		accessor.parser = options.parser
	}
	return accessor
}
