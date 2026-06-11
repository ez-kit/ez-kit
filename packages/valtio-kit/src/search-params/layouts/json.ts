import { canonicalStringify, nestedPath, readNested, setNested } from './nested'

import type { FieldValues, SearchParamsLayout } from '../types'

/**
 * Bundles all persisted fields into one JSON-encoded key, mirroring their paths as a nested
 * object of stringified leaves (`?filters={"price":{"min":"0"}}`). Compact and collision-free
 * across multiple stores; trades single-param interop. `absolute` is ignored (the nesting is
 * the structure).
 */
export function json(key: string): SearchParamsLayout {
	return {
		ignoresAbsolute: true,

		ownedKeys: () => [key],

		read: (params, fields) => {
			const values: FieldValues = new Map()
			if (!params.has(key)) {
				return values
			}
			let parsed: unknown
			try {
				parsed = JSON.parse(params.get(key) ?? '')
			} catch {
				return values
			}
			if (parsed === null || typeof parsed !== 'object') {
				return values
			}
			for (const field of fields) {
				const raw = readNested(parsed, nestedPath(field))
				if (raw === undefined) {
					continue
				}
				try {
					values.set(field, field.parser.parse(raw))
				} catch {
					// Invalid value — leave absent so the field keeps its default.
				}
			}
			return values
		},

		write: (params, values, fields) => {
			const next = new URLSearchParams(params)
			const root: Record<string, unknown> = {}
			let any = false
			for (const field of fields) {
				if (!values.has(field)) {
					continue
				}
				const encoded = field.parser.stringify(values.get(field))
				if (encoded === null) {
					continue
				}
				setNested(root, nestedPath(field), encoded)
				any = true
			}
			if (!any) {
				next.delete(key)
			} else {
				next.set(key, canonicalStringify(root))
			}
			return next
		},
	}
}
