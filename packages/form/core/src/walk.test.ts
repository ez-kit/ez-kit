import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { isFieldNode, walkNodes } from './walk'

import type { FormSchema } from './schema'

const schema: FormSchema<{ a: string; b: string }> = {
	version: 1,
	children: [
		{ type: 'section', title: 'S', children: [{ type: FormFieldType.Text, name: 'a' }] },
		{ type: FormFieldType.Text, name: 'b' },
	],
}

test('visits every node depth-first, containers included', () => {
	const seen: string[] = []
	walkNodes(schema, (node) => seen.push(node.type))
	expect(seen).toEqual(['section', 'text', 'text'])
})

test('reports the ancestor chain', () => {
	const ancestorsByName = new Map<string, number>()
	walkNodes(schema, (node, ancestors) => {
		if (isFieldNode(node)) ancestorsByName.set(node.name, ancestors.length)
	})
	expect(ancestorsByName.get('a')).toBe(1)
	expect(ancestorsByName.get('b')).toBe(0)
})
