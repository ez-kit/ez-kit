import { defineConfig } from 'tsup'

/**
 * Multiple entries, not one.
 *
 * A single-entry build emits one pre-bundled `dist/index.js`, and a consumer's bundler does not
 * shake an export out of it. Measured on `@ez-kit/data-grid-react` before this change, importing
 * the `PAGE_GAP` constant cost the same as importing the whole `DataGrid`, to within a few bytes.
 * Three plausible causes were measured and ruled out — the 28 `DataGrid.X = …` compound
 * assignments, the `export *` star and the top-level `createContext` calls. Giving a module its
 * own entry is what worked.
 *
 * So each feature group and each cell type is reachable on its own here, and a consumer that
 * composes a reduced set through `createDataGrid` stops paying for the rest. `.` still exports the
 * whole surface and `DataGrid` still arrives with every component registered, so every subpath is
 * an option rather than a migration.
 *
 * `apps/docs/test/tree-shaking.test.ts` holds each entry to the set it may reach — that is how the
 * next one gets added, by measurement rather than by assumption.
 */
export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'cell-types/index': 'src/blocks/cell-types/cell-type-entries.ts',
		'cell-types/text': 'src/blocks/cell-types/TextCell.tsx',
		'cell-types/number': 'src/blocks/cell-types/NumberCell.tsx',
		'cell-types/boolean': 'src/blocks/cell-types/BooleanCell.tsx',
		'cell-types/date': 'src/blocks/cell-types/DateCell.tsx',
		'cell-types/select': 'src/blocks/cell-types/SelectCell.tsx',
		'cell-types/badge': 'src/blocks/cell-types/BadgeCell.tsx',
		'cell-types/image': 'src/blocks/cell-types/ImageCell.tsx',
		'cell-types/link': 'src/blocks/cell-types/LinkCell.tsx',
		'cell-types/progress': 'src/blocks/cell-types/ProgressCell.tsx',
		'core/index': 'src/blocks/core/core-components.ts',
		'pagination/index': 'src/blocks/pagination/pagination-components.ts',
		'sorting/index': 'src/blocks/sorting/sorting-components.ts',
		'filtering/index': 'src/blocks/filtering/filtering-components.ts',
		'editing/index': 'src/blocks/editing/editing-components.ts',
		'deleting/index': 'src/blocks/deleting/deleting-components.ts',
		'row-actions/index': 'src/blocks/row-actions/row-actions-components.ts',
		'resizing/index': 'src/blocks/resizing/resizing-components.ts',
		'visibility/index': 'src/blocks/visibility/visibility-components.ts',
		'fallbacks/index': 'src/blocks/fallbacks/fallbacks-components.ts',
		'infinite/index': 'src/blocks/infinite/infinite-components.ts',
		'expanding/index': 'src/blocks/expanding/expanding-components.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	// Shared code lands in hash-named chunks rather than being copied into every entry that
	// reaches it — without this, sixteen entries would each carry their own copy of what they share.
	splitting: true,
	external: ['react', 'react-dom'],
})
