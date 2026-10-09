import { COMPONENT_FEATURE, FEATURE_COMPONENTS } from './contract'

import type { GridFeature, FullGridComponents } from './contract'
import type { GridComponentRegistry } from './types'

/**
 * The one message a missing UI-kit component produces, wherever it is noticed. Both halves of
 * the runtime contract raise it: `<ComponentGuard>` eagerly at mount for the components a
 * config definitively calls for, and {@link guardComponents} lazily for everything else, at the
 * moment React is asked to render one.
 */
export function missingComponentsError(keys: readonly (keyof GridComponentRegistry)[]): Error {
	const detail = keys.map((key) => `  - ${key} (${COMPONENT_FEATURE[key]})`).join('\n')
	return new Error(
		`[data-grid] Missing required UI-kit component(s):\n${detail}\n` +
			'Register them via createDataGrid({ components }) or a local <DataGrid components={{…}} /> override. ' +
			'See @ez-kit/data-grid-react CONTRACT.md.',
	)
}

/** Required members per group, as a lookup — {@link FEATURE_COMPONENTS} is an array per group. */
const REQUIRED_KEYS = new Map<GridFeature, ReadonlySet<string>>(
	(Object.entries(FEATURE_COMPONENTS) as [GridFeature, readonly string[]][]).map(([feature, keys]) => [
		feature,
		new Set(keys),
	]),
)

/**
 * A stand-in for a required component the kit never registered. Reading the key hands this
 * back; **rendering** it is what throws.
 *
 * That split is the whole point. Half the package destructures a group eagerly and renders only
 * part of it — `header-cell.tsx` takes `SortIndicator`, `Resizer` and five filtering components
 * in one go, then renders whichever the column actually asked for — so throwing on the *read*
 * would fire on every header cell of a grid that sorts nothing, in a kit that never claimed to
 * support sorting. Throwing on the render fires exactly when the component is needed, and the
 * name React reports is the key rather than `undefined`.
 */
const placeholders = new Map<string, () => never>()

/**
 * Marks a placeholder as one. `<ComponentGuard>` renders **inside** the provider that publishes
 * the wrapped registry, so "is this component registered" has to survive the wrapping — a bare
 * `== null` test would see a stand-in and call it present.
 */
const MISSING_COMPONENT = Symbol('data-grid.missing-component')

export function isMissingComponent(value: unknown): boolean {
	return typeof value === 'function' && MISSING_COMPONENT in value
}

function missingComponent(key: keyof GridComponentRegistry): () => never {
	const existing = placeholders.get(key)
	if (existing) return existing

	const Missing = (): never => {
		throw missingComponentsError([key])
	}
	Object.defineProperty(Missing, 'name', { value: `Missing(${key})` })
	Object.defineProperty(Missing, MISSING_COMPONENT, { value: true })
	placeholders.set(key, Missing)
	return Missing
}

function guardGroup(feature: GridFeature, group: Record<string, unknown> | undefined): Record<string, unknown> {
	const required = REQUIRED_KEYS.get(feature) ?? new Set<string>()

	return new Proxy(group ?? {}, {
		get(target, key, receiver): unknown {
			// `Reflect.get` is typed `any`; the registry's values are components, and nothing here
			// does more with one than hand it back.
			const value = Reflect.get(target, key, receiver) as unknown
			// Optional slots (`FEATURE_OPTIONAL_COMPONENTS`) and anything outside the contract
			// keep answering `undefined`: a caller with a `= 'div'` default depends on it.
			if (value != null || typeof key !== 'string' || !required.has(key)) return value
			return missingComponent(key as keyof GridComponentRegistry)
		},
	})
}

/**
 * The lazy half of the runtime component contract: every group of `registry` wrapped so that a
 * required component the kit omitted resolves to a placeholder that throws a named error when
 * rendered, instead of reaching React as `undefined`.
 *
 * Kits that declare `satisfies FullGridComponents` are complete at compile time and are not
 * affected by any of this — the proxy only ever changes what a **partial** kit hands back, and
 * only for a key that is missing. It is applied in `useGridComponents()` under `IS_DEV`, so
 * production keeps reading the registry directly.
 *
 * A missing group is covered too: a partial kit that registered no `fallbacks` at all used to
 * fail as "cannot destructure property 'LoadingRow' of undefined", one level away from the
 * actual cause.
 *
 * Memoised per registry object, so the proxies are stable across renders and a consumer may
 * keep a group in a dependency array.
 */
const guarded = new WeakMap<object, FullGridComponents>()

export function guardComponents(registry: FullGridComponents): FullGridComponents {
	const cached = guarded.get(registry)
	if (cached) return cached

	const source = registry as unknown as Record<GridFeature, Record<string, unknown> | undefined>
	const groups = Object.fromEntries(
		(Object.keys(FEATURE_COMPONENTS) as GridFeature[]).map((feature) => [
			feature,
			guardGroup(feature, source[feature]),
		]),
	) as unknown as FullGridComponents

	guarded.set(registry, groups)
	return groups
}
