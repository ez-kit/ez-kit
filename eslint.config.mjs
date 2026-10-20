import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url))

const NO_MEMO_MESSAGE =
	'No React.memo in the data grid. Isolate re-renders with a store selector, a value kept stable with useMemo / useCallback, or children composition — see AGENTS.md.'

/**
 * The `no-restricted-syntax` half of the data-grid `memo` ban: the named import.
 *
 * A constant because two blocks have to carry it. `no-restricted-syntax` set by a later block
 * **replaces** the options an earlier one set for the same file, so the GridMessages block — whose
 * files are a subset of the ban's — spreads this into its own list rather than dropping it.
 *
 * Not `no-restricted-imports` with `importNames: ['memo']`: that rule also reports every
 * `import * as React from 'react'`, since a namespace import could reach `memo`, and the kits use
 * that form throughout. `React.memo` itself is caught by `no-restricted-properties`.
 */
const NO_MEMO_IMPORT_SYNTAX = [
	{
		selector: "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name='memo']",
		message: NO_MEMO_MESSAGE,
	},
]

export default tseslint.config(
	{
		ignores: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.next/**',
			'**/coverage/**',
			'**/.turbo/**',
			'apps/docs/.source/**',
			'apps/docs/.sandpack-tmp/**',
			'apps/docs/scripts/**',
			'scripts/**',
			'.claude/skills/**/scripts/**',
			// Review artifacts, not shipped code: standalone oracle scripts kept beside the PRP
			// reports as the record of how a phase was verified. See their README.
			'.claude/PRPs/artifacts/**',
			'apps/docs/shared/data-grid/sandpack/generated/**',
			'**/*.config.{js,cjs,mjs,ts,mts,cts}',
			'**/*.d.ts',
			'**/*.tsbuildinfo',
			'eslint.config.mjs',
			'vitest.setup.ts',
			'vitest.shared.ts',
			'turbo/generators/config.ts',
		],
	},
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir,
			},
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			react: reactPlugin,
			'react-hooks': reactHooks,
			'jsx-a11y': jsxA11y,
			import: importPlugin,
		},
		settings: {
			react: {
				version: '19.0',
			},
			'import/resolver': {
				typescript: {
					noWarnOnMultipleProjects: true,
					project: ['packages/**/tsconfig.json', 'apps/**/tsconfig.json'],
				},
				node: true,
			},
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactPlugin.configs['jsx-runtime'].rules,
			...reactHooks.configs.recommended.rules,
			...jsxA11y.configs.recommended.rules,
			...importPlugin.configs.recommended.rules,
			...importPlugin.configs.typescript.rules,

			'react/prop-types': 'off',
			'react-hooks/refs': 'off',
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],
			'no-empty-function': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/consistent-indexed-object-style': 'off',
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports',
				},
			],
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		files: [
			'**/*.test.{js,jsx,ts,tsx}',
			'**/*.spec.{js,jsx,ts,tsx}',
			'**/test/**/*.{js,jsx,ts,tsx}',
			'vitest.setup.ts',
		],
		languageOptions: {
			globals: {
				...globals.vitest,
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'react/no-children-prop': 'off',
		},
	},
	{
		// Playwright specs are not React: a fixture's second argument is `use` by convention,
		// which `react-hooks/rules-of-hooks` reads as React's `use` hook called outside a
		// component. No React runs in this directory at all, so the plugin has nothing to say.
		files: ['apps/docs/e2e/**/*.ts'],
		rules: {
			'react-hooks/rules-of-hooks': 'off',
		},
	},
	{
		files: ['apps/docs/**/*.{js,jsx,ts,tsx}'],
		plugins: {
			'@next/next': nextPlugin,
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs['core-web-vitals'].rules,
			'@next/next/no-html-link-for-pages': 'off',
		},
	},
	{
		// No `React.memo` in the data-grid React packages or in the examples that teach them. Grid
		// re-renders are isolated by three things instead: selector subscriptions (a component
		// re-renders because the slice it selected changed), values kept stable with `useMemo` /
		// `useCallback` (every value the grid publishes keeps its identity while its inputs do), and
		// `children` composition (an element the host never recreates). A memo boundary hides an
		// unstable value rather than fixing it — the per-render cell-type registry that re-rendered
		// every cell would have stayed invisible behind one — and costs a props comparison per row
		// and per cell on every render.
		//
		// Mounted before the GridMessages block below, which restates the import selector: see
		// `NO_MEMO_IMPORT_SYNTAX` for why, and for why this is not `no-restricted-imports`.
		files: ['packages/data-grid/react/*/src/**/*.{ts,tsx}', 'apps/docs/shared/data-grid/examples/**/*.tsx'],
		rules: {
			'no-restricted-syntax': ['error', ...NO_MEMO_IMPORT_SYNTAX],
			'no-restricted-properties': ['error', { object: 'React', property: 'memo', message: NO_MEMO_MESSAGE }],
		},
	},
	{
		// No user-facing string literal in the data-grid packages: every one of them belongs in
		// `GridMessages` (`packages/data-grid/core/src/messages`), which is the only place a
		// consumer can replace it. Without this the literals come back one PR at a time, and a
		// grid that is 90% localizable is not localizable — the English that leaks is usually an
		// `aria-label`, where nobody sees it until a screen reader does.
		//
		// `components/ui/**` is out of scope: those are the kits' vendored primitives, whose
		// own defaults a block overrides by passing a prop.
		files: [
			'packages/data-grid/react/react/src/**/*.tsx',
			'packages/data-grid/react/shadcn/src/blocks/**/*.tsx',
			'packages/data-grid/react/heroui/src/blocks/**/*.tsx',
		],
		ignores: ['**/*.test.tsx', '**/test-utils.tsx'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					// Two letters in a row: `0`, `–` and `+${n}` are formatting, not wording.
					selector: 'JSXText[value=/[A-Za-z]{2}/]',
					message:
						'User-facing text belongs in GridMessages (packages/data-grid/core/src/messages), not in a component. Read it with useGridMessages() / table.grid.messages.',
				},
				{
					// The same wording hoisted into a module constant and referenced as `{FOO_LABEL}`
					// reads as an expression, so neither selector above sees it — this is how
					// heroui's `PREVIOUS_LABEL` / `PAGINATION_ARIA_LABEL` survived the first sweep.
					// Matched on the naming convention the packages actually use; `LABEL_CLASS` and
					// friends stay legal because they do not end in one of these words.
					selector: 'VariableDeclarator[id.name=/_(LABEL|TEXT|TITLE|PLACEHOLDER)$/] > Literal[value=/[A-Za-z]{2}/]',
					message:
						'User-facing text belongs in GridMessages (packages/data-grid/core/src/messages), not in a module constant. Read it with useGridMessages() / table.grid.messages.',
				},
				{
					selector:
						'JSXAttribute[name.name=/^(aria-label|placeholder|title|alt|aria-description)$/] > Literal[value=/[A-Za-z]{2}/]',
					message:
						'User-facing text belongs in GridMessages (packages/data-grid/core/src/messages), not in a component. Read it with useGridMessages() / table.grid.messages.',
				},
				// Restated here because this block replaces the `memo` block's list for these files.
				...NO_MEMO_IMPORT_SYNTAX,
			],
		},
	},
	eslintConfigPrettier,
)
