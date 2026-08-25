'use client'

import { useGridComponents } from '../components-context'
import { COMPONENT_FEATURE } from '../contract'
import { SELECTION_PANEL_KEY, type SelectionPanelConfig } from '../use-data-grid'

import { useDataGridInstance } from './table-context'

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
 * time — this guard is the runtime safety net for *partial* kits (typed against
 * `GridComponents`), where a feature can reference a component the kit never
 * registered. It asserts only components whose need is unambiguous at render time
 * (the always-rendered structural primitives, plus components gated by a config that
 * is definitively present) so it can never fire a false positive.
 *
 * Stripped from production builds by the `IS_DEV` guard at the call site.
 */
export function ComponentGuard(): null {
	const components = useGridComponents()
	const table = useDataGridInstance().table

	const required = new Set<keyof GridComponentRegistry>(REQUIRED_STRUCTURAL)

	if (table.options.deleting?.confirmation) required.add('ConfirmDialog')
	if (table.options.creating?.variant === 'modal' || table.options.editing?.variant === 'modal')
		required.add('FormShell')

	const selectionPanel = (table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY] as
		| boolean
		| SelectionPanelConfig
		| undefined
	if (selectionPanel !== undefined && selectionPanel !== false) required.add('SelectionBar')

	const missing = [...required].filter((key) => {
		// Resolve the component through its feature group; a partial kit may omit the
		// whole group or the individual member.
		const group = components[COMPONENT_FEATURE[key]] as Record<string, unknown> | undefined
		return group?.[key] == null
	})

	if (missing.length > 0) {
		const detail = missing.map((key) => `  - ${key} (${COMPONENT_FEATURE[key]})`).join('\n')
		throw new Error(
			`[data-grid] Missing required UI-kit component(s):\n${detail}\n` +
				'Register them via createDataGrid({ components }) or a local <DataGrid components={{…}} /> override. ' +
				'See @ez-kit/data-grid-react CONTRACT.md.',
		)
	}

	return null
}
