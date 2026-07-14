import ts from 'typescript'

/**
 * Several example files declare more than one example (the manifest maps each
 * `id` to a `sourceFile` + `exportName`), so reading the file verbatim would
 * show every example's component in the source panel instead of just the one
 * being rendered.
 *
 * Slicing keeps the directive prologue (`'use client'`), the imports that are
 * still referenced, and the target export together with the module-scope
 * declarations it transitively depends on. Sibling examples — and the
 * declarations only they use — fall away because nothing reachable from the
 * target refers to them.
 */

/** Parsed as TSX: every example file is a `.tsx` component module. */
const SOURCE_FILE_NAME = 'example.tsx'

/** Three or more consecutive newlines — left behind where a sibling was cut out. */
const EXCESS_BLANK_LINES = /\n{3,}/gu

/** A top-level declaration that can be referenced by name from another statement. */
type NamedStatement = {
	name: string
	statement: ts.Statement
}

/**
 * Reduces a multi-example source file to the single example `exportName`.
 *
 * Returns `source` unchanged when the file declares only that one export, or
 * when `exportName` is not found in it — a file that needs no slicing is
 * already correct, and an unknown name is not worth failing a docs build over.
 */
export function extractExampleSource(source: string, exportName: string): string {
	const sourceFile = ts.createSourceFile(SOURCE_FILE_NAME, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

	const declarations = collectTopLevelDeclarations(sourceFile)
	const target = declarations.find((declaration) => declaration.name === exportName)
	if (!target) return source

	const exportCount = sourceFile.statements.filter(isExported).length
	if (exportCount <= 1) return source

	const kept = collectReachable(target, declarations)
	const referenced = collectIdentifiers(kept)

	const statements = sourceFile.statements.filter((statement) => {
		if (ts.isImportDeclaration(statement)) return isImportUsed(statement, referenced)
		return kept.has(statement)
	})

	const slices = statements.map((statement) => sliceStatement(statement, sourceFile))
	return format(directivePrologue(sourceFile, source) + slices.join(''))
}

/** Maps each named top-level declaration to the statement that declares it. */
function collectTopLevelDeclarations(sourceFile: ts.SourceFile): NamedStatement[] {
	const declarations: NamedStatement[] = []

	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
			if (statement.name) declarations.push({ name: statement.name.text, statement })
			continue
		}

		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) declarations.push({ name: declaration.name.text, statement })
			}
			continue
		}

		if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
			declarations.push({ name: statement.name.text, statement })
		}
	}

	return declarations
}

/**
 * Walks out from the target export, pulling in every module-scope declaration it
 * names — then everything those name in turn — until the set stops growing.
 */
function collectReachable(target: NamedStatement, declarations: NamedStatement[]): Set<ts.Statement> {
	const byName = new Map(declarations.map((declaration) => [declaration.name, declaration.statement]))
	const kept = new Set<ts.Statement>([target.statement])
	const queue: ts.Statement[] = [target.statement]

	while (queue.length > 0) {
		const statement = queue.pop()
		if (!statement) break

		for (const identifier of collectIdentifiers(new Set([statement]))) {
			const declaration = byName.get(identifier)
			if (!declaration || kept.has(declaration)) continue
			kept.add(declaration)
			queue.push(declaration)
		}
	}

	return kept
}

/**
 * Every identifier appearing anywhere in `statements`, including property names
 * and type positions. Deliberately over-inclusive: keeping a declaration that
 * only looked reachable is harmless noise, dropping a needed one is a bug.
 */
function collectIdentifiers(statements: Set<ts.Statement>): Set<string> {
	const identifiers = new Set<string>()

	const visit = (node: ts.Node): void => {
		if (ts.isIdentifier(node)) identifiers.add(node.text)
		ts.forEachChild(node, visit)
	}

	for (const statement of statements) visit(statement)
	return identifiers
}

/**
 * Keeps an import when any name it binds is still referenced. Individual unused
 * specifiers are left alone — pruning them would mean reprinting the clause and
 * losing the file's original formatting.
 */
function isImportUsed(statement: ts.ImportDeclaration, referenced: Set<string>): boolean {
	const clause = statement.importClause
	if (!clause) return true // Side-effect import — no bindings to check, always keep.

	if (clause.name && referenced.has(clause.name.text)) return true

	const bindings = clause.namedBindings
	if (!bindings) return false

	if (ts.isNamespaceImport(bindings)) return referenced.has(bindings.name.text)
	return bindings.elements.some((element) => referenced.has(element.name.text))
}

/**
 * Statement text including its leading trivia, so each kept statement carries
 * its own comments and a sibling's section comment leaves with the sibling.
 */
function sliceStatement(statement: ts.Statement, sourceFile: ts.SourceFile): string {
	return sourceFile.text.slice(statement.getFullStart(), statement.getEnd())
}

/** `'use client'` and friends: parsed as statements, but they must lead the file. */
function directivePrologue(sourceFile: ts.SourceFile, source: string): string {
	const directives = sourceFile.statements.filter(
		(statement) => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression),
	)
	if (directives.length === 0) return ''

	const last = directives[directives.length - 1]
	if (!last) return ''

	return source.slice(0, last.getEnd()) + '\n'
}

function isExported(statement: ts.Statement): boolean {
	return ts.canHaveModifiers(statement)
		? (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)
		: false
}

/** Collapses the gaps left by removed statements and normalises the file ending. */
function format(source: string): string {
	return source.replace(EXCESS_BLANK_LINES, '\n\n').trim() + '\n'
}
