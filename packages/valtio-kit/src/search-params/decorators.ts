import { bindSearchParams } from './bind'
import { resolveParser } from './codecs/auto'

import type { FieldDescriptor, Param, SearchParamsOptions, SearchParamsProxy } from './types'

/** Private key for the per-class field list stored inside `Symbol.metadata`. */
const FIELDS = Symbol('valtio-kit.searchParamFields')

/** Resolve the runtime metadata key the same way the decorator emit does (with polyfill fallback). */
const metadataKey: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata')

type FieldMeta = {
	name: string
	key?: string
	absolute?: boolean
	parser?: Param<unknown>
}

/** Options for the `@searchParam` field decorator. */
export type SearchParamOptions<V> = {
	/** Override the leaf segment of the URL key (relative) — defaults to the property name. */
	key?: string
	/** Pin to an exact top-level URL key, ignoring ancestor segments (flat layout only). */
	absolute?: boolean
	/** Explicit parser. Omit to auto-resolve from the field's runtime value at bind time. */
	parser?: Param<V>
}

type MetadataObject = Record<PropertyKey, unknown>

function ownFields(metadata: MetadataObject): FieldMeta[] {
	if (!Object.prototype.hasOwnProperty.call(metadata, FIELDS)) {
		Object.defineProperty(metadata, FIELDS, {
			value: [] as FieldMeta[],
			enumerable: false,
			writable: true,
			configurable: true,
		})
	}
	return metadata[FIELDS] as FieldMeta[]
}

/**
 * Stage 3 field decorator marking a class property for URL search-params sync. The property name
 * is the default URL key; the field type constrains an explicit `parser`. Records its descriptor
 * into the class's `Symbol.metadata` for `withSearchParams` to discover.
 */
export function searchParam<V>(options: SearchParamOptions<V> = {}) {
	return (_value: undefined, context: ClassFieldDecoratorContext<unknown, V>): void => {
		const meta: FieldMeta = { name: String(context.name) }
		if (options.key !== undefined) {
			meta.key = options.key
		}
		if (options.absolute !== undefined) {
			meta.absolute = options.absolute
		}
		if (options.parser !== undefined) {
			meta.parser = options.parser
		}
		ownFields(context.metadata as MetadataObject).push(meta)
	}
}

function metadataOf(value: object): MetadataObject | undefined {
	const ctor = (value as { constructor?: Record<symbol, unknown> }).constructor
	const metadata = ctor ? ctor[metadataKey] : undefined
	return metadata !== null && typeof metadata === 'object' ? (metadata as MetadataObject) : undefined
}

/** Collect decorated fields across the metadata prototype chain (child overrides parent by name). */
function collectFields(metadata: MetadataObject): FieldMeta[] {
	const all: FieldMeta[] = []
	const seen = new Set<string>()
	let current: object | null = metadata
	while (current !== null) {
		if (Object.prototype.hasOwnProperty.call(current, FIELDS)) {
			for (const meta of (current as MetadataObject)[FIELDS] as FieldMeta[]) {
				if (!seen.has(meta.name)) {
					seen.add(meta.name)
					all.push(meta)
				}
			}
		}
		current = Object.getPrototypeOf(current) as object | null
	}
	return all
}

function isRecursable(value: unknown): value is object {
	if (value === null || typeof value !== 'object') {
		return false
	}
	if (Array.isArray(value) || value instanceof Date) {
		return false
	}
	return metadataOf(value) !== undefined
}

function descriptorFor(path: string[], meta: FieldMeta, value: unknown): FieldDescriptor {
	const descriptor: FieldDescriptor = {
		path,
		parser: meta.parser ?? resolveParser(value, path.join('.')),
	}
	if (meta.key !== undefined) {
		descriptor.key = meta.key
	}
	if (meta.absolute !== undefined) {
		descriptor.absolute = meta.absolute
	}
	return descriptor
}

/** Walk the instance tree, building descriptors and recursing into composed metadata-bearing nodes. */
function walk(node: object, prefix: string[], out: FieldDescriptor[], visited: WeakSet<object>): void {
	if (visited.has(node)) {
		return
	}
	visited.add(node)

	const metadata = metadataOf(node)
	const fields = metadata ? collectFields(metadata) : []
	const handled = new Set<string>()

	for (const meta of fields) {
		handled.add(meta.name)
		const path = [...prefix, meta.name]
		const value = (node as Record<string, unknown>)[meta.name]
		if (isRecursable(value)) {
			walk(value, path, out, visited)
		} else {
			out.push(descriptorFor(path, meta, value))
		}
	}

	for (const key of Object.keys(node)) {
		if (handled.has(key)) {
			continue
		}
		const value = (node as Record<string, unknown>)[key]
		if (isRecursable(value)) {
			walk(value, [...prefix, key], out, visited)
		}
	}
}

/** Discover `@searchParam` field descriptors from an instance (auto-recursing composition). */
export function discoverDecoratedFields(store: object): FieldDescriptor[] {
	const fields: FieldDescriptor[] = []
	walk(store, [], fields, new WeakSet())
	return fields
}

/**
 * Bind search-params sync to an existing class-based proxy. Discovers `@searchParam` fields from
 * the instance (auto-recursing composition and inheritance) and returns the same proxy augmented
 * with `$searchParams`. Requires Stage 3 decorators in the consumer's toolchain.
 */
export function withSearchParams<T extends object>(store: T, options: SearchParamsOptions = {}): SearchParamsProxy<T> {
	return bindSearchParams(store, discoverDecoratedFields(store), options)
}
