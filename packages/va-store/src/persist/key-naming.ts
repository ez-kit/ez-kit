import type { FieldDescriptor } from './types'

/** Separator joining ancestor path segments into a substrate key (e.g. `filters.price.min`). */
const PATH_SEPARATOR = '.'

/**
 * Derive the substrate key for a field. By default the joined path is used; `key` renames the leaf
 * segment; `absolute` drops the ancestor segments (granular packing only); `prefix` (e.g. a per-store
 * namespace) is prepended verbatim. Key naming is source-agnostic and lives entirely on the descriptor
 * — it replaces the former layout strategy objects, which conflated key naming with substrate packing.
 */
export function fieldKey(field: FieldDescriptor): string {
	const leaf = field.key ?? field.path.at(-1) ?? ''
	const base = field.absolute ? leaf : [...field.path.slice(0, -1), leaf].join(PATH_SEPARATOR)
	return `${field.prefix ?? ''}${base}`
}
