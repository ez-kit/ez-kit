// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { kitExports } from './kit-exports-parity/exports-of'

/**
 * Spec 009, D9: exactly one package depends on TanStack Form, so an app gets one copy.
 *
 * The kits used to list TanStack as a peer beside `@ez-kit/form-react`, which had it as a peer
 * too, so the version an app installed was whatever its own manifest said — and an app that also
 * imported TanStack directly could resolve two. Now `@ez-kit/form-react` owns the version, the kits
 * import nothing from TanStack or from `@ez-kit/form-core`, and everything they need arrives
 * through `@ez-kit/form-react`.
 */
const REPO_ROOT = resolve(__dirname, '../../..')
const FORM = resolve(REPO_ROOT, 'packages/form')
const KIT_DIRS = ['react/shadcn', 'react/heroui'] as const
const TANSTACK = ['@tanstack/react-form', '@tanstack/form-core'] as const

type Manifest = Partial<Record<'dependencies' | 'peerDependencies' | 'devDependencies', Record<string, string>>>

const manifest = (dir: string): Manifest =>
	JSON.parse(readFileSync(join(FORM, dir, 'package.json'), 'utf8')) as Manifest

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
		.map((entry) => join(entry.parentPath, entry.name))
}

describe('form package graph', () => {
	it('makes @ez-kit/form-react the only package that depends on TanStack', () => {
		const react = manifest('react/react')
		for (const name of TANSTACK) {
			expect(react.dependencies?.[name], name).toBeDefined()
			expect(react.peerDependencies?.[name], name).toBeUndefined()
		}
		expect(manifest('core').peerDependencies?.['@tanstack/form-core']).toBeDefined()
		expect(manifest('core').dependencies?.['@tanstack/form-core']).toBeUndefined()
	})

	it('pins both TanStack packages in @ez-kit/form-react to one exact, identical version', () => {
		const deps = manifest('react/react').dependencies ?? {}
		const [reactForm, formCore] = TANSTACK.map((name) => deps[name])
		expect(reactForm).toMatch(/^\d+\.\d+\.\d+$/)
		expect(formCore).toBe(reactForm)
	})

	it.each(KIT_DIRS)('keeps TanStack and form-core out of %s', (dir) => {
		const kit = manifest(dir)
		for (const section of ['dependencies', 'peerDependencies', 'devDependencies'] as const) {
			for (const name of [...TANSTACK, '@ez-kit/form-core']) {
				expect(kit[section]?.[name], `${section}.${name}`).toBeUndefined()
			}
		}
	})

	it.each(KIT_DIRS)('imports neither from any source file in %s', (dir) => {
		const offenders = sourceFiles(join(FORM, dir, 'src')).filter((file) =>
			/from '(@tanstack\/|@ez-kit\/form-core)/.test(readFileSync(file, 'utf8')),
		)
		expect(offenders).toEqual([])
	})

	// The source check above is not enough: tsup spells an inferred type out in the declarations in
	// terms of the packages it is built from, so a kit whose source names neither can still ship a
	// `dist/index.d.ts` that imports both — and that cannot resolve from the kit once neither is a
	// dependency, which turns every inferred type in a consumer's form into `any`.
	it.each(KIT_DIRS)('emits declarations that name neither in %s', (dir) => {
		const declarations = readFileSync(join(FORM, dir, 'dist/index.d.ts'), 'utf8')
		expect(declarations).not.toMatch(/from '(@tanstack\/|@ez-kit\/form-core)/)
	})

	it('re-exports useStore from the kits, so an app never installs TanStack itself', () => {
		expect(kitExports('@ez-kit/form-shadcn').values).toContain('useStore')
		expect(kitExports('@ez-kit/form-heroui').values).toContain('useStore')
	})
})
