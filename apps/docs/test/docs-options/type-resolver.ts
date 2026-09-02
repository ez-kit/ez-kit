import { resolve } from 'node:path'

import ts from 'typescript'

/**
 * Resolves documented option names against the *real* TypeScript types of the
 * data-grid and form packages, using the TypeScript Compiler API.
 *
 * Why the Compiler API and not a grep for the identifier: internal TanStack
 * Table options such as `enableSorting`, `enableColumnFilters`,
 * `enableRowSelection` and `manualPagination` literally appear in
 * `packages/data-grid/core/src/create-table.ts` — the core sets them itself as
 * *internal* TanStack options. They are **not** legal keys of the public config
 * types. A substring check would happily declare them valid, which is exactly
 * the defect class this checker exists to kill. So legality is always answered
 * by `ts.TypeChecker.getPropertiesOfType()`, never by text search.
 */

/** Package the documented type is imported from, exactly as a consumer would import it. */
export enum TypeModule {
	/** `@ez-kit/data-grid-core` — headless layer; owns the per-feature config types. */
	Core = '@ez-kit/data-grid-core',
	/** `@ez-kit/data-grid-react` — React adapter; owns `UseDataGridConfig` and the `React*Config` variants. */
	React = '@ez-kit/data-grid-react',
	/** `@ez-kit/form-core` — framework-agnostic form layer; owns the schema node and validation types. */
	FormCore = '@ez-kit/form-core',
	/** `@ez-kit/form-react` — React form adapter; owns the kit contract, the consumer field props and the renderer props. */
	FormReact = '@ez-kit/form-react',
}

/** A named exported type, plus the type arguments it needs to be instantiated. */
export type TypeRef = {
	readonly module: TypeModule
	readonly name: string
	/** Type-argument list source, e.g. `'<DocRow>'`. Omit for non-generic types. */
	readonly typeArgs?: string
}

/** Root directory of the docs app (this file lives at `<docs>/test/docs-options/`). */
const DOCS_ROOT = resolve(__dirname, '../..')
const TSCONFIG_FILE_NAME = 'tsconfig.json'
/** Synthetic file name for the probe module; never written to disk. */
const PROBE_FILE_NAME = '__docs-option-type-probe__.ts'
const PROBE_FILE_PATH = resolve(DOCS_ROOT, PROBE_FILE_NAME)
const PROBE_ALIAS_PREFIX = 'DocsOptionProbe'
/** Row shape used to instantiate generic config types (`UseDataGridConfig<TRow>` etc.). */
const PROBE_ROW_TYPE_NAME = 'DocsProbeRow'
const PROBE_ROW_DECLARATION = `type ${PROBE_ROW_TYPE_NAME} = { id: string }`
/** Type-argument list for row-generic config types, e.g. `UseDataGridConfig<TRow>`. */
export const ROW_TYPE_ARGS = `<${PROBE_ROW_TYPE_NAME}>`
/**
 * Type-argument list for the form packages' `<TFormData, TValue>` prop types, e.g.
 * `BaseFieldProps<TFormData, TValue>`. The value type only narrows `name`, never the key
 * set, so any concrete scalar answers the same question — `string` is the arbitrary pick.
 */
export const FORM_VALUE_TYPE_ARGS = `<${PROBE_ROW_TYPE_NAME}, string>`
/**
 * Type-argument list for the form types that mirror TanStack's twelve-parameter validator
 * list verbatim (`KitFormApi`, `FormRendererUncontrolledProps`). Every validator slot is
 * `undefined` and the submit meta `never` — the least specific instantiation, which is what
 * the overloads collapse to and which leaves the key set untouched.
 */
export const FORM_API_TYPE_ARGS = `<${PROBE_ROW_TYPE_NAME}, ${new Array(10).fill('undefined').join(', ')}, never>`
export const PATH_SEPARATOR = '.'
/** How many suggestions a "did you mean" hint lists. */
const SUGGESTION_LIMIT = 5

/** Result of walking a dotted option path against a root type. */
export type PathResolution =
	| { readonly kind: PathResolutionKind.Legal }
	| {
			readonly kind: PathResolutionKind.UnknownKey
			/** Path prefix that did resolve, e.g. `pagination` for a bad `pagination.nope`. */
			readonly resolvedPrefix: readonly string[]
			/** The segment that is not a legal key. */
			readonly unknownSegment: string
			/** Every legal key at that position. */
			readonly legalKeys: readonly string[]
			/** Closest legal keys to `unknownSegment`, best first. */
			readonly suggestions: readonly string[]
	  }
	| {
			readonly kind: PathResolutionKind.NotAnObject
			readonly resolvedPrefix: readonly string[]
			readonly unknownSegment: string
	  }

