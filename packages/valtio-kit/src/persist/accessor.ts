import { resolveParser } from './codecs/auto'
import { readPath } from './path'

import type { PersistSpec } from './spec'
import type { FieldDescriptor, Parser } from './types'

/** Per-field options for the accessor front — mirrors the base decorator's options. */
export type AccessorFieldOptions<V, M = unknown> = {
	/** Which source engine this field syncs to (e.g. `'url'`, `'localStorage'`). */
	source: string
	/** Override the leaf segment of the substrate key (relative) — defaults to the last path segment. */
	key?: string
	/** Pin to an exact top-level key, ignoring ancestor segments (granular packing only). */
	absolute?: boolean
	/** Prefix prepended to the substrate key (e.g. a per-store namespace). */
	prefix?: string
	/** Explicit parser. Omit to auto-resolve from the field's runtime value at bind time. */
	parser?: Parser<V>
	/** Opaque per-field metadata forwarded to the adapter. */
	meta?: M
}

/** A field declaration produced by the builder: a path plus its options. */
export type FieldSpec = {
	path: string[]
	options: AccessorFieldOptions<unknown>
}

/** Declares a persisted field from a property-access selector; the parser type follows the leaf. */
export type FieldBuilder<T> = <S>(select: (state: T) => S, options: AccessorFieldOptions<S>) => FieldSpec

/** Builds the field list for a store, given a type-aware `field` declarer. */
export type FieldsBuilder<T> = (field: FieldBuilder<T>) => FieldSpec[]

/** Record property access on a selector to extract its path (`s => s.a.b` → `['a','b']`). */
function extractPath(select: (state: never) => unknown): string[] {
	const path: string[] = []
	const handler: ProxyHandler<() => void> = {
		get: (_target, property) => {
			if (typeof property === 'string') {
				path.push(property)
			}
			return new Proxy((): void => {}, handler)
		},
	}
	select(new Proxy((): void => {}, handler) as never)
	return path
}

const buildField: FieldBuilder<unknown> = (select, options) => ({
	path: extractPath(select),
	options: options,
})

function toSpec(store: object, spec: FieldSpec): PersistSpec {
	const { options } = spec
	const descriptor: FieldDescriptor = {
		path: spec.path,
		parser: options.parser ?? resolveParser(readPath(store, spec.path), spec.path.join('.')),
	}
	if (options.key !== undefined) {
		descriptor.key = options.key
	}
	if (options.absolute !== undefined) {
		descriptor.absolute = options.absolute
	}
	if (options.prefix !== undefined) {
		descriptor.prefix = options.prefix
	}
	if (options.meta !== undefined) {
		descriptor.meta = options.meta
	}
	return { source: options.source, descriptor }
}

/** Resolve a fields builder into specs against a store (auto-resolving missing parsers). */
export function resolveFieldSpecs<T extends object>(store: T, build: FieldsBuilder<T>): PersistSpec[] {
	return build(buildField as FieldBuilder<T>).map((spec) => toSpec(store, spec))
}
