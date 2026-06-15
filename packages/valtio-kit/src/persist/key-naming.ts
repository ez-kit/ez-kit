import type { FieldDescriptor } from './types'

/** Separator joining ancestor path segments into a substrate key (e.g. `filters.price.min`). */
const PATH_SEPARATOR = '.'

/**
 * Derive the logical substrate key for a field. By default the joined path is used; `key` renames
 * the leaf segment; `absolute` drops the ancestor segments (granular packing only). A `prefix`
 * (e.g. a per-store namespace) is prepended verbatim.
 *
 * This is the only place key naming lives — it replaces the former layout strategy objects, which
 * conflated key naming with substrate packing. Packing is now an adapter concern.
 */
export function fieldKey(field: FieldDescriptor, prefix = ''): string {
	const leaf = field.key ?? field.path.at(-1) ?? ''
	const base = field.absolute ? leaf : [...field.path.slice(0, -1), leaf].join(PATH_SEPARATOR)
	return `${prefix}${base}`
}
