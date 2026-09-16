import { constructTable } from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import { createAppliedEmitter, createDraftAtoms } from '../features/deferred-apply'
import { isFeatureEnabled } from '../utils/feature-flag'

import { createTableOptions } from './create-table-options'

import type { DataTable, TableConfig } from '../types'
import type { ExternalAtoms, TableFeatures, TableOptions } from '@tanstack/table-core'

/**
 * Creates a headless data-grid table instance on TanStack Table v9.
 *
 * The returned object is a real v9 `Table` — state lives in its atoms, `table.store` is the
 * whole-state observable and `table.atoms.<slice>.get()` a single slice — plus the two things
 * that are ours: `setData` and `grid`.
 *
 * @example
 * const table = createTable({ data: users, columns, sorting: true })
 */
export function createTable<TFeatures extends TableFeatures, TRow extends object>(
	config: TableConfig<TFeatures, TRow>,
): DataTable<TFeatures, TRow> {
	// The three deferred axes' atoms, created **once per table instance** and handed to v9 as
	// externally-owned state. An external atom beats `options.state` by upstream's own precedence
	// rule, which is what stops a controlled-mode consumer mirroring back the last applied query
	// from discarding what the user is composing.
	//
	// Both halves of the condition matter: the feature must be registered (without it there is no
	// `applied` slice, no `table.draft`, and the atoms would be three objects nobody reads), and
	// deferral must be on (`draft: { enabled: false }` from a defaults layer is off). This is the
	// one place `create-table.ts` imports from a feature module — the deliberate exception
	// recorded in Task 3 Step 2.
	//
	// It imports **two** names from that module, `createDraftAtoms` and `createAppliedEmitter`,
	// and that was queried as undercutting the reachability argument the `/features` entry point
	// rests on. It does not: reachability is per **module**, and both names live in
	// `features/deferred-apply`, so the second one adds nothing the first had not already pulled.
	// Measured rather than argued — bundling `dist/index.js` and grepping the result, the only
	// surviving mentions of `draftFeature`, `editingFeature` and `creatingFeature` are the string
	// literals in `REQUIRED_FEATURE` and the `'draftFeature' in registeredFeatures` test above;
	// not one feature *object* survives, and `constructTableAPIs` appears nowhere. `sideEffects:
	// false` plus ESM is what lets a consumer's bundler drop them.
	//
	// Note this package's own `dist` is a weaker signal than that, and deliberately not the one
	// relied on: tsup emits one shared chunk for both entry points, so `creating.ts`,
	// `editing.ts` and `deferred-apply.ts` all appear in the chunk `dist/index.js` imports —
	// the first two only because `index.ts` re-exports `CreatingMode` / `EditingMode`, which are
	// values that happen to live beside a feature. What a consumer ships is the question, and the
	// answer above is measured against that.
	//
	// `features` is widened before the `in`, for the reason `createTableOptions`' own
	// `registeredFeatures` spells out: the operator throws a `TypeError` on a non-object
	// right-hand side, and a config that reached here past the type system — through a cast, or
	// parsed from JSON — is exactly the one that arrives with no `features` at all. Crashing the
	// construction would mask whatever the caller was actually doing wrong.
	const registeredFeatures = (config.features as Record<string, unknown> | undefined) ?? {}
	const draftAtoms =
		'draftFeature' in registeredFeatures && isFeatureEnabled(config.draft)
			? createDraftAtoms(config.initialState)
			: undefined

	const { options, grid, bindStateHandlers } = createTableOptions(
		config,
		// The cast is the generic boundary, not a widening: `ExternalAtoms<TFeatures>` is keyed by
		// a feature set that is unresolved here, so no concrete atom set is provably assignable to
		// it. The three keys are real `TableState` slices and the atoms are real `Atom<T>`s.
		draftAtoms !== undefined ? { atoms: draftAtoms as unknown as ExternalAtoms<TFeatures> } : {},
	)

	// The vanilla reactivity binding, spread *before* the caller's set so a caller that supplied
	// its own wins — the same order `useTable` uses (api-notes §5.1). A React consumer never
	// reaches this function; it calls `useTable` with these options.
	const table = constructTable({
		...options,
		features: { coreReactivityFeature: storeReactivityBindings(), ...options.features },
	} as unknown as TableOptions<TFeatures, TRow>) as DataTable<TFeatures, TRow>

	// The `on<Slice>Change` handlers write through the table's own atoms, so they cannot be part
	// of the options `constructTable` was called with. Merged in once, before anything reads or
	// writes state. Each handler writes its slice and then calls the consumer back; there is no
	// funnel around them any more.
	//
	// `prev` keeps its annotation now that the last v8 `declare module` block is gone and
	// `DataTable` resolves to the real v9 `Table`: `setOptions` is `Updater<TableOptions<…>>`, so
	// the parameter is inferred, and the annotation restates it rather than supplying it.
	table.setOptions((prev: TableOptions<TFeatures, TRow>) => ({ ...prev, ...bindStateHandlers(table) }))

	// `config.onStateChange` — the consumer's whole-state callback, and the primary contract every
	// controlled-state consumer is written against. The deleted funnel's last act was to call it;
	// v9's store is the channel that replaces the funnel, so one subscription is the whole
	// implementation.
	//
	// Deliberately **plain emission**: no `toOutward` projection, no reference diffing, no
	// invariant re-enforcement. Those were the funnel, and the funnel is what this task removed —
	// each slice now enforces its own invariants in its `on<Slice>Change` handler, and v9 already
	// emits only on an actual state change.
	//
	// The one thing that is not plain emission is deferral, and it is a filter rather than a
	// funnel: while a `draft` is pending the consumer sees the **applied** query on the three
	// deferred axes, and a change confined to those axes is not a change they are allowed to see,
	// so it is swallowed. "onStateChange fired" therefore keeps meaning "the query changed"
	// rather than "the user typed". Every other slice emits exactly as it does without `draft`.
	//
	// Gated on `draftAtoms` rather than on the feature being registered: `draftFeature` with
	// `draft` off seeds `applied` once and never moves it, and projecting through a snapshot that
	// does not move would emit a query the user changed three keystrokes ago.
	//
	// Subscribed only when there is something to call, so a grid that never asked for the callback
	// carries no subscriber.
	if (config.onStateChange !== undefined) {
		const emit = config.onStateChange
		if (draftAtoms === undefined) {
			table.store.subscribe(() => {
				emit(table.store.state)
			})
		} else {
			const outward = createAppliedEmitter(table.store.state)
			table.store.subscribe(() => {
				const next = outward(table.store.state)
				if (next !== undefined) emit(next)
			})
		}
	}

	table.grid = grid
	table.setData = (data: TRow[]) => {
		table.setOptions((prev: TableOptions<TFeatures, TRow>) => ({ ...prev, data }))
	}

	return table
}
