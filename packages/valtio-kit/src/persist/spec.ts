import type { FieldDescriptor } from './types'

/**
 * A persisted field tagged with the source it syncs to. The decorator and accessor fronts both emit
 * these; the provider groups them by `source` and creates one engine + binding per source. A single
 * proxy field may yield several specs (one per source it is annotated for).
 */
export type PersistSpec = {
	source: string
	descriptor: FieldDescriptor
}

/** Group specs by source id, preserving declaration order within each source. */
export function groupBySource(specs: PersistSpec[]): Map<string, FieldDescriptor[]> {
	const bySource = new Map<string, FieldDescriptor[]>()
	for (const { source, descriptor } of specs) {
		const existing = bySource.get(source)
		if (existing) {
			existing.push(descriptor)
		} else {
			bySource.set(source, [descriptor])
		}
	}
	return bySource
}
