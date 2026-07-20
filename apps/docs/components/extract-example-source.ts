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

const NEWLINE = /\n/gu

/** Two newlines is one blank line — the most a gap between statements may keep. */
const MAX_SEPARATOR_NEWLINES = 2

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

	const exportedNames = declarations.filter((declaration) => isExported(declaration.statement))
	if (exportedNames.length <= 1) return source

	if (hasUnsupportedDeclaration(sourceFile)) return source

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
		for (const name of declaredNames(statement)) declarations.push({ name, statement })
	}

	return declarations
}

/**
 * Every module-scope name a statement introduces. A name missed here is a name
 * `collectReachable` cannot find, which would drop the declaration silently —
 * so unknown statement kinds are reported rather than ignored (see
 * `hasUnsupportedDeclaration`).
 */
function declaredNames(statement: ts.Statement): string[] {
	if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
		return statement.name ? [statement.name.text] : []
	}

	if (ts.isVariableStatement(statement)) {
		return statement.declarationList.declarations.flatMap((declaration) => bindingNames(declaration.name))
	}

	if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) {
		return [statement.name.text]
	}

	if (ts.isModuleDeclaration(statement) && ts.isIdentifier(statement.name)) return [statement.name.text]

	return []
}

/** Flattens a binding name, so destructured declarations register every name they bind. */
function bindingNames(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) return [name.text]

	return name.elements.flatMap((element) => (ts.isBindingElement(element) ? bindingNames(element.name) : []))
}

/**
 * True when a statement declares something but `declaredNames` yields nothing —
 * i.e. a form this module does not understand. Slicing a file like that could
 * drop a declaration the target needs, and since the result is only ever
 * displayed, nothing downstream would fail. Returning the file whole is wrong in
 * a way a reader can see, which is the better failure.
 */
function hasUnsupportedDeclaration(sourceFile: ts.SourceFile): boolean {
	return sourceFile.statements.some((statement) => {
		if (ts.isImportDeclaration(statement) || isDirective(statement)) return false
		return declaredNames(statement).length === 0
	})
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
 * Statement text plus the comments it owns — the ones leading it, and any note
 * trailing it on its own line — so a comment lives and dies with the declaration
 * it describes. Everything before that (whitespace, and comments owned by a
 * statement that was dropped) collapses to plain newlines, which keeps the
 * file's grouping without ever rewriting code.
 */
function sliceStatement(statement: ts.Statement, sourceFile: ts.SourceFile): string {
	const text = sourceFile.text
	const fullStart = statement.getFullStart()
	const start = ownedStart(text, fullStart, statement.getStart(sourceFile))

	return separator(text.slice(fullStart, start)) + text.slice(start, ownedEnd(text, statement.getEnd()))
}

/**
 * Where this statement's own text begins: at its first leading comment, else at
 * its first token. A note trailing the *previous* statement on that statement's
 * line is not among these — `getLeadingCommentRanges` starts collecting only
 * past the first newline, and `ownedEnd` gives that note to the statement it
 * trails. The two sets never overlap, so no comment is emitted twice or lost.
 */
function ownedStart(text: string, fullStart: number, tokenStart: number): number {
	const comments = ts.getLeadingCommentRanges(text, fullStart) ?? []
	return comments[0]?.pos ?? tokenStart
}

/**
 * Where this statement's own text ends: after a note trailing it on the same
 * line. `ownedStart` disowns exactly these on behalf of the next statement, so
 * without this they would belong to nobody and vanish.
 */
function ownedEnd(text: string, end: number): number {
	const trailing = ts.getTrailingCommentRanges(text, end) ?? []
	return trailing[trailing.length - 1]?.end ?? end
}

/** The gap before a statement, reduced to at most one blank line. */
function separator(gap: string): string {
	const newlines = (gap.match(NEWLINE) ?? []).length
	return '\n'.repeat(Math.min(newlines, MAX_SEPARATOR_NEWLINES))
}

/**
 * `'use client'` and friends: parsed as ordinary statements, but they are only
 * directives at the head of the file and they must stay there.
 */
function directivePrologue(sourceFile: ts.SourceFile, source: string): string {
	let end = 0
	for (const statement of sourceFile.statements) {
		if (!isDirective(statement)) break
		end = statement.getEnd()
	}

	// No trailing newline: the next statement's own gap supplies the spacing.
	return source.slice(0, end)
}

function isDirective(statement: ts.Statement): boolean {
	return ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)
}

/**
 * Only an `export` modifier counts. An example published via `export { X }` or
 * `export default` reads as zero exports here, so its file is returned whole —
 * visibly unsliced rather than silently wrong. Every example file declares its
 * examples as `export function X`.
 */
function isExported(statement: ts.Statement): boolean {
	return ts.canHaveModifiers(statement)
		? (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)
		: false
}

/**
 * Normalises the file ending only. Gaps left by removed statements are already
 * collapsed in `sliceStatement`, which can tell trivia from code — this cannot,
 * so it must not touch the body.
 */
function format(source: string): string {
	return source.trim() + '\n'
}
