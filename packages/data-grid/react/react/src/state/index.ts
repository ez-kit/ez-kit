'use client'

/**
 * State persistence — the Layer 1 utilities and the Layer 2 reactive hook.
 *
 * Its own build entry (`@ez-kit/data-grid-react/state`), not only a folder: reaching these four
 * through the root entry costs the whole package. The root is one pre-bundled file, and a
 * bundler does not shake an export out of it — importing `extractState` from `.` measured the
 * same as importing `DataGrid`. A separate entry is what makes the difference, so this barrel
 * exists to be one.
 *
 * Everything here stays exported from the root as well, so the subpath is an option rather than
 * a migration.
 */

export { extractState } from './extract-state'
export { parseState } from './parse-state'
export { useExtractedState } from './use-extracted-state'
export { DEFAULT_STATE_KEYS, PERSISTABLE_STATE_KEYS } from './state-keys'
export type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
