import { describe, expect, it } from 'vitest'

import { isTextEntryTarget } from './text-entry-target'

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

/**
 * There is no companion predicate any more. `isInteractiveTarget` — "did this event start on
 * anything interactive" — guarded the header's sort affordance while that was a `role='button'`
 * div wrapping arbitrary content; the affordance is a real `<button>` now, so a click on it
 * means sort and there is nothing left to ask.
 */
