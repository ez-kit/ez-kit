import { resolveParser } from './codecs/auto'

import type { PersistSpec } from './spec'
import type { FieldDescriptor, Parser } from './types'

/** Private key for the per-class field list stored inside `Symbol.metadata`. */
const FIELDS = Symbol('valtio-kit.persistFields')

/** Resolve the runtime metadata key the same way the decorator emit does (with polyfill fallback). */
const metadataKey: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata')

type FieldMeta = {
	name: string
	source: string
	key?: string
	absolute?: boolean
	parser?: Parser<unknown>
	meta?: unknown
}

/** Options for the base `persistField` decorator. Source-specific wrappers pack their args into `meta`. */
export type PersistFieldOptions<V, M = unknown> = {
	/** Which source engine this field syncs to (e.g. `'url'`, `'localStorage'`). */
	source: string
	/** Override the leaf segment of the substrate key (relative) — defaults to the property name. */
	key?: string
	/** Pin to an exact top-level key, ignoring ancestor segments (granular packing only). */
	absolute?: boolean
	/** Explicit parser. Omit to auto-resolve from the field's runtime value at bind time. */
	parser?: Parser<V>
	/** Opaque per-field metadata forwarded to the adapter (e.g. `{ prefix, history }` for URL). */
	meta?: M
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
 * Base Stage 3 field decorator marking a class property for persistence to one `source`. The property
 * name is the default key; the field type constrains an explicit `parser`. Records its descriptor into
 * the class's `Symbol.metadata` for discovery. A property may carry several `persistField` annotations
 * (one per source). Source-specific wrappers (e.g. `persistUrl`) build on this.
 */
export function persistField<V, M = unknown>(options: PersistFieldOptions<V, M>) {
	return (_value: undefined, context: ClassFieldDecoratorContext<unknown, V>): void => {
		const meta: FieldMeta = { name: String(context.name), source: options.source }
		if (options.key !== undefined) {
			meta.key = options.key
		}
		if (options.absolute !== undefined) {
			meta.absolute = options.absolute
		}
		if (options.parser !== undefined) {
			meta.parser = options.parser
		}
		if (options.meta !== undefined) {
			meta.meta = options.meta
		}
		ownFields(context.metadata as MetadataObject).push(meta)
	}
}

function metadataOf(value: object): MetadataObject | undefined {
	const ctor = (value as { constructor?: Record<symbol, unknown> }).constructor
	const metadata = ctor ? ctor[metadataKey] : undefined
	return metadata !== null && typeof metadata === 'object' ? (metadata as MetadataObject) : undefined
}

/** Collect decorated fields across the metadata prototype chain (child overrides parent per name+source). */
function collectFields(metadata: MetadataObject): FieldMeta[] {
	const all: FieldMeta[] = []
	const seen = new Set<string>()
	let current: object | null = metadata
	while (current !== null) {
		if (Object.prototype.hasOwnProperty.call(current, FIELDS)) {
			for (const meta of (current as MetadataObject)[FIELDS] as FieldMeta[]) {
				const identity = `${meta.name}::${meta.source}`
				if (!seen.has(identity)) {
					seen.add(identity)
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

function specFor(path: string[], meta: FieldMeta, value: unknown): PersistSpec {
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
	if (meta.meta !== undefined) {
		descriptor.meta = meta.meta
	}
	return { source: meta.source, descriptor }
}

/** Walk the instance tree, building specs and recursing into composed metadata-bearing nodes. */
function walk(node: object, prefix: string[], out: PersistSpec[], visited: WeakSet<object>): void {
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
			out.push(specFor(path, meta, value))
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

/** Discover `persistField` specs from an instance (auto-recursing composition and inheritance). */
export function discoverPersistFields(store: object): PersistSpec[] {
	const specs: PersistSpec[] = []
	walk(store, [], specs, new WeakSet())
	return specs
}
