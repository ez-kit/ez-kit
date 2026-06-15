import type { Keyed } from '../types'

/** Default schema version when an adapter is configured without an explicit `version`. */
export const STORAGE_VERSION = 0

/** Packed storage blob: a schema version plus the keyed, already-stringified values. */
export type StorageBlob = {
	/** Schema version of the packed values. */
	v: number
	/** Logical key → stringified value. */
	s: Record<string, string>
}

/**
 * Migrate a stored {@link Keyed} produced under an older schema `fromVersion` into the current shape.
 * The routine owns all intermediate steps; a throw is treated as unrecoverable (fall back to defaults).
 */
export type Migrate = (stored: Keyed, fromVersion: number) => Keyed

/** Versioning configuration shared by every storage adapter. */
export type MigrationConfig = {
	/** Current schema version. Defaults to {@link STORAGE_VERSION} (0). */
	version?: number
	/** Routine to upgrade older stored data to the current version. */
	migrate?: Migrate
}

/** A plain `{ key: value }` record of strings — the shape of a blob's `s` field. */
function isStringRecord(value: unknown): value is Record<string, string> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Pack a {@link Keyed} into the on-disk blob shape at the given schema version. */
export function packBlob(desired: Keyed, version: number): StorageBlob {
	return { v: version, s: Object.fromEntries(desired) }
}

/**
 * Read a stored blob (already-parsed object) into its schema version and {@link Keyed}. A missing or
 * non-numeric version is treated as 0; malformed values yield an empty map. Tolerant of any input.
 */
export function readBlob(stored: unknown): { version: number; keyed: Keyed } {
	const blob = stored as { v?: unknown; s?: unknown } | null | undefined
	const version = typeof blob?.v === 'number' ? blob.v : 0
	const keyed: Keyed = new Map()
	if (isStringRecord(blob?.s)) {
		for (const [key, value] of Object.entries(blob.s)) {
			keyed.set(key, value)
		}
	}
	return { version, keyed }
}

/** The outcome of reading a stored blob through the migration pipeline. */
export type MigrationResult = {
	/** The current-shape values to hydrate. */
	keyed: Keyed
	/** Whether the store should be rewritten (a migration ran, successfully or not). */
	rewrite: boolean
}

/**
 * Resolve a stored blob to current-shape values. When the stored version is older than the current and a
 * `migrate` routine is configured, run it and flag a rewrite; a throwing migration discards the data
 * (defaults) but still flags a rewrite so the corrupt/old blob is replaced. Otherwise pass values through.
 */
export function runMigration(stored: unknown, config: MigrationConfig): MigrationResult {
	const current = config.version ?? STORAGE_VERSION
	const { version, keyed } = readBlob(stored)
	if (version >= current || !config.migrate) {
		return { keyed, rewrite: false }
	}
	try {
		return { keyed: config.migrate(keyed, version), rewrite: true }
	} catch {
		// Unrecoverable migration → discard stored data; fields hydrate to their defaults.
		return { keyed: new Map(), rewrite: true }
	}
}
