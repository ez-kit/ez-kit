import { describe, expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { hasChildren, hasValue, isArrayNode, isFieldNode, walkInstances, walkNodes } from './walk'

import type { AnyFormSchema, FormNode, FormSchema } from './schema'

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

describe('array-aware traversal', () => {
	const titleNode = { type: FormFieldType.Text, name: 'title' } as unknown as FormNode<unknown, string>
	const peopleNode = {
		type: 'array' as const,
		name: 'people',
		children: [
			{ type: FormFieldType.Text, name: 'firstName' },
			{ type: 'array' as const, name: 'tags', children: [{ type: FormFieldType.Text, name: 'label' }] },
		],
	} as unknown as FormNode<unknown, string>
	const schema = { version: 1, children: [titleNode, peopleNode] } as unknown as AnyFormSchema<unknown>

	test('an array node is a container, not a field', () => {
		expect(isArrayNode(peopleNode)).toBe(true)
		expect(isFieldNode(peopleNode)).toBe(false)
		expect(hasChildren(peopleNode)).toBe(true)
	})

	test('an array node still names a value, so hasValue accepts it', () => {
		expect(hasValue(peopleNode)).toBe(true)
		expect(hasValue(titleNode)).toBe(true)
	})

	test('expands one field node into one instance per item, with real paths', () => {
		const paths: (string | undefined)[] = []
		walkInstances(schema, { title: 'x', people: [{ tags: [] }, { tags: [] }] }, ({ path }) => {
			paths.push(path)
		})
		expect(paths).toEqual([
			'title',
			'people',
			'people[0].firstName',
			'people[0].tags',
			'people[1].firstName',
			'people[1].tags',
		])
	})

	test('expands a nested array against the nested values', () => {
		const paths: (string | undefined)[] = []
		walkInstances(schema, { people: [{ tags: [{}, {}] }] }, ({ path, node }) => {
			if (isFieldNode(node)) paths.push(path)
		})
		expect(paths).toEqual(['title', 'people[0].firstName', 'people[0].tags[0].label', 'people[0].tags[1].label'])
	})

	test('reports the item each node sits in, which is what a ./ condition resolves against', () => {
		const scopes: (string | undefined)[] = []
		walkInstances(schema, { people: [{ tags: [{}] }] }, ({ node, itemPath }) => {
			if (isFieldNode(node)) scopes.push(itemPath)
		})
		// `title` sits at the form root, so it reports no item scope at all.
		expect(scopes).toEqual([undefined, 'people[0]', 'people[0].tags[0]'])
	})

	test('yields nothing below an array whose value is missing', () => {
		const paths: (string | undefined)[] = []
		walkInstances(schema, { title: 'x' }, ({ path }) => {
			paths.push(path)
		})
		expect(paths).toEqual(['title', 'people'])
	})
})
