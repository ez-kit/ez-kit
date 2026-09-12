import { ACTION_BUTTON_SIZE, RowActionsPlacement } from '@ez-kit/data-grid-core'
import { isValidElement } from 'react'

import type { GridMenuItem } from '../menu'
import type { ActionItem, RowActionItem } from '@ez-kit/data-grid-core'
import type { ReactElement } from 'react'

const IS_DEV = process.env.NODE_ENV !== 'production'

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
 * Dev warnings fire from a cell, which re-renders per row and on every state change, so each
 * message is kept to once per grid session. Keyed by the message itself — two entries with the
 * same defect in the same grid say the same thing.
 */
const warned = new Set<string>()

function warnOnce(message: string): void {
	if (warned.has(message)) return
	warned.add(message)
	console.warn(message)
}

/**
 * An entry's icon as the kit's menu model accepts it.
 *
 * The config the author writes is already typed to `ReactElement` (`ReactRowActionsConfig` and
 * `SelectionBarConfig` both bind the entry's node parameter to it) — the check exists because a
 * row's items reach this layer through `table.options`, where the node type is erased back to
 * `unknown`. A named `GridMenuIcon` is deliberately *not* accepted here: that vocabulary names
 * grid affordances and belongs to the entries the grid builds itself.
 */
function toMenuIcon(icon: unknown): ReactElement | undefined {
	return isValidElement(icon) ? icon : undefined
}

/**
 * Turns one consumer {@link ActionItem} into the menu model a kit renders — namespaced id,
 * icon narrowed, nothing else touched.
 */
function toGridMenuItem(item: ActionItem<ReactElement>): GridMenuItem {
	const id = `${CUSTOM_ACTION_PREFIX}${item.id}`
	// An entry that brought its own markup keeps nothing but its id — there is no icon,
	// label or state for the kit to draw around something it does not describe.
	if ('component' in item) return { id, component: item.component }

	const icon = toMenuIcon(item.icon)
	return {
		id,
		label: item.label,
		...(icon !== undefined ? { icon } : {}),
		...(item.className !== undefined ? { className: item.className } : {}),
		...(item.disabled !== undefined ? { disabled: item.disabled } : {}),
		...(item.destructive !== undefined ? { destructive: item.destructive } : {}),
		onAction: item.onAction,
	}
}

/**
 * Builds the entries of `selection.bar.actions` — the bar draws every one of them as a button,
 * so there is nothing to place and nothing to measure.
 */
export function buildActionItems(items: ActionItem<ReactElement>[]): GridMenuItem[] {
	return items.map(toGridMenuItem)
}

/** `rowActions.actions` split by where each entry asked to go. */
export type RowActionGroups = {
	/** Entries drawn as buttons in the cell, beside the built-in edit / delete. */
	inline: GridMenuItem[]
	/** Entries drawn in the overflow menu — the default. */
	menu: GridMenuItem[]
	/** Each inline entry's width, in `inline` order — for the cell's dev-only fit check. */
	inlineWidths: number[]
}

/**
 * Splits `rowActions.actions` into the two containers a cell has.
 *
 * An entry defaults to the menu whatever `columnPlacement` is, so inline is always an explicit
 * opt-in — see `RowActionItem`. Under a column collapsed to one menu there is no cell to put a
 * button in, so an entry that asked for one falls back to the menu and says so in development.
 */
export function splitRowActionItems(
	items: RowActionItem<ReactElement>[],
	columnPlacement: RowActionsPlacement,
): RowActionGroups {
	const inline: GridMenuItem[] = []
	const menu: GridMenuItem[] = []
	const inlineWidths: number[] = []

	for (const item of items) {
		const built = toGridMenuItem(item)
		if (item.placement !== RowActionsPlacement.Inline) {
			menu.push(built)
			continue
		}
		if (columnPlacement === RowActionsPlacement.Menu) {
			if (IS_DEV) {
				warnOnce(
					`[data-grid] Row action "${item.id}" asks for \`placement: '${RowActionsPlacement.Inline}'\`, but ` +
						`\`rowActions.placement\` is '${RowActionsPlacement.Menu}', so the column has no cell to put a ` +
						`button in. The entry is rendered in the menu instead.`,
				)
			}
			menu.push(built)
			continue
		}
		inline.push(built)
		inlineWidths.push(resolveInlineWidth(item))
	}

	return { inline, menu, inlineWidths }
}

/**
 * How much room one inline entry takes: an icon button's width for an entry the kit draws, and
 * the declared `width` for one that brought its own markup — the grid cannot measure what it
 * did not draw, so an undeclared one is budgeted as a single button and reported.
 */
function resolveInlineWidth(item: RowActionItem<ReactElement>): number {
	if (!('component' in item)) return ACTION_BUTTON_SIZE
	// Narrowed by hand: `width` lives on the inline slot branch only, and both slot branches
	// are still in play here — the entry reached this layer through `table.options`.
	const width = 'width' in item ? item.width : undefined
	if (typeof width === 'number') return width
	if (IS_DEV) {
		warnOnce(
			`[data-grid] Inline row action "${item.id}" renders its own \`component\`, whose width the grid ` +
				`cannot know. It is budgeted as one ${String(ACTION_BUTTON_SIZE)}px button — declare \`width\` on ` +
				`the entry so the actions column can be sized against it.`,
		)
	}
	return ACTION_BUTTON_SIZE
}
