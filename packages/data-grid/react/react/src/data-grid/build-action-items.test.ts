import { ACTION_BUTTON_SIZE, RowActionsPlacement } from '@ez-kit/data-grid-core'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { isGridMenuItemSlot } from '../menu'

import { buildActionItems, splitRowActionItems } from './build-action-items'

import type { GridMenuItem, GridMenuItemDef } from '../menu'

/** The described half, for the cases that read `label` / `icon` / `onAction` off the result. */
function def(item: GridMenuItem | undefined): GridMenuItemDef | undefined {
	return item !== undefined && !isGridMenuItemSlot(item) ? item : undefined
}

describe('buildActionItems', () => {
	it('namespaces ids so a custom action cannot collide with a built-in one', () => {
		const [item] = buildActionItems([{ id: 'edit', label: 'Edit copy', onAction: () => {} }])

		expect(item?.id).not.toBe('edit')
		expect(item?.id).toContain('edit')
	})

	it('carries a consumer-supplied element through as the icon', () => {
		const glyph = createElement('svg', { 'data-testid': 'envelope' })
		const [item] = buildActionItems([{ id: 'send', label: 'Send invoice', icon: glyph, onAction: () => {} }])

		expect(def(item)?.icon).toBe(glyph)
		expect(def(item)?.label).toBe('Send invoice')
	})

	it('drops an icon that is not an element', () => {
		// Not reachable through the typed config — `icon` is a `ReactElement` there, and the
		// built-in `GridMenuIcon` names are deliberately not offered to a custom action. This is
		// the erased `table.options` boundary the runtime check exists for.
		const items = [{ id: 'send', label: 'Send invoice', icon: 'envelope', onAction: () => {} }]
		const [item] = buildActionItems(items as unknown as Parameters<typeof buildActionItems>[0])

		expect(def(item)?.icon).toBeUndefined()
		expect(def(item)?.label).toBe('Send invoice')
	})

	it('carries className, disabled, destructive and onAction through', () => {
		const onAction = () => {}
		const [item] = buildActionItems([
			{ id: 'purge', label: 'Purge', className: 'text-danger', disabled: true, destructive: true, onAction },
		])

		expect(def(item)?.className).toBe('text-danger')
		expect(def(item)?.disabled).toBe(true)
		expect(def(item)?.destructive).toBe(true)
		expect(def(item)?.onAction).toBe(onAction)
	})

	it('carries an entry that brought its own component through, id namespaced and nothing else added', () => {
		const component = createElement('button', null, 'Export')
		const [item] = buildActionItems([{ id: 'export', component }])

		expect(item).toBeDefined()
		expect(item !== undefined && isGridMenuItemSlot(item)).toBe(true)
		expect(item?.id).toContain('export')
		// No label, icon or handler is invented around markup the kit does not describe.
		expect(item).toEqual({ id: item?.id, component })
	})
})

describe('splitRowActionItems', () => {
	const icon = createElement('svg')

	it('sends an entry to the menu when it names no placement', () => {
		const groups = splitRowActionItems(
			[{ id: 'duplicate', label: 'Duplicate', icon, onAction: () => {} }],
			RowActionsPlacement.Inline,
		)

		expect(groups.menu).toHaveLength(1)
		expect(groups.inline).toHaveLength(0)
		expect(groups.inlineWidths).toEqual([])
	})

	it('promotes an entry that asked for inline, and budgets one button for it', () => {
		const groups = splitRowActionItems(
			[
				{ id: 'duplicate', label: 'Duplicate', icon, placement: RowActionsPlacement.Inline, onAction: () => {} },
				{ id: 'history', label: 'History', onAction: () => {} },
			],
			RowActionsPlacement.Inline,
		)

		expect(groups.inline.map((item) => item.id)).toEqual([expect.stringContaining('duplicate')])
		expect(groups.menu.map((item) => item.id)).toEqual([expect.stringContaining('history')])
		expect(groups.inlineWidths).toEqual([ACTION_BUTTON_SIZE])
	})

	it('falls back to the menu when the column itself is collapsed to one', () => {
		const groups = splitRowActionItems(
			[{ id: 'duplicate', label: 'Duplicate', icon, placement: RowActionsPlacement.Inline, onAction: () => {} }],
			RowActionsPlacement.Menu,
		)

		expect(groups.inline).toHaveLength(0)
		expect(groups.menu).toHaveLength(1)
	})

	it('takes an inline component entry at its declared width, and budgets one button without it', () => {
		const component = createElement('button')
		const groups = splitRowActionItems(
			[
				{ id: 'seats', component, placement: RowActionsPlacement.Inline, width: 120 },
				{ id: 'stepper', component, placement: RowActionsPlacement.Inline },
			],
			RowActionsPlacement.Inline,
		)

		expect(groups.inlineWidths).toEqual([120, ACTION_BUTTON_SIZE])
	})
})
