// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const packagesRoot = fileURLToPath(new URL('../../../packages/', import.meta.url))
const consumerSource = `
import { paramJson as zuJson } from '@ez-kit/zu-store/persist'
import { paramJson as vaJson } from '@ez-kit/va-store/persist'
import { localStorageField, persistLocalStorage } from '@ez-kit/zu-store/persist/storage'
import { urlField, createUrlPort } from '@ez-kit/va-store/persist/url'
export type { SyncReadSourcePort, SyncSourcePort } from '@ez-kit/va-store/persist'
export type { FieldValueOptions, ValidatedAccessorFieldOptions, ValidatedValueOptions, PersistFieldDecorator, RestoreCallOptions, PersistWriteOptions } from '@ez-kit/zu-store/persist'
export type { FieldValueOptions as VaValues, ValidatedAccessorFieldOptions as VaAccessor, ValidatedValueOptions as VaValidated, PersistFieldDecorator as VaDecorator, RestoreCallOptions as VaRestoreCallOptions, PersistWriteOptions as VaPersistWriteOptions } from '@ez-kit/va-store/persist'
export type { FieldValueOptions as StorageValues, ValidatedAccessorFieldOptions as StorageAccessor, ValidatedValueOptions as StorageValidated, PersistFieldDecorator as StorageDecorator } from '@ez-kit/zu-store/persist/storage'
export type { FieldValueOptions as UrlValues, ValidatedAccessorFieldOptions as UrlAccessor, ValidatedValueOptions as UrlValidated, PersistFieldDecorator as UrlDecorator } from '@ez-kit/va-store/persist/url'
const schema = { validate: (value: unknown) => ({ width: Number(value) }) }
export const browser = localStorageField({ source: 'browser', parser: zuJson<unknown>(), schema })
export const linked = urlField({ source: 'router', parser: vaJson<unknown>(), schema })
export const decorate = persistLocalStorage({ source: 'browser', parser: zuJson<unknown>(), schema })
export const syncUrl = createUrlPort({ read: () => new URLSearchParams(), commit: () => undefined })
export const asyncUrl = createUrlPort({ read: () => new URLSearchParams(), readRender: () => new URLSearchParams(), commit: async () => undefined })
`

function diagnostics(program: ts.Program, emitted: ts.EmitResult): string {
	return ts.formatDiagnosticsWithColorAndContext([...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics], {
		getCanonicalFileName: (file) => file,
		getCurrentDirectory: () => packagesRoot,
		getNewLine: () => '\n',
	})
}

describe('portable public helper declarations', () => {
	it('emits and consumes inferred helper/decorator declarations using only public binding entries', () => {
		const directory = mkdtempSync(join(tmpdir(), 'ezkit-public-declarations-'))
		try {
			const modules = join(directory, 'node_modules', '@ez-kit')
			mkdirSync(modules, { recursive: true })
			for (const name of ['zu-store', 'va-store']) symlinkSync(join(packagesRoot, name), join(modules, name), 'dir')
			const library = join(directory, 'library.ts')
			writeFileSync(library, consumerSource)
			const options: ts.CompilerOptions = {
				strict: true,
				exactOptionalPropertyTypes: true,
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Bundler,
				skipLibCheck: true,
				types: [],
				declaration: true,
				emitDeclarationOnly: true,
				noEmitOnError: true,
				outDir: join(directory, 'declarations'),
			}
			const program = ts.createProgram([library], options)
			expect(diagnostics(program, program.emit())).toBe('')
			const declaration = readFileSync(join(directory, 'declarations', 'library.d.ts'), 'utf8')
			expect(declaration).not.toContain('node_modules')
			expect(declaration).not.toContain(packagesRoot)
			// Consume the emitted contract without access to its implementation or workspace aliases.
			rmSync(library)
			writeFileSync(join(directory, 'library.d.ts'), declaration)
			const consumer = join(directory, 'consumer.ts')
			writeFileSync(
				consumer,
				`import { browser, linked, decorate } from './library'\nexport const width: number = browser.schema.validate(1).width\nexport const queryWidth: number = linked.schema.validate(1).width\nexport const decorator = decorate\n`,
			)
			const downstream = ts.createProgram([consumer], { ...options, outDir: join(directory, 'downstream') })
			expect(diagnostics(downstream, downstream.emit())).toBe('')
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})
})
