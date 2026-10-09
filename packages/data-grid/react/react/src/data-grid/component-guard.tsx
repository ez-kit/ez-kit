'use client'

import { isFeatureEnabled } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { isMissingComponent, missingComponentsError } from '../components-guard'
import { COMPONENT_FEATURE } from '../contract'

import { useDataGridTable } from './table-context'

import type { GridComponentRegistry } from '../types'

/**
 * Components that are structurally required for *any* grid render, regardless of
 * which features are enabled. Missing one of these is what produces React's opaque
 * "undefined is not a component" — the guard replaces that with a named error.
 */
const REQUIRED_STRUCTURAL = [
	'Table',
	'Thead',
	'Tbody',
	'Tr',
	'Th',
	'Td',
] as const satisfies readonly (keyof GridComponentRegistry)[]

/**
 * Dev-only completeness check for the injected UI-kit components. Mounted inside the
 * provider tree by the DataGrid root; renders nothing.
 *
 * Kits that declare `satisfies FullGridComponents` are already complete at compile
 * time — the runtime contract is the safety net for *partial* kits (typed against
 * `GridComponents`), where a feature can reference a component the kit never
 * registered. It has two halves, and this is the **eager** one: it asserts, at mount,
 * only the components whose need is unambiguous before anything is rendered — the
 * always-rendered structural primitives, plus the ones a definitively present config
 * calls for — so it can never fire a false positive.
 *
 * Its value over the lazy half is *when* it fires. `ConfirmDialog` and `FormShell`
 * render on an interaction that may be a dozen clicks into a flow; a config that asks
 * for them says so at mount, so that is where the error belongs.
 *
 * Everything else is covered by `guardComponents` in `../components-guard`, which
 * resolves a missing required component to a placeholder that throws when rendered.
 * That is why this list stays short rather than growing to all of
 * {@link FEATURE_COMPONENTS} — and why `Tfoot` is deliberately absent from the
 * structural set: a footer renders only if a layout composed `<DataGrid.Footer>`, and
 * a config cannot know whether one did.
 *
 * Stripped from production builds by the `IS_DEV` guard at the call site.
 */
export function ComponentGuard(): null {
	const components = useGridComponents()
	const table = useDataGridTable()

	const required = new Set<keyof GridComponentRegistry>(REQUIRED_STRUCTURAL)

	if (isFeatureEnabled(table.options.deleting?.confirmation)) required.add('ConfirmDialog')
	if (table.options.creating?.mode === 'modal' || table.options.editing?.mode === 'modal') required.add('FormShell')

	// Either feature is enough: the one bar is what both the selection and a pending draft
	// render into, so a grid with `draft` and no selection still needs it registered.
	if (table.grid.selection.bar !== undefined || table.options.draft === true) required.add('ActionBar')

	const missing = [...required].filter((key) => {
		// Resolve the component through its feature group; a partial kit may omit the
		// whole group or the individual member.
		const group = components[COMPONENT_FEATURE[key]] as Record<string, unknown> | undefined
		const registered = group?.[key]
		return registered == null || isMissingComponent(registered)
	})

	if (missing.length > 0) throw missingComponentsError(missing)

	return null
}
