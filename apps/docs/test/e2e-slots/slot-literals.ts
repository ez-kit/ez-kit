import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Reads the two halves of the `data-slot` contract the browser suite relies on: the slot names
 * a spec addresses, and the slot names a package actually writes onto an element.
 *
 * Both halves are string literals in source — a JSX `data-slot="th"` *is* the DOM attribute the
 * selector `[data-slot="th"]` matches — so comparing the literals compares the relationship
 * itself rather than approximating it. What this cannot see is a slot assembled at runtime
 * (`data-slot={expr}`, or one a third-party component stamps for us): such a name never reaches
 * the authored set, which is why the check names its escape hatch when it fails.
 */

/** A `data-slot="x"` / `data-slot='x'` literal, in a JSX attribute or a CSS attribute selector. */
const SLOT_LITERAL = /data-slot=["']([a-z0-9-]+)["']/g

export type SlotUsage = {
	readonly slot: string
	/** Repo-relative `file:line`, so a failure is a click away from the locator. */
	readonly at: string
}

function walk(dir: string, accept: (file: string) => boolean): string[] {
	const files: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) files.push(...walk(path, accept))
		else if (accept(path)) files.push(path)
	}
	return files
}

const isSpec = (file: string): boolean => file.endsWith('.ts')

/** Package sources, minus their own unit tests — those name slots nothing renders (`hijacked`). */
const isSource = (file: string): boolean => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file)

/**
 * Blanks out `//` and slash-star comments, keeping every newline so line numbers survive.
 *
 * Written as a scanner rather than a regex because both halves of this file read source that
 * quotes the other half: a spec explaining in prose which slot a kit renders is not addressing
 * it, and a `'https://…'` in a spec is not the start of a comment.
 */
export function stripComments(source: string): string {
	let out = ''
	let index = 0
	while (index < source.length) {
		const char = source.charAt(index)
		const next = source.charAt(index + 1)
		if (char === '/' && next === '/') {
			while (index < source.length && source[index] !== '\n') index += 1
			continue
		}
		if (char === '/' && next === '*') {
			const end = source.indexOf('*/', index + 2)
			const stop = end === -1 ? source.length : end + 2
			out += source.slice(index, stop).replace(/[^\n]/g, '')
			index = stop
			continue
		}
		if (char === '"' || char === "'" || char === '`') {
			let cursor = index + 1
			while (cursor < source.length && source[cursor] !== char) {
				cursor += source[cursor] === '\\' ? 2 : 1
			}
			out += source.slice(index, Math.min(cursor + 1, source.length))
			index = cursor + 1
			continue
		}
		out += char
		index += 1
	}
	return out
}

/** Every slot a spec under `root` addresses, with the line that addresses it. */
export function readSpecSlots(root: string, repoRoot: string): readonly SlotUsage[] {
	const usages: SlotUsage[] = []
	for (const file of walk(root, isSpec)) {
		const at = relative(repoRoot, file)
		stripComments(readFileSync(file, 'utf8'))
			.split('\n')
			.forEach((line, index) => {
				for (const [, slot] of line.matchAll(SLOT_LITERAL)) {
					if (slot !== undefined) usages.push({ slot, at: `${at}:${String(index + 1)}` })
				}
			})
	}
	return usages
}

/** Every slot name the given package sources write as a literal. */
export function readAuthoredSlots(roots: readonly string[]): ReadonlySet<string> {
	const slots = new Set<string>()
	for (const root of roots) {
		for (const file of walk(root, isSource)) {
			for (const [, slot] of stripComments(readFileSync(file, 'utf8')).matchAll(SLOT_LITERAL)) {
				if (slot !== undefined) slots.add(slot)
			}
		}
	}
	return slots
}
