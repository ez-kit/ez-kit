import qsLib from 'qs'

import type { PersistedValues, SearchParamsLayout } from '../types'

export type QsLayoutOptions = {
	/** Wrap all fields under one namespaced key (`?f[q]=a&f[sort]=desc`). */
	namespace?: string
}

const stringifyOptions: qsLib.IStringifyOptions = {
	encode: true,
	sort: (a, b) => a.localeCompare(b),
}

/**
 * `qs`-based layout: encodes fields with bracket notation, supporting arrays and nesting
 * (`?tags[]=a&tags[]=b`). Opt-in (depends on `qs`). Foreign keys are preserved by round-tripping
 * the whole query through `qs`.
 */
export function qs(options: QsLayoutOptions = {}): SearchParamsLayout {
	const namespace = options.namespace

	return {
		ownedKeys: (fieldNames) => (namespace ? [namespace] : fieldNames),

		read: (params, fields) => {
			const parsed = qsLib.parse(params.toString()) as Record<string, unknown>
			const source = namespace ? parsed[namespace] : parsed
			const values: PersistedValues = {}
			if (!source || typeof source !== 'object') {
				return values
			}
			const record = source as Record<string, unknown>
			for (const name of Object.keys(fields)) {
				if (!(name in record)) {
					continue
				}
				const raw = record[name]
				const codec = fields[name]
				if (codec && typeof raw === 'string') {
					try {
						values[name] = codec.deserialize(raw)
					} catch {
						// Invalid value — keep the field default.
					}
				} else {
					values[name] = raw
				}
			}
			return values
		},

		write: (params, values, fields) => {
			const parsed = qsLib.parse(params.toString()) as Record<string, unknown>
			const encoded: Record<string, unknown> = {}
			for (const name of Object.keys(values)) {
				const codec = fields[name]
				const value = values[name]
				if (codec && (typeof value !== 'object' || value === null)) {
					const serialized = codec.serialize(value)
					if (serialized !== null) {
						encoded[name] = serialized
					}
				} else {
					encoded[name] = value
				}
			}

			if (namespace) {
				parsed[namespace] = Object.keys(encoded).length === 0 ? undefined : encoded
			} else {
				for (const name of Object.keys(fields)) {
					parsed[name] = undefined
				}
				Object.assign(parsed, encoded)
			}

			return new URLSearchParams(qsLib.stringify(parsed, stringifyOptions))
		},
	}
}
