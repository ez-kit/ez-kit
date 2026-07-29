import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readDocTables, type DocTable } from './docs-options/mdx-tables'
import {
	OPTION_EXCEPTIONS,
	OptionColumn,
	PAGE_ENTRIES,
	type DocPage,
	type OptionTable,
	type PageEntry,
} from './docs-options/page-type-map'
import {
	OptionTypeResolver,
	PATH_SEPARATOR,
	PathResolutionKind,
	type PathResolution,
	type TypeRef,
} from './docs-options/type-resolver'

/**
 * Guards the data-grid docs against fabricated option names.
 *
 * A documented option is legal only if it is a real key of the type that
 * governs its table, as answered by `ts.TypeChecker`. This is deliberately not
 * a text search: `enableSorting`, `enableColumnFilters`, `enableRowSelection`
 * and `manualPagination` all *appear* in the core sources (as internal TanStack
 * options the core sets itself) while being illegal in the public config — the
 * exact defect class the #171-#174 audit found on 19 of 47 pages.
 *
 * Coverage is the explicit map in `docs-options/page-type-map.ts`. Extending it
 * is documented there and in the repo `CLAUDE.md`.
 */

const DOCS_ROOT = resolve(__dirname, '..')

// The `ts.Program` is built once here, at module scope — i.e. during Vitest's
// collect phase, which no per-test timeout covers. The individual `it` blocks
// only walk the already-resolved types and run in milliseconds, so none of them
// needs a raised timeout.
const resolver = OptionTypeResolver.create(
	PAGE_ENTRIES.flatMap((entry) => entry.optionTables).flatMap((table) => table.roots),
)

const tablesByPage = new Map<DocPage, readonly DocTable[]>(
	PAGE_ENTRIES.map((entry) => [entry.page, readTablesFor(entry)]),
)

function readTablesFor(entry: PageEntry): readonly DocTable[] {
	const columnByHeading = new Map(
		entry.optionTables.map((table) => [table.heading, table.column ?? OptionColumn.First] as const),
	)
	return readDocTables(resolve(DOCS_ROOT, entry.page), (heading) => columnByHeading.get(heading) ?? OptionColumn.First)
}

function tableOf(page: DocPage, heading: string): DocTable | undefined {
	return tablesByPage.get(page)?.find((table) => table.heading === heading)
}

function isExcepted(page: DocPage, heading: string, name: string): boolean {
	return OPTION_EXCEPTIONS.some(
		(exception) => exception.page === page && exception.heading === heading && exception.name === name,
	)
}

/** Renders one failure so a human can fix the doc without opening the type. */
function describeFailure(page: DocPage, table: OptionTable, line: number, name: string, best: PathResolution): string {
	const rootNames = table.roots.map(typeRefLabel).join(' | ')
	const header = `${page}:${String(line)} — under "${table.heading}", documented option \`${name}\` is not a legal key of ${rootNames}.`

	if (best.kind === PathResolutionKind.NotAnObject) {
		const prefix = best.resolvedPrefix.join(PATH_SEPARATOR)
		return `${header}\n  \`${prefix}\` is not an object type, so \`${best.unknownSegment}\` cannot be a key of it.`
	}
	if (best.kind === PathResolutionKind.UnknownKey) {
		const at = best.resolvedPrefix.length === 0 ? 'the root' : `\`${best.resolvedPrefix.join(PATH_SEPARATOR)}\``
		return [
			header,
			`  Unknown segment \`${best.unknownSegment}\` at ${at}.`,
			`  Did you mean: ${best.suggestions.map((key) => `\`${key}\``).join(', ')}?`,
			`  Legal keys there: ${best.legalKeys.join(', ')}`,
			`  If this row intentionally documents something that is not a config key, add it to OPTION_EXCEPTIONS with a reason.`,
		].join('\n')
	}
	return header
}

function typeRefLabel(ref: TypeRef): string {
	return `${ref.name}${ref.typeArgs ?? ''} (${ref.module})`
}

/** Prefers the most informative resolution when a table has several candidate roots. */
function bestFailure(results: readonly PathResolution[]): PathResolution {
	return (
		results.find((result) => result.kind === PathResolutionKind.UnknownKey) ??
		results[0] ?? { kind: PathResolutionKind.Legal }
	)
}

type TableCheck = {
	readonly failures: readonly string[]
	/** How many names were actually resolved — a table that checks nothing is a hole. */
	readonly checkedCount: number
}

function checkTable(page: DocPage, table: OptionTable): TableCheck {
	const found = tableOf(page, table.heading)
	if (found === undefined) {
		return { failures: [`${page} — no table found under heading "${table.heading}"`], checkedCount: 0 }
	}

	const failures: string[] = []
	let checkedCount = 0
	for (const row of found.rows) {
		for (const name of row.codeSpans) {
			if (isExcepted(page, table.heading, name)) continue

			if (table.stripPrefix !== undefined && !name.startsWith(table.stripPrefix)) {
				failures.push(
					`${page}:${String(row.line)} — under "${table.heading}", \`${name}\` does not start with the table's documented ` +
						`prefix \`${table.stripPrefix}\`. Either fix the row or add an OPTION_EXCEPTIONS entry with a reason.`,
				)
				continue
			}
			const path = (table.stripPrefix === undefined ? name : name.slice(table.stripPrefix.length)).split(PATH_SEPARATOR)

			const results = table.roots.map((root) => resolver.resolve(root, path))
			checkedCount++
			if (results.some((result) => result.kind === PathResolutionKind.Legal)) continue
			failures.push(describeFailure(page, table, row.line, name, bestFailure(results)))
		}
	}
	return { failures, checkedCount }
}

