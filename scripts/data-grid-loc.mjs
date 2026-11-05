#!/usr/bin/env node
// Run: node scripts/data-grid-loc.mjs [--json]
// Counts working-tree src files, not bundles or dependencies. TypeScript is already
// a root devDependency; no additional packages or network access are needed.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packages = ['core', 'react/react', 'react/shadcn', 'react/heroui']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])
const excludedDirectory =
	/^(?:\..*|node_modules|dist|coverage|__tests__|__mocks__|tests?|fixtures?|__fixtures__|examples?|stories)$/
const excludedFile =
	/(?:\.(?:test|spec|stories|config)\.[^.]+$|\.d\.ts$|^(?:test-utils|test-helpers|setup-tests|vitest\.setup)\.)/

function walk(directory) {
	return readdirSync(directory, { withFileTypes: true })
		.sort((a, b) => a.name.localeCompare(b.name))
		.flatMap((entry) => {
			const path = join(directory, entry.name)
			if (entry.isDirectory()) return excludedDirectory.test(entry.name) ? [] : walk(path)
			return entry.isFile() && extensions.has(extname(path)) && !excludedFile.test(entry.name) ? [path] : []
		})
}

function lines(text) {
	if (!text) return []
	const result = text.split(/\r\n|[\n\r\u2028\u2029]/)
	if (result.at(-1) === '') result.pop()
	return result
}

function cssComments(text) {
	const ranges = []
	let quote
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\\') {
			i++
		} else if (quote) {
			if (text[i] === quote) quote = undefined
		} else if (text[i] === '"' || text[i] === "'") {
			quote = text[i]
		} else if (text.startsWith('/*', i)) {
			const close = text.indexOf('*/', i + 2)
			const end = close === -1 ? text.length : close + 2
			ranges.push({ pos: i, end })
			i = end - 1
		}
	}
	return ranges
}

// Let the TS/TSX parser identify trivia boundaries: regexes, template literals,
// URLs and JSX text containing comment-like characters remain source code.
function sourceComments(source) {
	const ranges = new Map()
	const literals = []
	function visit(node) {
		if (
			ts.isLiteralExpression(node) ||
			ts.isTemplateHead(node) ||
			ts.isTemplateMiddle(node) ||
			ts.isTemplateTail(node) ||
			ts.isJsxText(node)
		) {
			literals.push({ pos: node.getStart(source), end: node.end })
			// JSX text includes leading whitespace; it is text rather than trivia.
			if (ts.isJsxText(node)) literals.at(-1).pos = node.pos
		}
		for (const position of [node.pos, node.end]) {
			for (const range of [
				...(ts.getLeadingCommentRanges(source.text, position) ?? []),
				...(ts.getTrailingCommentRanges(source.text, position) ?? []),
			]) {
				ranges.set(range.pos, range)
			}
		}
		for (const child of node.getChildren(source)) visit(child)
	}
	visit(source)
	return [...ranges.values()].filter(
		(range) => !literals.some((literal) => range.pos >= literal.pos && range.pos < literal.end),
	)
}

export function measure(text, filename) {
	const css = extname(filename) === '.css'
	const source = css ? undefined : ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true)
	if (source?.parseDiagnostics.length) throw new Error(`Cannot parse ${filename}`)
	const ranges = css ? cssComments(text) : sourceComments(source)
	// Mask comments while retaining line boundaries and inline code.
	const characters = text.split('')
	for (const { pos, end } of ranges) {
		for (let i = pos; i < end; i++) {
			if (!/[\r\n\u2028\u2029]/.test(characters[i])) characters[i] = ' '
		}
	}
	const original = lines(text)
	const stripped = lines(characters.join(''))
	const nonblank = original.filter((line) => line.trim()).length
	const code = stripped.filter((line) => line.trim()).length
	// A separate, compiler-formatted metric, not a subtraction from source LOC.
	// JSX is preserved; TS types and comments are erased, imports follow the
	// repo's verbatimModuleSyntax setting. Dependencies are never bundled.
	const emitted = css
		? ''
		: ts.transpileModule(text, {
				fileName: filename,
				compilerOptions: {
					target: ts.ScriptTarget.ESNext,
					module: ts.ModuleKind.ESNext,
					jsx: ts.JsxEmit.Preserve,
					removeComments: true,
					verbatimModuleSyntax: true,
				},
			}).outputText
	return {
		files: 1,
		lines: original.length,
		blank: original.length - nonblank,
		commentOnly: nonblank - code,
		code,
		cssCode: css ? code : 0,
		emittedJsCode: lines(emitted).filter((line) => line.trim()).length,
	}
}

function sum(files) {
	return Object.fromEntries(
		['files', 'lines', 'blank', 'commentOnly', 'code', 'cssCode', 'emittedJsCode'].map((key) => [
			key,
			files.reduce((total, file) => total + file[key], 0),
		]),
	)
}

function main() {
	const files = packages.flatMap((name) =>
		walk(join(root, 'packages/data-grid', name, 'src')).map((path) => ({
			package: name,
			path: relative(root, path),
			vendored: relative(root, path).startsWith('packages/data-grid/react/shadcn/src/components/ui/'),
			...measure(readFileSync(path, 'utf8'), path),
		})),
	)
	const report = {
		packages: Object.fromEntries(packages.map((name) => [name, sum(files.filter((file) => file.package === name))])),
		total: sum(files),
		vendoredShadcn: sum(files.filter((file) => file.vendored)),
		excludingVendored: sum(files.filter((file) => !file.vendored)),
		files,
	}
	if (process.argv.includes('--json')) {
		console.log(JSON.stringify(report, null, 2))
		return
	}
	console.log('Data-grid runtime source: src/**/*.{ts,tsx,js,jsx,css}')
	console.log('Excludes tests, test helpers, declarations, fixtures, examples, configs and hidden dirs.')
	console.table({
		...report.packages,
		TOTAL: report.total,
		'vendored shadcn (included above)': report.vendoredShadcn,
		'TOTAL excluding vendored': report.excludingVendored,
	})
	console.log('lines = physical lines, including comments and blanks; code = neither comment-only nor blank.')
	console.log('Inline-comment lines count as code. Source code includes TS types and CSS.')
	console.log('emittedJsCode = nonblank compiler-formatted JS/JSX lines after type/comment erasure; excludes CSS.')
	console.log('\nLargest source files by code lines:')
	console.table(
		[...files]
			.sort((a, b) => b.code - a.code)
			.slice(0, 10)
			.map(({ path, code }) => ({ path, code })),
	)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
