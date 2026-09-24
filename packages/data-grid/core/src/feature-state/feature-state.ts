/**
 * Table state access **from inside a `TableFeature` hook** — and only from there.
 *
 * Inside a feature the table's `TFeatures` is unresolved, so `Atoms<TFeatures>` and
 * `BaseAtoms<TFeatures>` have no provable key: `table.atoms.sorting.get()` fails with `TS2339`,
 * and so does `table.baseAtoms.sorting.set(…)`. Upstream's own custom-feature skill solves that
 * with an inline cast per feature (`skills/custom-features/SKILL.md`, `readDensity`). This module
 * is that cast, hoisted — written **once**, here, so no feature writes one.
 *
 * Outside a feature — a consumer, a test, the React adapter — `TFeatures` *is* resolved, so
 * `table.atoms.sorting.get()` compiles and is the right thing to write. Do not reach for these
 * four there.
 *
 * ## Own slices and foreign slices
 *
 * Which function to call is the ownership statement, and the two pairs differ in more than name:
 *
 * - **Own** — a slice this feature declares in its own `getInitialState`. It is guaranteed to
 *   exist, so the reader's return type is not optional and the writer does not check presence:
 *   a missing own slice is a seeding bug and must throw where the author can see it.
 * - **Foreign** — a slice another feature declares. That feature is legitimately optional, so
 *   the reader returns `undefined` and the writer no-ops.
 *
 * Both writers route through upstream's `makeStateUpdater`, which resolves the **owning** atom
 * (`options.atoms?.[key] ?? baseAtoms[key]`). Writing `baseAtoms[key]` by hand goes nowhere when
 * the consumer supplied their own atom for that slice — silently.
 *
 * Note what the split is *not*: ownership is a fact about the calling feature, not about the key,
 * so nothing in these signatures stops `writeOwnSlice(table, 'rowSelection', …)` inside a feature
 * that does not declare `rowSelection`. What the split buys is a different failure for the same
 * mistake — a throw instead of a silent no-op, or the reverse — and a name at the call site a
 * reviewer can check against the feature's own `getInitialState` without reading further.
 *
 * ## Naming a custom slice
 *
 * `SliceKey` is `keyof TableState_All`. Upstream's skill augments only `TableState_FeatureMap`,
 * which feeds `TableState<TFeatures>` and **not** `TableState_All` — so a ported feature must
 * augment `TableState_All` too, or it cannot name its own slice here at all. The last case in
 * `feature-state.test.ts` is the worked example.
 *
 * ## Where a write goes
 *
 * Both writers prefer `table.options.on<Slice>Change` and fall back to `makeStateUpdater` only
 * when the table carries no such option — which is what a stock `table.set<Slice>()` does, and
 * what `makeStateUpdater` is the default *for*. That option is where `createTableOptions`'
 * `bindStateHandlers` hangs the consumer's per-slice callback (`selection.onChange`,
 * `sorting.onChange`, …) and the column invariants it enforces on every `columnPinning` and
 * `columnVisibility` write. Writing the atom directly would move the state and fire neither.
 */

import { makeStateUpdater } from '@tanstack/table-core'

import type { TableState_All, Updater } from '@tanstack/table-core'

/**
 * Any table, seen from inside a feature hook — exactly the structural shape `makeStateUpdater`
 * declares for its `instance`, so the parameter never depends on `DataTable` or on `TFeatures`.
 */
export type AnyTable = {
	readonly options: { readonly atoms?: object | undefined }
	readonly baseAtoms: object
}

/** A state slice name. */
export type SliceKey = keyof TableState_All

/** The value type of a slice, with the `Partial` that `TableState_All` applies stripped back off. */
export type SliceOf<K extends SliceKey> = Exclude<TableState_All[K], undefined>

/**
 * The one cast in this package, and the reason the module exists.
 *
 * The atom bags are keyed by the registered feature set, which is unresolved here; this restates
 * them as the string-keyed records they are at runtime. Every key is optional because a slice
 * exists only when the feature that declares it is registered.
 */
type AtomBag = {
	atoms: Record<string, { get: () => unknown } | undefined>
	baseAtoms: Record<string, { set: (updater: unknown) => void } | undefined>
	options: Record<string, unknown>
}

const bag = (table: AnyTable): AtomBag => table as unknown as AtomBag

/**
 * The one diagnostic for an absent own slice, so both halves of the own pair report identically.
 *
 * Without it the two halves fail at different qualities: `readOwnSlice` raised this sentence while
 * `writeOwnSlice` let `makeStateUpdater`'s `TypeError: Cannot read properties of undefined (reading
 * 'set')` escape from `dist/utils.js` — no slice, no package, and a stack pointing into
 * `node_modules` rather than at the feature that forgot to seed.
 */
const missingSliceMessage = (key: SliceKey): string =>
	`[data-grid] state slice "${key}" is missing — its feature did not seed getInitialState.`

