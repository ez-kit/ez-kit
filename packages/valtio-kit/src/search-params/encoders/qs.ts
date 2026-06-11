import qsLib from 'qs'

import { deleteNested, nestedPath, readNested, setNested } from '../layouts/nested'

import type { FieldValues, SearchParamsLayout } from '../types'

export type QsLayoutOptions = {
	/** Wrap all fields under one namespaced key (`?f[filters][q]=a`). */
	namespace?: string
}

const stringifyOptions: qsLib.IStringifyOptions = {
	encode: true,
	sort: (a, b) => a.localeCompare(b),
}

type Nested = Record<string, unknown>

/**
 * `qs`-based layout: encodes fields with bracket notation derived from their paths
 * (`?filters[price][min]=0`). Opt-in (depends on `qs`). Foreign keys are preserved by
 * round-tripping the whole query through `qs`. `absolute` is ignored (the nesting is the structure).
 */
export function qs(options: QsLayoutOptions = {}): SearchParamsLayout {
	const namespace = options.namespace

	return {
		ignoresAbsolute: true,

		ownedKeys: (fields) =>
			namespace ? [namespace] : [...new Set(fields.map((field) => nestedPath(field)[0] ?? ''))],

		read: (params, fields) => {
			const parsed = qsLib.parse(params.toString()) as Nested
			const source = namespace ? parsed[namespace] : parsed
			const values: FieldValues = new Map()
			if (source === null || typeof source !== 'object') {
				return values
			}
			for (const field of fields) {
				const raw = readNested(source, nestedPath(field))
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
			const parsed = qsLib.parse(params.toString()) as Nested
			const container: Nested = namespace
				? ((parsed[namespace] as Nested | undefined) ?? {})
				: parsed

			for (const field of fields) {
				deleteNested(container, nestedPath(field))
			}
			for (const field of fields) {
				if (!values.has(field)) {
					continue
				}
				const encoded = field.parser.stringify(values.get(field))
				if (encoded !== null) {
					setNested(container, nestedPath(field), encoded)
				}
			}

			if (namespace) {
				parsed[namespace] = Object.keys(container).length === 0 ? undefined : container
			}

			return new URLSearchParams(qsLib.stringify(parsed, stringifyOptions))
		},
	}
}
