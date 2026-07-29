import { readFileSync } from 'node:fs'

import type { OptionColumn } from './page-type-map'

/**
 * Minimal reader for the GFM option tables in the data-grid docs.
 *
 * It deliberately understands only what those pages actually use: ATX headings,
 * pipe tables, and fenced code blocks (skipped, so a table drawn inside a code
 * sample is never mistaken for documentation).
 */

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*$/
const FENCE_PATTERN = /^\s*(?:```|~~~)/
const TABLE_ROW_PATTERN = /^\s*\|/
/** GFM delimiter row, e.g. `| ------ | :--- |`. Its presence is what makes a block a table. */
const TABLE_DELIMITER_PATTERN = /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/
const CODE_SPAN_PATTERN = /`([^`]+)`/g
/** Column separator: a `|` that is not escaped as `\|` (an escaped pipe is cell *content*). */
const CELL_SEPARATOR_PATTERN = /(?<!\\)\|/
const LEADING_EDGE_PATTERN = /^\|/
const TRAILING_EDGE_PATTERN = /(?<!\\)\|$/
/** Turns the GFM escape `\|` back into the literal pipe it stands for. */
const ESCAPED_PIPE_PATTERN = /\\\|/g
/** Heading text used for a table that sits before any heading on the page. */
const NO_HEADING = '(page root)'

export type DocTableRow = {
	/** 1-based line number of the row in the source file. */
	readonly line: number
	/** Raw text of the addressed cell, before code-span extraction. */
	readonly rawCell: string
	/** Every `` `code span` `` found in the addressed cell, in order. */
	readonly codeSpans: readonly string[]
}

export type DocTable = {
	/** Text of the nearest preceding heading, markdown markup included (e.g. "`sorting`"). */
	readonly heading: string
	/** 1-based line number of the table's header row. */
	readonly headerLine: number
	readonly rows: readonly DocTableRow[]
}

function splitCells(line: string): string[] {
	const trimmed = line.trim()
	const withoutEdges = trimmed.replace(LEADING_EDGE_PATTERN, '').replace(TRAILING_EDGE_PATTERN, '')
	return withoutEdges.split(CELL_SEPARATOR_PATTERN).map((cell) => cell.replace(ESCAPED_PIPE_PATTERN, '|').trim())
}

/** Extracts the `` `code spans` `` from a cell — the only thing that can name an option. */
function codeSpansOf(cell: string): readonly string[] {
	return [...cell.matchAll(CODE_SPAN_PATTERN)].map((match) => (match[1] ?? '').trim()).filter((text) => text.length > 0)
}

/**
 * Reads every pipe table in an MDX file, tagged with the heading above it.
 *
 * @param columnIndexByHeading Zero-based index of the column that names the
 *   option, per heading. Defaults to the first column; `controlled-state.mdx`
 *   names its state keys in the second one.
 */
export function readDocTables(filePath: string, columnIndexByHeading: (heading: string) => OptionColumn): DocTable[] {
	const lines = readFileSync(filePath, 'utf8').split('\n')
	const tables: DocTable[] = []
	let heading = NO_HEADING
	let insideFence = false

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] ?? ''

		if (FENCE_PATTERN.test(line)) {
			insideFence = !insideFence
			continue
		}
		if (insideFence) continue

		const headingMatch = HEADING_PATTERN.exec(line)
		if (headingMatch !== null) {
			heading = headingMatch[2] ?? NO_HEADING
			continue
		}

		if (!TABLE_DELIMITER_PATTERN.test(line)) continue

		// The delimiter row is at `index`; the header row is the line before it.
		const headerLine = index
		const columnIndex = columnIndexByHeading(heading)
		const rows: DocTableRow[] = []
		for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex++) {
			const bodyLine = lines[bodyIndex] ?? ''
			if (!TABLE_ROW_PATTERN.test(bodyLine)) break
			const rawCell = splitCells(bodyLine)[columnIndex] ?? ''
			rows.push({ line: bodyIndex + 1, rawCell, codeSpans: codeSpansOf(rawCell) })
			index = bodyIndex
		}

		tables.push({ heading, headerLine: headerLine, rows })
	}

	return tables
}
