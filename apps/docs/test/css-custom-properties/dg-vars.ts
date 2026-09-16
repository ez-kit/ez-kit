import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { stripComments } from '../e2e-slots/slot-literals'

/**
 * Reads the two halves of the `--dg-*` custom-property contract: the names a package's
 * JavaScript writes onto an element, and the names a package's stylesheet declares or reads.
 *
 * Both halves are string literals in source — the string handed to `style.setProperty` *is* the
 * property `var()` resolves — so comparing the literals compares the relationship itself. This
 * is the only thing that can: the writer's argument is a `string`, invisible to TypeScript, and
 * every reader carries a fallback (`var(--dg-pin-start-shadow, 0)`), so a name that stops
 * matching produces a silently inert style rather than an error. The pin-shadow opacity pair was
 * the cleanest instance in the repo when it was renamed off its old physical spelling — two
 * writers, four readers across two kits, no type, no unit test asserting opacity, and no e2e
 * case addressing `data-pin-shadow` at all.
 *
 * Comments are stripped first: a docblock explaining which variable a kit reads is not reading
 * it.
 */

/** `'--dg-x'` as a quoted string: a `setProperty` argument or a style-object key. */
const JS_VAR = /['"](--dg-[a-z0-9-]+)['"]/g

/** `var(--dg-x` — the read half. */
const CSS_READ = /var\(\s*(--dg-[a-z0-9-]+)/g

/** `--dg-x:` at the head of a declaration — a stylesheet setting its own default. */
const CSS_DECLARE = /^\s*(--dg-[a-z0-9-]+)\s*:/gm

export type VarUsage = {
	readonly name: string
	/** Repo-relative `file:line`, so a failure is a click away from the literal. */
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

/** Package sources, minus their own unit tests — a test may name a variable nothing writes. */
const isSource = (file: string): boolean => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file)
const isStylesheet = (file: string): boolean => file.endsWith('.css')

function collect(
	roots: readonly string[],
	repoRoot: string,
	accept: (file: string) => boolean,
	pattern: RegExp,
): readonly VarUsage[] {
	const usages: VarUsage[] = []
	for (const root of roots) {
		for (const file of walk(root, accept)) {
			const at = relative(repoRoot, file)
			stripComments(readFileSync(file, 'utf8'))
				.split('\n')
				.forEach((line, index) => {
					for (const [, name] of line.matchAll(pattern)) {
						if (name !== undefined) usages.push({ name, at: `${at}:${String(index + 1)}` })
					}
				})
		}
	}
	return usages
}

/** Every `--dg-*` custom property the given packages' JavaScript writes. */
export function readJsWritten(roots: readonly string[], repoRoot: string): readonly VarUsage[] {
	return collect(roots, repoRoot, isSource, JS_VAR)
}

/** Every `--dg-*` custom property the given packages' stylesheets read through `var()`. */
export function readCssRead(roots: readonly string[], repoRoot: string): readonly VarUsage[] {
	return collect(roots, repoRoot, isStylesheet, CSS_READ)
}

/** Every `--dg-*` custom property the given packages' stylesheets declare a value for. */
export function readCssDeclared(roots: readonly string[], repoRoot: string): ReadonlySet<string> {
	return new Set(collect(roots, repoRoot, isStylesheet, CSS_DECLARE).map((usage) => usage.name))
}
