import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { stripComments } from '../e2e-slots/slot-literals'

/**
 * Finds composition code that writes a structural `data-slot` onto a host element of its own.
 *
 * A `data-slot` literal is a contract between the react package and the kits' stylesheets. When
 * a consumer writes one by hand — `<div data-slot='header-main'>` inside a `HeaderCell` render
 * function — that contract leaves the one module that owns it: renaming the slot goes red in the
 * CSS and stays silent at every call site, which is the same shape of defect
 * `e2e-slots.test.ts` was written for after #233.
 *
 * "Host element" means a lowercase JSX tag. `<DataGrid.HeaderMain>` is a component and carries
 * no literal, so migrating a site removes it from this scan by construction.
 */

/** A lowercase JSX opening tag whose attributes include a `data-slot` string literal. */
const HOST_WITH_SLOT = /<([a-z][a-z0-9]*)\b[^>]*?\bdata-slot=["']([a-z0-9-]+)["']/gu

/** Component to reach for instead, keyed by the slot the raw element was carrying. */
const SLOT_COMPONENT: Readonly<Record<string, string>> = {
	'header-main': '<DataGrid.HeaderMain>',
	'header-extras': '<DataGrid.HeaderExtras>',
	'bottom-bar': '<DataGrid.BottomBar>',
	'action-bar': '<DataGrid.ActionBar>',
	'filter-panel': '<DataGrid.FilterPanel>',
	'active-filters-bar': '<DataGrid.ActiveFiltersBar>',
	toolbar: '<DataGrid.Toolbar>',
}

export type HostSlot = {
	readonly slot: string
	readonly tag: string
	/** Repo-relative path. The stable half of the identity, and all a licence is keyed on. */
	readonly file: string
	/** Repo-relative `file:line`, so a failure is a click away from the element. */
	readonly at: string
}

/** What a licence names: one file, one tag, one slot. Never a line — see the test's docblock. */
export type HostSlotIdentity = Pick<HostSlot, 'file' | 'tag' | 'slot'>

/**
 * The identity a licence is recorded against.
 *
 * `tag` is part of it as well as `slot`: `<td data-slot='tr'>` is a different mistake from
 * `<tr data-slot='tr'>` and must not inherit the other's licence.
 */
export function hostSlotKey({ file, tag, slot }: HostSlotIdentity): string {
	return `${file}  <${tag} data-slot='${slot}'>`
}

/** What to do about a slot written by hand — nothing, when the package offers no component. */
function remedyFor(slot: string): string {
	const component = SLOT_COMPONENT[slot]

	return component === undefined ? 'no namespace component renders this slot' : `use ${component}`
}

/** Rendered into the failure message — `at` alone does not say what to do about it. */
export function describeHostSlot(host: HostSlot): string {
	return `${host.at}  <${host.tag} data-slot='${host.slot}'>  — ${remedyFor(host.slot)}`
}

/**
 * One line of the count assertion's failure.
 *
 * It prints the recorded count, the observed count **and** every `at`, because "expected 1,
 * got 2" names neither the new occurrence nor the old one, and a licence that has gone to zero
 * has no `at` to point at at all.
 */
export function describeCountMismatch(mismatch: {
	readonly identity: HostSlotIdentity
	readonly recorded: number
	readonly found: readonly HostSlot[]
}): string {
	const { identity, recorded, found } = mismatch
	const where = found.length === 0 ? 'nowhere' : found.map((host) => host.at).join(', ')

	return `${hostSlotKey(identity)}  — recorded ${String(recorded)}, found ${String(found.length)} at ${where}  — ${remedyFor(identity.slot)}`
}

const isScanned = (file: string): boolean => /\.(tsx?|mdx)$/u.test(file) && !/\.test\.tsx?$/u.test(file)

function walk(dir: string): string[] {
	const files: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) files.push(...walk(path))
		else if (isScanned(path)) files.push(path)
	}
	return files
}

/** Every host element under `roots` that carries a `data-slot` literal. */
export function readHostSlots(roots: readonly string[], repoRoot: string): readonly HostSlot[] {
	const found: HostSlot[] = []
	for (const root of roots) {
		for (const path of walk(root)) {
			const file = relative(repoRoot, path)
			stripComments(readFileSync(path, 'utf8'))
				.split('\n')
				.forEach((line, index) => {
					for (const [, tag, slot] of line.matchAll(HOST_WITH_SLOT)) {
						if (tag !== undefined && slot !== undefined) {
							found.push({ slot, tag, file, at: `${file}:${String(index + 1)}` })
						}
					}
				})
		}
	}
	return found
}
