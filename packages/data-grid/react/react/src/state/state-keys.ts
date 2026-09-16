import type { GridFeatures } from '../types'
import type { AppliedState, TableState } from '@ez-kit/data-grid-core'

/**
 * The pending draft, addressed by the name `initialState.draft` reads it back under.
 *
 * The odd one out: every other persistable key is a `TableState` slice, while the draft is a
 * *seed-only* key — the live axes carry the pending query and `state.applied` carries the
 * emitted one, so there is no `state.draft` to copy. It is persistable anyway because the
 * alternative was a round trip that silently changed meaning: `extractState` reads the internal
 * state, where `sorting` / `columnFilters` / `globalFilter` hold what the user is still
 * composing, and feeding those back through `initialState.sorting` seeds the **applied** query
 * — a grid restored from a link came back with the draft already applied, which is the one
 * thing `draft` exists to prevent.
 */
export const DRAFT_STATE_KEY = 'draft'

/**
 * Top-level state this feature can persist. Closed set — modeled as a const tuple + derived
 * union so the same keys are referenced everywhere, never re-spelled as bare string literals.
 *
 * Re-verified against v9's slice names. The one that moved is sizing, and this list means the
 * half that did **not**: `columnSizing` (`columnSizingFeature`) is still the resolved widths map,
 * the thing a deep link restores; v8's transient drag slice `columnSizingInfo` is what became
 * `columnResizing` (`columnResizingFeature`), and it was never on this list — it is mid-drag
 * state, meaningless to persist. Every other key kept its v8 spelling.
 */
export const PERSISTABLE_STATE_KEYS = [
	'sorting',
	'columnFilters',
	'globalFilter',
	'pagination',
	'rowSelection',
	'columnVisibility',
	'columnOrder',
	'columnPinning',
	'rowPinning',
	'expanded',
	'columnSizing',
	DRAFT_STATE_KEY,
] as const satisfies readonly (keyof TableState<GridFeatures> | typeof DRAFT_STATE_KEY)[]

export type PersistableStateKey = (typeof PERSISTABLE_STATE_KEYS)[number]

/** The persistable keys that really are `TableState` slices — every one but {@link DRAFT_STATE_KEY}. */
export type PersistableSliceKey = Exclude<PersistableStateKey, typeof DRAFT_STATE_KEY>

/**
 * Opinionated default: shareable "view" state only. Excludes `rowSelection` and
 * `expanded` — both key off row ids that may not survive a data reload and are
 * usually session-ephemeral rather than shareable — and `draft`, which is a query the
 * user has not applied yet and belongs to the session, not to a shared link. Opt into
 * them via `keys`.
 */
export const DEFAULT_STATE_KEYS = [
	'sorting',
	'columnFilters',
	'globalFilter',
	'pagination',
	'columnVisibility',
	'columnOrder',
	'columnPinning',
	'rowPinning',
	'columnSizing',
] as const satisfies readonly PersistableStateKey[]

/**
 * JSON-safe subset of the grid's state produced by {@link extractState} and {@link parseState},
 * and accepted verbatim by `initialState`. `draft` carries the three deferred axes, which is
 * what `initialState.draft` takes.
 *
 * Pinned to {@link GridFeatures} rather than generic over the caller's set, and that is forced
 * rather than chosen: {@link PersistableSliceKey} is a closed list of slice names, and
 * `Pick<TableState<TFeatures>, PersistableSliceKey>` on an *unresolved* `TFeatures` fails with
 * `TS2344: Type 'string' does not satisfy the constraint 'keyof TableState<TFeatures>'` —
 * verified by probe. The widest instantiation is the one that declares all twenty slices, so it
 * is the only one this closed list can be picked from. The functions that produce and consume
 * this type ({@link extractState}, {@link useExtractedState}) stay generic over the table.
 */
export type DataGridState = Partial<Pick<TableState<GridFeatures>, PersistableSliceKey>> & {
	draft?: Partial<AppliedState>
}

export type DataGridStateOptions = {
	/** Allowlist of slices to include. Default: {@link DEFAULT_STATE_KEYS}. */
	keys?: readonly PersistableStateKey[]
}
