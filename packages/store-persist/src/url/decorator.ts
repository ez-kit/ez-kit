import { persistField, type PersistFieldDecorator } from '../decorators'

import { URL_SOURCE, type UrlHistory, type UrlMeta } from './adapter'

import type {
	AccessorFieldOptions,
	FieldValueOptions,
	ValidatedAccessorFieldOptions,
	ValidatedValueOptions,
} from '../accessor'

/** URL projection options. Source defaults to `url`; aliases select a mapped registration. */
type UrlOptions = {
	source?: string
	key?: string
	absolute?: boolean
	prefix?: string
	history?: UrlHistory
}
export type PersistUrlOptions<V> = UrlOptions & FieldValueOptions<V>
export type UrlFieldOptions<V> = PersistUrlOptions<V>

function urlMeta(options: UrlOptions): UrlMeta {
	return options.history === undefined ? {} : { history: options.history }
}

function urlAccessor<V>(options: PersistUrlOptions<V>): AccessorFieldOptions<V, UrlMeta> {
	const { history: _history, ...values } = options
	return { ...values, source: options.source ?? URL_SOURCE, meta: urlMeta(options) }
}

/** URL field decorator, optionally selecting an adapter alias instead of `url`. */
export function persistUrl<V>(options: UrlOptions & ValidatedValueOptions<V>): PersistFieldDecorator<V>
export function persistUrl<V>(options?: PersistUrlOptions<V>): PersistFieldDecorator<V>
export function persistUrl<V>(options: PersistUrlOptions<V> = {}): PersistFieldDecorator<V> {
	return persistField<V, UrlMeta>(urlAccessor<V>(options))
}

/** Preserve the validator output when an unknown decoder is supplied. */
export function urlField<V>(options: UrlOptions & ValidatedValueOptions<V>): ValidatedAccessorFieldOptions<V, UrlMeta>
export function urlField<V = never>(options?: UrlFieldOptions<V>): AccessorFieldOptions<V, UrlMeta>
export function urlField<V>(options: UrlFieldOptions<V> = {}): AccessorFieldOptions<V, UrlMeta> {
	return urlAccessor<V>(options)
}
