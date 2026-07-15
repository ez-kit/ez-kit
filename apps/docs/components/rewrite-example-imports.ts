import type { DataGridDocsExampleFlavor } from './data-grid-docs-example'

/**
 * Examples import `DataGrid` from the docs-only runtime switcher so that one component
 * can render under both kits (see `shared/DataGrid.tsx`). That specifier is an artifact
 * of how the docs are built — a reader copying the example needs the kit package they
 * actually installed, so the displayed source names it instead.
 *
 * Display-only: the rendered example still executes the real `shared/DataGrid` import.
 */
const DOCS_DATA_GRID_MODULE = 'shared/DataGrid'

const KIT_PACKAGES: Record<DataGridDocsExampleFlavor, string> = {
	shadcn: '@ez-kit/data-grid-shadcn',
	heroui: '@ez-kit/data-grid-heroui',
}

/**
 * Matches the module specifier of `… from 'shared/DataGrid'`, capturing the quote so the
 * replacement reuses the style the file was written in. `/` carries no meaning to the
 * `RegExp` constructor, so the module constant interpolates without escaping.
 */
const DOCS_MODULE_SPECIFIER = new RegExp(`(from\\s*)(['"])${DOCS_DATA_GRID_MODULE}\\2`, 'gu')

/**
 * Rewrites the docs switcher import in displayed example source to the kit package for
 * `kit`. Returns `source` unchanged when the example does not import the switcher.
 */
export function rewriteExampleImports(source: string, kit: DataGridDocsExampleFlavor): string {
	return source.replace(DOCS_MODULE_SPECIFIER, `$1$2${KIT_PACKAGES[kit]}$2`)
}
