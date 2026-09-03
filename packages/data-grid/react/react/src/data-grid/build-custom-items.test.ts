import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { GridMenuIcon } from '../menu'

import { buildCustomItems } from './actions-cell'

describe('buildCustomItems', () => {
	it('namespaces ids so a custom action cannot collide with a built-in one', () => {
		const [item] = buildCustomItems([{ id: 'edit', label: 'Edit copy', onSelect: () => {} }])

		expect(item?.id).not.toBe('edit')
		expect(item?.id).toContain('edit')
	})

	it('keeps a recognized icon name', () => {
		const [item] = buildCustomItems([
			{ id: 'archive', label: 'Archive', icon: GridMenuIcon.Delete, onSelect: () => {} },
		])

		expect(item?.icon).toBe(GridMenuIcon.Delete)
	})

	it('carries a consumer-supplied element through as the icon', () => {
		const glyph = createElement('svg', { 'data-testid': 'envelope' })
		const [item] = buildCustomItems([{ id: 'send', label: 'Send invoice', icon: glyph, onSelect: () => {} }])

		expect(item?.icon).toBe(glyph)
		expect(item?.label).toBe('Send invoice')
	})

	it('drops a value that is neither a built-in name nor an element', () => {
		// Not reachable through the typed config — `icon` is `GridMenuIcon | ReactElement` there.
		// This is the erased `table.options` boundary the runtime check exists for.
		const items = [{ id: 'send', label: 'Send invoice', icon: 'envelope', onSelect: () => {} }]
		const [item] = buildCustomItems(items as unknown as Parameters<typeof buildCustomItems>[0])

		expect(item?.icon).toBeUndefined()
		expect(item?.label).toBe('Send invoice')
	})

	it('carries disabled, destructive and onSelect through', () => {
		const onSelect = () => {}
		const [item] = buildCustomItems([{ id: 'purge', label: 'Purge', disabled: true, destructive: true, onSelect }])

		expect(item?.disabled).toBe(true)
		expect(item?.destructive).toBe(true)
		expect(item?.onSelect).toBe(onSelect)
	})
})
