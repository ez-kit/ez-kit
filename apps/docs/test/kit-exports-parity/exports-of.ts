import { resolve } from 'node:path'

import ts from 'typescript'

const DOCS_ROOT = resolve(__dirname, '../..')
const PROBE_FILE = resolve(DOCS_ROOT, 'test/kit-exports-parity/__probe__.ts')

export type KitExports = { values: string[]; types: string[] }

/**
 * The exports of a package's **built** declarations, split into values and types.
 *
 * Resolved through `apps/docs/tsconfig.json`, so a specifier lands on the same `dist/*.d.ts` a
 * consumer's compiler reads. A value that is also a type (a const object plus its same-named union,
 * per the closed-set rule) counts as a value and as a type, which is what a consumer can write.
 */
export function kitExports(moduleName: string): KitExports {
	const configPath = resolve(DOCS_ROOT, 'tsconfig.json')
	const config = ts.readConfigFile(configPath, (fileName) => ts.sys.readFile(fileName))
	const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, DOCS_ROOT)
	const source = `import * as kit from '${moduleName}'\nexport { kit }\n`

	const host = ts.createCompilerHost(parsed.options, true)
	const readFile = host.readFile.bind(host)
	const fileExists = host.fileExists.bind(host)
	const getSourceFile = host.getSourceFile.bind(host)
	host.fileExists = (fileName) => fileName === PROBE_FILE || fileExists(fileName)
	host.readFile = (fileName) => (fileName === PROBE_FILE ? source : readFile(fileName))
	host.getSourceFile = (fileName, languageVersion, ...rest) =>
		fileName === PROBE_FILE
			? ts.createSourceFile(fileName, source, languageVersion, true)
			: getSourceFile(fileName, languageVersion, ...rest)

	const program = ts.createProgram([PROBE_FILE], parsed.options, host)
	const checker = program.getTypeChecker()
	const probe = program.getSourceFile(PROBE_FILE)
	const declaration = probe?.statements.find(ts.isImportDeclaration)
	const moduleSymbol = declaration && checker.getSymbolAtLocation(declaration.moduleSpecifier)
	if (moduleSymbol === undefined) throw new Error(`Cannot resolve ${moduleName} from apps/docs`)

	const values: string[] = []
	const types: string[] = []
	for (const exported of checker.getExportsOfModule(moduleSymbol)) {
		const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
		if (target.flags & ts.SymbolFlags.Value) values.push(exported.name)
		if (target.flags & ts.SymbolFlags.Type) types.push(exported.name)
	}

	return { values: values.sort(), types: types.sort() }
}
