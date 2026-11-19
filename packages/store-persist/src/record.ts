import type { PersistSchema } from './types'

const RECORD_KIND = 'ez-kit.persist.record'

export function validateSchema(schema: PersistSchema = {}): void {
	const version = schema.version ?? 0
	const minimum = schema.minVersion ?? 0
	if (
		!Number.isSafeInteger(version) ||
		version < 0 ||
		!Number.isSafeInteger(minimum) ||
		minimum < 0 ||
		minimum > version
	) {
		throw new Error('[ez-kit/store-persist] Invalid schema version/minVersion')
	}
}

export function encodeRecord(value: string, version = 0): string {
	return JSON.stringify({ kind: RECORD_KIND, version, value })
}

/** Imported unversioned payload is version zero; legacy ownership is never inferred here. */
export function decodeRecord(raw: string): { version: number; value: string } {
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		return { version: 0, value: raw }
	}
	if (parsed === null || typeof parsed !== 'object' || !('kind' in parsed) || parsed.kind !== RECORD_KIND)
		return { version: 0, value: raw }
	const record = parsed as { version?: unknown; value?: unknown }
	const version = record.version ?? 0
	if (
		typeof version !== 'number' ||
		!Number.isSafeInteger(version) ||
		version < 0 ||
		typeof record.value !== 'string'
	) {
		throw new Error('[ez-kit/store-persist] Invalid record envelope')
	}
	return { version, value: record.value }
}

export class FutureVersionError extends Error {
	constructor(readonly keys: readonly string[]) {
		super('[ez-kit/store-persist] Persistence blocked by future-version')
		this.name = 'FutureVersionError'
	}
}
