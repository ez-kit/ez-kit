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
/** Vitest's 5s default is not enough to build a `ts.Program` over the package `.d.ts` graph. */
const PROGRAM_TIMEOUT_MS = 120_000

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
	it(
		'every mapped page maps every table it contains',
		() => {
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
		},
		PROGRAM_TIMEOUT_MS,
	)

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

	it('every exception points at a mapped table', () => {
		const orphaned = OPTION_EXCEPTIONS.filter((exception) => {
			const entry = PAGE_ENTRIES.find((candidate) => candidate.page === exception.page)
			return entry?.optionTables.some((table) => table.heading === exception.heading) !== true
		}).map((exception) => `${exception.page} — exception for "${exception.heading}" / \`${exception.name}\``)
		expect(orphaned, `\n${orphaned.join('\n')}\n`).toEqual([])
	})

	it('every mapped option table actually checks at least one name', () => {
		// Without this, a parser regression (or a table that is entirely
		// exceptions) would leave the suite vacuously green.
		const empty = PAGE_ENTRIES.flatMap((entry) =>
			entry.optionTables
				.filter((table) => checkTable(entry.page, table).checkedCount === 0)
				.map((table) => `${entry.page} — table "${table.heading}" resolved zero option names`),
		)
		expect(empty, `\n${empty.join('\n')}\n`).toEqual([])
	})

	it(
		'every documented option name is a real key of its type',
		() => {
			const failures = PAGE_ENTRIES.flatMap((entry) =>
				entry.optionTables.flatMap((table) => checkTable(entry.page, table).failures),
			)
			expect(failures, `\n\n${failures.join('\n\n')}\n`).toEqual([])
		},
		PROGRAM_TIMEOUT_MS,
	)
})