export enum PathResolutionKind {
	Legal = 'legal',
	UnknownKey = 'unknown-key',
	NotAnObject = 'not-an-object',
}

function typeRefKey(ref: TypeRef): string {
	return `${ref.module}#${ref.name}${ref.typeArgs ?? ''}`
}

function buildProbeSource(refs: readonly TypeRef[]): { source: string; aliasByKey: ReadonlyMap<string, string> } {
	const aliasByKey = new Map<string, string>()
	const imports: string[] = []
	const aliases: string[] = []

	refs.forEach((ref, index) => {
		const key = typeRefKey(ref)
		if (aliasByKey.has(key)) return
		const imported = `${PROBE_ALIAS_PREFIX}Import${String(index)}`
		const alias = `${PROBE_ALIAS_PREFIX}${String(index)}`
		aliasByKey.set(key, alias)
		imports.push(`import type { ${ref.name} as ${imported} } from '${ref.module}'`)
		aliases.push(`type ${alias} = ${imported}${ref.typeArgs ?? ''}`)
	})

	return {
		source: [...imports, '', PROBE_ROW_DECLARATION, '', ...aliases, ''].join('\n'),
		aliasByKey,
	}
}

function createProbeProgram(source: string): ts.Program {
	const configPath = resolve(DOCS_ROOT, TSCONFIG_FILE_NAME)
	const configFile = ts.readConfigFile(configPath, (fileName) => ts.sys.readFile(fileName))
	if (configFile.error !== undefined) {
		throw new Error(`Cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`)
	}
	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, DOCS_ROOT)
	if (parsed.errors.length > 0) {
		const messages = parsed.errors
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
			.join('\n')
		throw new Error(`Cannot parse ${configPath}: ${messages}`)
	}

	const host = ts.createCompilerHost(parsed.options, true)
	const readFile = host.readFile.bind(host)
	const fileExists = host.fileExists.bind(host)
	const getSourceFile = host.getSourceFile.bind(host)

	host.fileExists = (fileName) => fileName === PROBE_FILE_PATH || fileExists(fileName)
	host.readFile = (fileName) => (fileName === PROBE_FILE_PATH ? source : readFile(fileName))
	host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) =>
		fileName === PROBE_FILE_PATH
			? ts.createSourceFile(fileName, source, languageVersion, true)
			: getSourceFile(fileName, languageVersion, onError, shouldCreate)

	// Only the probe file is a root — the docs app's own sources are irrelevant
	// here and would make the program needlessly large.
	return ts.createProgram([PROBE_FILE_PATH], parsed.options, host)
}

/**
 * Walks a dotted option path (`pagination.variant`) through the type graph,
 * one property lookup at a time, and reports the first segment that is not a
 * legal key together with the legal alternatives at that position.
 */
export class OptionTypeResolver {
	private readonly checker: ts.TypeChecker
	private readonly rootTypeByKey = new Map<string, ts.Type>()

	private constructor(checker: ts.TypeChecker, rootTypeByKey: Map<string, ts.Type>) {
		this.checker = checker
		this.rootTypeByKey = rootTypeByKey
	}

	/** Builds one `ts.Program` covering every root type the page map references. */
	static create(refs: readonly TypeRef[]): OptionTypeResolver {
		const { source, aliasByKey } = buildProbeSource(refs)
		const program = createProbeProgram(source)
		const checker = program.getTypeChecker()
		const probeFile = program.getSourceFile(PROBE_FILE_PATH)
		if (probeFile === undefined) throw new Error(`Probe source file ${PROBE_FILE_PATH} was not added to the program`)

		const aliasNodeByName = new Map<string, ts.TypeAliasDeclaration>()
		for (const statement of probeFile.statements) {
			if (ts.isTypeAliasDeclaration(statement)) aliasNodeByName.set(statement.name.text, statement)
		}

		const rootTypeByKey = new Map<string, ts.Type>()
		for (const [key, alias] of aliasByKey) {
			const node = aliasNodeByName.get(alias)
			if (node === undefined) throw new Error(`Probe alias ${alias} for ${key} was not emitted`)
			const type = checker.getTypeAtLocation(node.type)
			const properties = checker.getPropertiesOfType(type)
			if (properties.length === 0) {
				throw new Error(
					`Type ${key} resolved to zero properties. Either the packages are not built ` +
						`(exports resolve to ./dist — run \`pnpm build\` first) or the type name is wrong.`,
				)
			}
			rootTypeByKey.set(key, type)
		}

		return new OptionTypeResolver(checker, rootTypeByKey)
	}

