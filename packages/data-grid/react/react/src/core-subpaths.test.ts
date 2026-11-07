// @vitest-environment node
import * as coreFeatures from '@ez-kit/data-grid-core/features'
import * as coreAll from '@ez-kit/data-grid-core/features/all'
import * as coreEn from '@ez-kit/data-grid-core/messages/en'
import * as coreRu from '@ez-kit/data-grid-core/messages/ru'
import * as coreOperators from '@ez-kit/data-grid-core/operators'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

import * as features from '@ez-kit/data-grid-react/features'
import * as all from '@ez-kit/data-grid-react/features/all'
import * as en from '@ez-kit/data-grid-react/messages/en'
import * as ru from '@ez-kit/data-grid-react/messages/ru'
import * as operators from '@ez-kit/data-grid-react/operators'

import type { CreatingConfig } from '@ez-kit/data-grid-react/features'
import type { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import type { messages as enMessages } from '@ez-kit/data-grid-react/messages/en'
import type { messages as ruMessages } from '@ez-kit/data-grid-react/messages/ru'
import type { defaultOperators } from '@ez-kit/data-grid-react/operators'

describe('published Core subpaths', () => {
	it.each([
		['features', features, coreFeatures],
		['features/all', all, coreAll],
		['operators', operators, coreOperators],
		['messages/en', en, coreEn],
		['messages/ru', ru, coreRu],
	])('%s forwards the entire runtime surface without copying it', (_, actual, original) => {
		expect(Object.keys(actual).sort()).toEqual(Object.keys(original).sort())
		for (const key of Object.keys(original)) {
			expect(Reflect.get(actual, key)).toBe(Reflect.get(original, key))
		}
	})

	it('resolves the declarations through package exports', () => {
		const config: Pick<CreatingConfig<{ id: number }>, 'mode'> = { mode: 'row' }
		const imports: [typeof allDataGridFeatures, typeof defaultOperators, typeof enMessages, typeof ruMessages] = [
			all.allDataGridFeatures,
			operators.defaultOperators,
			en.messages,
			ru.messages,
		]
		expect(config.mode).toBe('row')
		expect(imports).toHaveLength(4)
	})

	it('keeps narrow features and the root clear of all-in features, operators and Russian messages', async () => {
		for (const specifier of [
			"import { createColumns } from '@ez-kit/data-grid-react'",
			"import { columnVisibilityFeature as createColumns } from '@ez-kit/data-grid-react/features'",
		]) {
			const result = await build({
				stdin: { contents: `${specifier}; console.log(createColumns)`, resolveDir: process.cwd() },
				bundle: true,
				write: false,
				metafile: true,
				format: 'esm',
				packages: 'bundle',
				external: ['react', 'react-dom', '@tanstack/*'],
			})
			const inputs = Object.keys(result.metafile.inputs).join('\n')
			expect(inputs).not.toMatch(/features\/all\.js|operators\/index\.js|messages\/ru\.js/)
		}
	})
})
