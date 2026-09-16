// @vitest-environment node
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readCssDeclared, readCssRead, readJsWritten } from './css-custom-properties/dg-vars'

/**
 * Guards the `--dg-*` custom properties against a name that silently stops being reached.
 *
 * This is the pin-shadow defect class, generalised. `--dg-pin-start-shadow` /
 * `--dg-pin-end-shadow` are written by `table.tsx` with `style.setProperty` — a `string`,
 * invisible to TypeScript — and read by four rules across the two kits, each carrying a `, 0`
 * fallback. Rename the writer and miss a reader and that kit's pin shadow is permanently
 * invisible: no type error, no unit failure (`data-attrs.test.tsx` asserts the overlay's
 * position, never its opacity), and no browser spec addresses `data-pin-shadow` at all.
 * `--dg-pin-start` / `--dg-pin-end` and the row-pin offset have the same shape.
 *
 * Both directions are checked, because both are defects and only one of them is visible:
 * a reader with no writer renders the fallback forever; a writer with no reader is a style
 * computed on every scroll for nothing.
 *
 * What this cannot see is a property assembled at runtime, and a consumer's own stylesheet —
 * the registry payload is copied into a consumer's project, so a rename here reaches them and
 * nothing in this repo can tell.
 */

const REPO_ROOT = resolve(__dirname, '../../..')

/** The three packages that render a data grid: one writes the values, all three read them. */
const PACKAGES = [
	'packages/data-grid/react/react/src',
	'packages/data-grid/react/shadcn/src',
	'packages/data-grid/react/heroui/src',
].map((path) => resolve(REPO_ROOT, path))

const jsWritten = readJsWritten(PACKAGES, REPO_ROOT)
const cssRead = readCssRead(PACKAGES, REPO_ROOT)
const cssDeclared = readCssDeclared(PACKAGES, REPO_ROOT)

const readNames = new Set(cssRead.map((usage) => usage.name))
const setNames = new Set([...jsWritten.map((usage) => usage.name), ...cssDeclared])

describe('--dg-* custom properties', () => {
	it('is read by a stylesheet for every name the packages write', () => {
		const unread = jsWritten.filter((usage) => !readNames.has(usage.name))

		expect(unread.map((usage) => `${usage.at}  ${usage.name}`)).toEqual([])
	})

	it('is written or declared for every name a stylesheet reads', () => {
		const unset = cssRead.filter((usage) => !setNames.has(usage.name))

		expect(unset.map((usage) => `${usage.at}  var(${usage.name})`)).toEqual([])
	})

	// Both sides are read by scanning source, so an extractor that silently stopped finding
	// anything would make the two assertions above pass while checking nothing.
	it('reads both sides of the contract', () => {
		expect(jsWritten.length).toBeGreaterThan(5)
		expect(cssRead.length).toBeGreaterThan(10)
		// The pair the guard exists for, on both sides.
		expect(new Set(jsWritten.map((usage) => usage.name))).toContain('--dg-pin-start-shadow')
		expect(readNames).toContain('--dg-pin-end-shadow')
	})
})