	resolve(ref: TypeRef, path: readonly string[]): PathResolution {
		let current = this.rootType(ref)
		const resolvedPrefix: string[] = []

		for (const segment of path) {
			const keys = this.sortedKeys(current)
			if (keys.length === 0) {
				return { kind: PathResolutionKind.NotAnObject, resolvedPrefix: [...resolvedPrefix], unknownSegment: segment }
			}
			const property = this.propertiesOf(current).find((symbol) => symbol.getName() === segment)
			if (property === undefined) {
				return {
					kind: PathResolutionKind.UnknownKey,
					resolvedPrefix: [...resolvedPrefix],
					unknownSegment: segment,
					legalKeys: keys,
					suggestions: suggestKeys(segment, keys),
				}
			}
			resolvedPrefix.push(segment)
			current = this.checker.getNonNullableType(this.checker.getTypeOfSymbol(property))
		}

		return { kind: PathResolutionKind.Legal }
	}

	private rootType(ref: TypeRef): ts.Type {
		const type = this.rootTypeByKey.get(typeRefKey(ref))
		if (type === undefined) throw new Error(`Type ${typeRefKey(ref)} was not registered with the resolver`)
		return type
	}

	/**
	 * Properties of a type, looking *through* unions.
	 *
	 * Config slots are declared as `boolean | SomeConfig` (`true` = enable with
	 * defaults). `getPropertiesOfType()` on such a union returns only the props
	 * common to every constituent — i.e. nothing useful — so primitive
	 * constituents are dropped and the object-like ones are merged. A key is
	 * legal if *some* shape the slot accepts declares it.
	 */
	private propertiesOf(type: ts.Type): readonly ts.Symbol[] {
		const constituents = type.isUnion() ? type.types : [type]
		const merged = new Map<string, ts.Symbol>()
		for (const constituent of constituents) {
			if ((constituent.flags & NON_OBJECT_TYPE_FLAGS) !== 0) continue
			for (const symbol of this.checker.getPropertiesOfType(constituent)) {
				if (!merged.has(symbol.getName())) merged.set(symbol.getName(), symbol)
			}
		}
		return [...merged.values()]
	}

	private sortedKeys(type: ts.Type): readonly string[] {
		return this.propertiesOf(type)
			.map((symbol) => symbol.getName())
			.sort()
	}
}

/**
 * Union constituents with any of these flags carry no documentable option keys
 * (a `boolean` constituent would otherwise contribute `valueOf`).
 */
const NON_OBJECT_TYPE_FLAGS =
	ts.TypeFlags.BooleanLike |
	ts.TypeFlags.StringLike |
	ts.TypeFlags.NumberLike |
	ts.TypeFlags.BigIntLike |
	ts.TypeFlags.ESSymbolLike |
	ts.TypeFlags.VoidLike |
	ts.TypeFlags.Null |
	ts.TypeFlags.Never

/** Levenshtein distance — used only to rank "did you mean" suggestions. */
function editDistance(a: string, b: string): number {
	let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
	for (let i = 1; i <= a.length; i++) {
		const current = [i]
		for (let j = 1; j <= b.length; j++) {
			const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
			const deletion = (previous[j] ?? 0) + 1
			const insertion = (current[j - 1] ?? 0) + 1
			current.push(Math.min(substitution, deletion, insertion))
		}
		previous = current
	}
	return previous[b.length] ?? Number.MAX_SAFE_INTEGER
}

function suggestKeys(unknown: string, legalKeys: readonly string[]): readonly string[] {
	const lowered = unknown.toLowerCase()
	return [...legalKeys]
		.map((key) => ({ key, distance: editDistance(lowered, key.toLowerCase()) }))
		.sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key))
		.slice(0, SUGGESTION_LIMIT)
		.map((entry) => entry.key)
}