/**
 * The table option that owns writes to a slice.
 *
 * v9 names it `on<Slice>Change` for every slice without exception — verified against all fourteen
 * stock features' `getDefaultTableOptions`, and asserted in `feature-state.test.ts` rather than
 * assumed. Derived rather than looked up because a custom feature's slice has to resolve too, and
 * a fourteen-entry map cannot know about one.
 */
const changeOptionFor = (key: SliceKey): string => `on${key.charAt(0).toUpperCase()}${key.slice(1)}Change`

/**
 * The writer for one slice, with the slice's own type put back on the updater.
 *
 * **Routed through `options.on<Slice>Change` when there is one**, exactly as a stock
 * `table.set<Slice>()` does, and falling back to `makeStateUpdater` when there is not. That option
 * is where `createTableOptions`' `bindStateHandlers` hangs the consumer's per-slice callback and
 * the `columnPinning` / `columnVisibility` invariant enforcement, so writing the atom directly
 * would move the state while firing neither — silently. `makeStateUpdater` is the stock default
 * for the same option, so the fallback is the same write, not a lesser one.
 *
 * No recursion: the handler writes the slice itself through `makeStateUpdater` and then notifies;
 * it does not come back through here.
 *
 * On the assertion — upstream types the updater as
 * `Updater<TableState<any>[K & keyof TableState<any>]>`. For a stock slice that resolves to
 * `Updater<any>` and would accept ours unchanged; for a slice a *custom* feature adds to
 * `TableState_All`, `K & keyof TableState<any>` drops the key and the parameter narrows to the
 * stock slices' union, which `Updater<SliceOf<K>>` is not assignable to. Asserting the returned
 * *function* rather than the argument covers both, and restores the caller's type instead of
 * erasing it with `as never` at the one point this module exists to preserve it.
 */
const sliceWriter = <K extends SliceKey>(table: AnyTable, key: K): ((updater: Updater<SliceOf<K>>) => void) => {
	const handler = bag(table).options[changeOptionFor(key)]
	if (typeof handler === 'function') return handler as (updater: Updater<SliceOf<K>>) => void
	return makeStateUpdater(key, table) as (updater: Updater<SliceOf<K>>) => void
}

/**
 * Read a slice **this feature declares**. The feature's own `getInitialState` seeded it, so the
 * atom is guaranteed to exist and the return type is not optional.
 *
 * @throws If the slice is absent — which means the feature failed to seed it.
 */
export function readOwnSlice<K extends SliceKey>(table: AnyTable, key: K): SliceOf<K> {
	const atom = bag(table).atoms[key]
	if (atom === undefined) throw new Error(missingSliceMessage(key))
	return atom.get() as SliceOf<K>
}

/**
 * Read a slice **another feature declares**. It may not be registered on this table, so the
 * caller must handle `undefined` — `readForeignSlice(table, 'rowSelection') ?? {}`.
 */
export function readForeignSlice<K extends SliceKey>(table: AnyTable, key: K): SliceOf<K> | undefined {
	return bag(table).atoms[key]?.get() as SliceOf<K> | undefined
}

/**
 * Write a slice **this feature declares**.
 *
 * @throws If the slice is absent — which means the feature failed to seed it. This is the same
 * condition and the same sentence {@link readOwnSlice} throws on, and it is checked here rather
 * than left to `makeStateUpdater`, whose own failure for it names neither the slice nor this
 * package. Note this guard is **not** {@link writeForeignSlice}'s inverted: it throws where that
 * one returns, which is exactly the own/foreign asymmetry.
 */
export function writeOwnSlice<K extends SliceKey>(table: AnyTable, key: K, updater: Updater<SliceOf<K>>): void {
	if (bag(table).baseAtoms[key] === undefined) throw new Error(missingSliceMessage(key))
	sliceWriter(table, key)(updater)
}

/**
 * Write a slice **another feature declares**, or do nothing when that feature is not registered.
 *
 * Identical to {@link writeOwnSlice} once the slice is known to exist — the owning feature's
 * handler should see a foreign write for the same reason it sees its own — but guarded first.
 * The two concerns do not interact: presence is decided before a writer is chosen, and an
 * unregistered slice has neither a base atom nor an `on<Slice>Change` to route to, so the guard
 * is the only thing standing between a foreign write and `makeStateUpdater`'s unguarded
 * `options.atoms?.[key] ?? baseAtoms[key]` throw. A foreign feature is legitimately optional, so
 * that has to be a no-op instead.
 */
export function writeForeignSlice<K extends SliceKey>(table: AnyTable, key: K, updater: Updater<SliceOf<K>>): void {
	// `baseAtoms`, not `atoms`: it is what `makeStateUpdater` falls back to, and it is seeded for
	// exactly the slices whose feature is registered.
	if (bag(table).baseAtoms[key] === undefined) return
	sliceWriter(table, key)(updater)
}