describe('data-grid docs option names', () => {
	it('every mapped page maps every table it contains', () => {
		const unclassified: string[] = []
		for (const entry of PAGE_ENTRIES) {
			const classified = new Set([
				...entry.optionTables.map((table) => table.heading),
				...entry.nonOptionTables.map((table) => table.heading),
			])
			for (const table of tablesByPage.get(entry.page) ?? []) {
				if (!classified.has(table.heading)) {
					unclassified.push(
						`${entry.page}:${String(table.headerLine)} — table under "${table.heading}" is in neither ` +
							`optionTables nor nonOptionTables. Classify it in page-type-map.ts.`,
					)
				}
			}
		}
		expect(unclassified, `\n${unclassified.join('\n')}\n`).toEqual([])
	})

	it('no page carries two tables under the same heading', () => {
		// A heading addresses at most one table: `tableOf()` takes the first match
		// and the unclassified-table check above matches by heading text, so a
		// second table under a repeated heading would be silently never checked.
		const duplicated: string[] = []
		for (const entry of PAGE_ENTRIES) {
			const seen = new Set<string>()
			for (const table of tablesByPage.get(entry.page) ?? []) {
				if (seen.has(table.heading)) {
					duplicated.push(
						`${entry.page}:${String(table.headerLine)} — a second table sits under the heading ` +
							`"${table.heading}". Only the first is ever checked; give it a distinct heading.`,
					)
				}
				seen.add(table.heading)
			}
		}
		expect(duplicated, `\n${duplicated.join('\n')}\n`).toEqual([])
	})

	it('the map references no heading that does not exist on the page', () => {
		const missing: string[] = []
		for (const entry of PAGE_ENTRIES) {
			const present = new Set((tablesByPage.get(entry.page) ?? []).map((table) => table.heading))
			for (const heading of [
				...entry.optionTables.map((table) => table.heading),
				...entry.nonOptionTables.map((table) => table.heading),
			]) {
				if (!present.has(heading)) missing.push(`${entry.page} — mapped heading "${heading}" has no table`)
			}
		}
		expect(missing, `\n${missing.join('\n')}\n`).toEqual([])
	})

	it('every exception points at a mapped table and at a row that still names it', () => {
		// Both halves matter: an exception aimed at an unmapped table does
		// nothing, and one whose row is gone silently pre-approves any future row
		// that happens to reuse the name.
		const orphaned: string[] = []
		for (const exception of OPTION_EXCEPTIONS) {
			const entry = PAGE_ENTRIES.find((candidate) => candidate.page === exception.page)
			if (entry?.optionTables.some((table) => table.heading === exception.heading) !== true) {
				orphaned.push(
					`${exception.page} — exception for "${exception.heading}" / \`${exception.name}\` names no mapped option table`,
				)
				continue
			}
			const table = tableOf(exception.page, exception.heading)
			if (table?.rows.some((row) => row.codeSpans.includes(exception.name)) !== true) {
				orphaned.push(
					`${exception.page} — orphaned exception: no row under "${exception.heading}" names ` +
						`\`${exception.name}\` any more. Delete the OPTION_EXCEPTIONS entry.`,
				)
			}
		}
		expect(orphaned, `\n${orphaned.join('\n')}\n`).toEqual([])
	})

	it('every mapped option table checks exactly as many names as the map records', () => {
		// A bare "checks at least one" guard would survive a parser regression
		// that silently dropped most rows of a table; the pinned count would not.
		const mismatched = PAGE_ENTRIES.flatMap((entry) =>
			entry.optionTables
				.map((table) => ({ table, checkedCount: checkTable(entry.page, table).checkedCount }))
				.filter(({ table, checkedCount }) => checkedCount !== table.expectedCount)
				.map(
					({ table, checkedCount }) =>
						`${entry.page} — table "${table.heading}" resolved ${String(checkedCount)} option names, ` +
						`expected ${String(table.expectedCount)}. If the table really changed, update expectedCount ` +
						`in page-type-map.ts; otherwise the parser dropped rows.`,
				),
		)
		expect(mismatched, `\n${mismatched.join('\n')}\n`).toEqual([])
	})

	it('every documented option name is a real key of its type', () => {
		const failures = PAGE_ENTRIES.flatMap((entry) =>
			entry.optionTables.flatMap((table) => checkTable(entry.page, table).failures),
		)
		expect(failures, `\n\n${failures.join('\n\n')}\n`).toEqual([])
	})
})
