import { createContext, useContext, useMemo } from 'react'

import type { GridFeature, FullGridComponents, GridComponents } from './contract'
import type { ReactNode } from 'react'

/**
 * The empty registry the context starts from — **one empty group per feature**, not `{}`.
 *
 * The shape matters more than it looks. This value is what every `useGridComponents()` outside a
 * `<DataGrid>` returns, and the type says every group is there. When the value was a bare
 * `{} as FullGridComponents`, `useGridComponents().core` was `undefined` and the ordinary reading
 * shape — `const { Button } = useGridComponents().core` — threw
 * `Cannot destructure property 'Button' of undefined`, naming neither the slot nor the reason. Every
 * one of the fifty-odd readers in this package carried that latent crash; the one that surfaced it
 * was `ColumnDragHandle`, once a kit began rendering it in a panel row its own unit tests mount
 * without a grid.
 *
 * **Written out, but checked by `satisfies Record<GridFeature, object>`** — so a new feature group is
 * a compile error here rather than a silently missing key. Deriving it at runtime with
 * `Object.fromEntries(Object.values(GridFeature)…)` gives the same guarantee and costs real bytes:
 * `GridFeature` would become a **value** import, which drags `contract.ts` into every entry that
 * reaches this module. Measured — `dist/cell-types/index.js` went 387 B over its budget on that one
 * import. The `satisfies` clause is the same completeness check with the type erased.
 *
 * **What this deliberately does not do is make a missing slot an error, and that was measured rather
 * than assumed.** The obvious next step — a development proxy throwing a named error when a slot is
 * read out of an unregistered group — was written and reverted: it failed 19 cases in the heroui kit
 * and 6 in shadcn, all of them `core.Tooltip`, and one of them is called *"renders the short form
 * unchanged when no tooltip is registered"*. Reading an absent **optional** slot and branching on
 * `undefined` is a supported shape (`const { Tooltip } = useGridComponents().core; if (!Tooltip) …`),
 * and it has to keep working whether or not a grid is above. So a missing slot stays `undefined`
 * here exactly as it is inside a grid, and what the grouped shape buys is narrower and real: the
 * *group* is always there, so the destructure that reads it cannot throw.
 *
 * Reporting a slot a kit should have registered is a different job with a different owner:
 * `ComponentGuard`, mounted inside a grid, where "should have" is knowable.
 *
 * Deliberately **not** exported, which is unchanged: its type still claims a complete registry while
 * the groups hold nothing, so a kit spreading it (`components: { ...defaultComponents, core: … }`)
 * would typecheck and then render `undefined` as a component. Nothing outside this module has a use
 * for "the registry before a kit filled it in" — a consumer who wants the kit's components already
 * has them, from the kit.
 *
 * The cast goes through `unknown` because `Object.fromEntries` widens its key type to `string`, so
 * the result no longer overlaps the mapped `FullGridComponents` enough for a direct assertion. The
 * keys are `Object.values(GridFeature)` and the groups are empty by construction, which is exactly
 * the claim the assertion makes.
 */
const emptyComponents: FullGridComponents = {
	core: {},
	pagination: {},
	sorting: {},
	filtering: {},
	editing: {},
	deleting: {},
	rowActions: {},
	resizing: {},
	visibility: {},
	fallbacks: {},
	infinite: {},
	expanding: {},
} satisfies Record<GridFeature, object> as FullGridComponents

// ── context ───────────────────────────────────────────────────────────────

/**
 * The context holds the resolved, **nested** registry (`FullGridComponents`). Kits register
 * a nested, feature-grouped object and consumers read it the same way — no flattening — e.g.
 * `const { Table, Tr } = useGridComponents().core`.
 */
const GridComponentsContext = createContext<FullGridComponents>(emptyComponents)

export type GridComponentsProviderProps = {
	components?: GridComponents
	/**
	 * Wraps the resolved registry before it is published. The grid root passes
	 * `guardComponents` here under `IS_DEV`, which is the runtime component contract's lazy half.
	 *
	 * A prop rather than a call inside `useGridComponents()`, and the reason is bundle size: the
	 * guard reads `FEATURE_COMPONENTS`, so importing it *here* would put the whole contract map
	 * into the graph of every entry that reads a component — `cell-types` measured +728 B against
	 * its budget for a development-only check. Named by the one caller that already carries the
	 * contract, it costs the other entries nothing.
	 */
	guard?: (registry: FullGridComponents) => FullGridComponents
	children: ReactNode
}

/**
 * Per-group shallow merge: an override may supply only some components of a feature group,
 * so each group is merged member-by-member over the inherited registry.
 */
function mergeGridComponents(base: FullGridComponents, override: GridComponents): FullGridComponents {
	const merged = { ...base } as Record<GridFeature, Record<string, unknown>>
	for (const feature of Object.keys(override) as GridFeature[]) {
		merged[feature] = { ...merged[feature], ...override[feature] }
	}
	return merged as unknown as FullGridComponents
}

/**
 * DI registry for visual UI primitives consumed by the headless data-grid.
 *
 * This package ships **zero visual styling** — all colors, fonts, spacing,
 * borders, hover/focus, animations, and icon choices live in the UI kit
 * components you register here. Components are registered as a nested,
 * feature-grouped object (`GridComponents` / `FullGridComponents`), e.g.
 * `{ core: { Table, Thead, … }, pagination: { Pagination, PageSizer }, … }`,
 * and are merged group-by-group over the inherited registry.
 *
 * Pair with `import '@ez-kit/data-grid-react/styles.css'` once at the kit /
 * app root to apply the shared structural CSS (positioning, layout, overflow,
 * z-index, cursor). Visuals are then layered on top by the kit's own CSS.
 */
export function GridComponentsProvider({ components, guard, children }: GridComponentsProviderProps) {
	const parentComponents = useContext(GridComponentsContext)

	const value = useMemo(() => {
		const merged = components ? mergeGridComponents(parentComponents, components) : parentComponents
		return guard ? guard(merged) : merged
	}, [parentComponents, components, guard])

	return <GridComponentsContext.Provider value={value}>{children}</GridComponentsContext.Provider>
}

/**
 * The resolved registry, read as `useGridComponents().core`.
 *
 * In development the grid root publishes it wrapped by `guardComponents`, so a required component
 * a **partial** kit never registered renders as a named error rather than as React's `undefined is
 * not a component` — see `components-guard.ts` for why the error is raised on the render and not
 * on the read. Production publishes the registry untouched.
 */
export function useGridComponents(): FullGridComponents {
	return useContext(GridComponentsContext)
}
