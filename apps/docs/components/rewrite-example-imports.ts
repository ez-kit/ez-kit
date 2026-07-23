import type { DataGridDocsExampleFlavor } from './kit-example'

/**
 * Examples import their kit-switched entry point from a docs-only module, so that one
 * component can render under both kits (`shared/DataGrid.tsx`, `shared/form/FormKit.tsx`).
 * Those specifiers are an artifact of how the docs are built — a reader copying the example
 * needs the kit package they actually installed, so the displayed source names it instead.
 *
 * Display-only: the rendered example still executes the real docs-module import.
 */
const DOCS_MODULE_PACKAGES: Record<string, Record<DataGridDocsExampleFlavor, string>> = {
	'shared/DataGrid': {
		shadcn: '@ez-kit/data-grid-shadcn',
		heroui: '@ez-kit/data-grid-heroui',
	},
	'shared/form/FormKit': {
		shadcn: '@ez-kit/form-shadcn',
		heroui: '@ez-kit/form-heroui',
	},
}

/**
 * Matches the module specifier of `… from '<docs module>'`, capturing the quote so the
 * replacement reuses the style the file was written in. `/` carries no meaning to the
 * `RegExp` constructor, so the module constants interpolate without escaping.
 */
function specifierPattern(docsModule: string): RegExp {
	return new RegExp(`(from\\s*)(['"])${docsModule}\\2`, 'gu')
}

/**
 * Rewrites the docs switcher imports in displayed example source to the kit packages for
 * `kit`. Returns `source` unchanged when the example imports no switcher.
 */
export function rewriteExampleImports(source: string, kit: DataGridDocsExampleFlavor): string {
	return Object.entries(DOCS_MODULE_PACKAGES).reduce(
		(rewritten, [docsModule, packages]) => rewritten.replace(specifierPattern(docsModule), `$1$2${packages[kit]}$2`),
		source,
	)
}
