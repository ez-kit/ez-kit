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

	it('drops an icon name outside the built-in set rather than passing it to a kit', () => {
		const [item] = buildCustomItems([{ id: 'send', label: 'Send invoice', icon: 'envelope', onSelect: () => {} }])

		expect(item?.icon).toBeUndefined()
		expect(item?.label).toBe('Send invoice')
	})

	it('carries disabled, danger and onSelect through', () => {
		const onSelect = () => {}
		const [item] = buildCustomItems([{ id: 'purge', label: 'Purge', disabled: true, danger: true, onSelect }])

		expect(item?.disabled).toBe(true)
		expect(item?.danger).toBe(true)
		expect(item?.onSelect).toBe(onSelect)
	})
})
