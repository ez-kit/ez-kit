import { bindSearchParams } from './bind'
import { resolveParser } from './codecs/auto'
import { readPath } from './engine/path'

import type { AnyParam, FieldDescriptor, Param, SearchParamsOptions, SearchParamsProxy } from './types'

/** Per-field placement options for the accessor front. */
export type FieldOptions = {
	/** Override the leaf segment of the URL key (relative) — defaults to the last path segment. */
	key?: string
	/** Pin to an exact top-level URL key, ignoring ancestor segments (flat layout only). */
	absolute?: boolean
}

/** A field declaration produced by the builder: a path plus an optional parser and placement. */
export type FieldSpec = {
	path: string[]
	parser?: AnyParam
	options?: FieldOptions
}

/** Declares a persisted field from a property-access selector; the parser type follows the leaf. */
export type FieldBuilder<T> = <S>(select: (state: T) => S, parser?: Param<S>, options?: FieldOptions) => FieldSpec

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

const buildField: FieldBuilder<unknown> = (select, parser, options) => {
	const spec: FieldSpec = { path: extractPath(select) }
	if (parser !== undefined) {
		spec.parser = parser
	}
	if (options !== undefined) {
		spec.options = options
	}
	return spec
}

function toDescriptor(store: object, spec: FieldSpec): FieldDescriptor {
	const descriptor: FieldDescriptor = {
		path: spec.path,
		parser: spec.parser ?? resolveParser(readPath(store, spec.path), spec.path.join('.')),
	}
	if (spec.options?.key !== undefined) {
		descriptor.key = spec.options.key
	}
	if (spec.options?.absolute !== undefined) {
		descriptor.absolute = spec.options.absolute
	}
	return descriptor
}

/** Resolve a fields builder into descriptors against a store (auto-resolving missing parsers). */
export function resolveFieldSpecs<T extends object>(store: T, build: FieldsBuilder<T>): FieldDescriptor[] {
	return build(buildField as FieldBuilder<T>).map((spec) => toDescriptor(store, spec))
}

/**
 * Bind search-params sync to an existing plain proxy using accessor field declarations. The builder
 * receives a type-aware `field(s => s.a.b, parser?, opts?)`. Returns the same proxy augmented with
 * `$searchParams`. No decorator transpilation required.
 */
export function withSearchParamsFields<T extends object>(
	store: T,
	fields: FieldsBuilder<T>,
	options: SearchParamsOptions = {},
): SearchParamsProxy<T> {
	return bindSearchParams(store, resolveFieldSpecs(store, fields), options)
}
