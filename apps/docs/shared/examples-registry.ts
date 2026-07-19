import dataGridManifest from '@/shared/data-grid/examples/manifest.json'
import formManifest from '@/shared/form/examples/manifest.json'

/**
 * One lookup over every kit-switched example in the docs.
 *
 * Both products render through the same `/examples/<kit>/<slug>` embed routes and the same
 * preview frame, so the route, the source panel and the renderer all need to resolve an id
 * without knowing which product it belongs to. They ask here; the `product` on the result is
 * what tells them which loader and which source directory to use.
 */
export enum ExampleProduct {
	DataGrid = 'data-grid',
	Form = 'form',
}

/** Where each product's example sources live, relative to the docs app root. */
export const EXAMPLE_SOURCE_DIRS: Record<ExampleProduct, string> = {
	[ExampleProduct.DataGrid]: 'shared/data-grid/examples',
	[ExampleProduct.Form]: 'shared/form/examples',
}

type ManifestEntry = {
	id: string
	sourceFile: string
	exportName: string
}

export type ExampleEntry = ManifestEntry & {
	product: ExampleProduct
}

function withProduct(manifest: unknown, product: ExampleProduct): ExampleEntry[] {
	return (manifest as ManifestEntry[]).map((entry) => ({ ...entry, product }))
}

/**
 * Ids are unique across products — the embed route is shared, so two products cannot both
 * claim one slug. The form manifest prefixes its ids with `form-` to keep that true.
 */
export const exampleEntries: readonly ExampleEntry[] = [
	...withProduct(dataGridManifest, ExampleProduct.DataGrid),
	...withProduct(formManifest, ExampleProduct.Form),
]

export function findExample(id: string): ExampleEntry | undefined {
	return exampleEntries.find((entry) => entry.id === id)
}
