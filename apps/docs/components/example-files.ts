import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import ts from 'typescript'

import { DEFAULT_EXAMPLE_LANGUAGE, type ExampleFile } from '@/components/example-file'

/**
 * Which files an example is built from is derived from its imports, not registered by
 * hand: an example that splits its columns or its data hook into a sibling file gets
 * those files in its source panel automatically.
 *
 * Only *relative* specifiers are followed. A bare specifier (`react`, `@ez-kit/*`,
 * `shared/DataGrid`) names a package the reader installs, not a file they write.
 */

/** Extensions a relative specifier may resolve to, in resolution order. */
const RESOLVABLE_EXTENSIONS = ['.tsx', '.ts'] as const

/** Directory imports resolve to one of these, mirroring the bundler's behaviour. */
const INDEX_BASENAMES = ['index.tsx', 'index.ts'] as const

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
	'.tsx': 'tsx',
	'.ts': 'ts',
}

/** Parsed as TSX regardless of extension — a `.ts` file is a valid subset. */
const PARSE_FILE_NAME = 'example.tsx'

const RELATIVE_SPECIFIER = /^\.{1,2}\//u

/**
 * The entry file followed by every file reachable from it through relative imports,
 * breadth-first, each listed once. Files resolving outside `rootDir` are left out.
 */
export async function collectExampleFiles(entryPath: string, rootDir: string): Promise<ExampleFile[]> {
	const root = path.resolve(rootDir)
	const files: ExampleFile[] = []
	const visited = new Set<string>()
	const queue: string[] = [path.resolve(entryPath)]

	while (queue.length > 0) {
		const filePath = queue.shift()
		if (filePath === undefined || visited.has(filePath)) continue
		visited.add(filePath)

		const source = await readFile(filePath, 'utf8')
		files.push(toExampleFile(filePath, source, root))

		for (const specifier of relativeSpecifiers(source)) {
			const resolved = await resolveSpecifier(path.dirname(filePath), specifier)
			if (resolved !== undefined && isInside(root, resolved) && !visited.has(resolved)) queue.push(resolved)
		}
	}

	return files
}

function toExampleFile(filePath: string, source: string, root: string): ExampleFile {
	const extension = path.extname(filePath)

	return {
		name: path.basename(filePath),
		path: path.relative(root, filePath),
		source: source.replace(/\s+$/u, '\n'),
		language: LANGUAGE_BY_EXTENSION[extension] ?? DEFAULT_EXAMPLE_LANGUAGE,
	}
}

/** Every relative module specifier the file imports from or re-exports from. */
function relativeSpecifiers(source: string): string[] {
	const sourceFile = ts.createSourceFile(PARSE_FILE_NAME, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
	const specifiers: string[] = []

	for (const statement of sourceFile.statements) {
		const moduleSpecifier = ts.isImportDeclaration(statement)
			? statement.moduleSpecifier
			: ts.isExportDeclaration(statement)
				? statement.moduleSpecifier
				: undefined

		if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier)) continue
		if (RELATIVE_SPECIFIER.test(moduleSpecifier.text)) specifiers.push(moduleSpecifier.text)
	}

	return specifiers
}

/**
 * `undefined` when nothing on disk matches. The panel is display-only, so an import
 * that cannot be resolved is left out rather than failing the docs build.
 */
async function resolveSpecifier(fromDir: string, specifier: string): Promise<string | undefined> {
	const target = path.resolve(fromDir, specifier)

	const candidates = [
		target,
		...RESOLVABLE_EXTENSIONS.map((extension) => `${target}${extension}`),
		...INDEX_BASENAMES.map((basename) => path.join(target, basename)),
	]

	for (const candidate of candidates) {
		if (!isSupported(candidate)) continue
		if (await isFile(candidate)) return candidate
	}

	return undefined
}

/** JSON and other assets are not shown: the panel shows code the reader writes. */
function isSupported(filePath: string): boolean {
	return RESOLVABLE_EXTENSIONS.some((extension) => filePath.endsWith(extension))
}

async function isFile(filePath: string): Promise<boolean> {
	try {
		const stats = await stat(filePath)
		return stats.isFile()
	} catch {
		return false
	}
}

function isInside(root: string, target: string): boolean {
	const relative = path.relative(root, target)
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}
