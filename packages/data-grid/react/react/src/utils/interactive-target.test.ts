import { describe, expect, it } from 'vitest'

import { isInteractiveTarget, isTextEntryTarget } from './interactive-target'

import type { KeyboardEvent } from 'react'

/** A minimal event standing in for React's synthetic one: only these two fields are read. */
function eventOn(html: string): KeyboardEvent {
	const host = document.createElement('div')
	host.innerHTML = html
	const target = host.firstElementChild
	if (!target) throw new Error('fixture has no element')
	return { target, currentTarget: host } as unknown as KeyboardEvent
}

describe('isTextEntryTarget', () => {
	it.each([
		['<input type="text" />', true],
		['<input />', true],
		['<textarea></textarea>', true],
		['<select></select>', true],
		['<div contenteditable="true"></div>', true],
		['<input type="checkbox" />', false],
		['<input type="radio" />', false],
		['<button></button>', false],
		['<a href="#">x</a>', false],
		['<span>x</span>', false],
	])('%s → %s', (html, expected) => {
		expect(isTextEntryTarget(eventOn(html))).toBe(expected)
	})
})

describe('isInteractiveTarget', () => {
	it('is the broader of the two — a button counts here and not there', () => {
		// This is the whole reason the row needs its own predicate: in a row, focus is always on
		// a control this one rejects.
		const button = eventOn('<button></button>')

		expect(isInteractiveTarget(button)).toBe(true)
		expect(isTextEntryTarget(button)).toBe(false)
	})

	it('ignores the element the handler itself sits on', () => {
		const host = document.createElement('button')
		const event = { target: host, currentTarget: host } as unknown as KeyboardEvent

		expect(isInteractiveTarget(event)).toBe(false)
	})
})
