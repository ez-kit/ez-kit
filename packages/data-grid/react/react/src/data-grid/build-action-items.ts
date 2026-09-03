import { isValidElement } from 'react'

import { isGridMenuIcon } from '../menu'

import type { GridMenuItem } from '../menu'
import type { ActionItem, GridMenuIcon } from '@ez-kit/data-grid-core'
import type { ReactElement } from 'react'

/**
 * Namespace for the ids of consumer-supplied entries.
 *
 * `RowActionId` is the closed set of built-in affordances and stays closed; a custom
 * action named `edit` must not collide with the built-in Edit entry, whose id is what both
 * kits dispatch a selection on (heroui looks the entry up by key, shadcn keys the React
 * element on it). Prefixing keeps the two sets disjoint by construction.
 */
const CUSTOM_ACTION_PREFIX = 'custom:'

/**
 * The icon slot as the kit's menu model accepts it: a named glyph, or the consumer's own
 * element. The config the author writes is already typed to exactly this (`ReactRowActionsConfig`
 * and `SelectionBarConfig` both bind {@link ActionItem}'s node parameter to `ReactElement`) —
 * the check exists because a row's items reach this layer through `table.options`, where the
 * node type is erased back to `unknown`.
 */
function toMenuIcon(icon: unknown): GridMenuIcon | ReactElement | undefined {
	if (isGridMenuIcon(icon)) return icon
	return isValidElement(icon) ? icon : undefined
}

/**
 * Turns the consumer's {@link ActionItem}s into the menu model a kit renders.
 *
 * Shared by both contribution points on purpose — `rowActions.actions` (per row, rendered as
 * overflow-menu entries) and `selection.bar.actions` (for the selection, rendered as buttons in
 * the bar) — so an action written once carries the same icon, danger colour and disabled state
 * wherever it is offered.
 */
export function buildActionItems(items: ActionItem<ReactElement>[]): GridMenuItem[] {
	return items.map((item) => {
		const icon = toMenuIcon(item.icon)
		return {
			id: `${CUSTOM_ACTION_PREFIX}${item.id}`,
			label: item.label,
			...(icon !== undefined ? { icon } : {}),
			...(item.disabled !== undefined ? { disabled: item.disabled } : {}),
			...(item.destructive !== undefined ? { destructive: item.destructive } : {}),
			onSelect: item.onSelect,
		}
	})
}
