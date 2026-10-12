import { defineConfig } from 'tsup'

/**
 * Multiple entries, not one.
 *
 * A single-entry build emits one pre-bundled `dist/index.js`, and a consumer's bundler does not
 * shake an export out of it: importing the `PAGE_GAP` constant measured the same as importing the
 * whole `DataGrid`, to within a few bytes. Three plausible causes were measured and ruled out —
 * the 28 `DataGrid.X = …` compound assignments, the `export * from '@ez-kit/data-grid-core'` star
 * and the two top-level `createContext` calls. What did work was giving a module its own entry.
 *
 * **That reading of the compound assignments is history and does not describe this build.** It was
 * measured against the single-entry `dist/index.js` the paragraph above is about. Re-measured on
 * the current multi-entry output, the same assignments — 29 of them by then — were the whole of
 * the defect, and replacing them with one annotated `Object.assign` is what fixed it. Why the two
 * runs disagree by orders of magnitude has not been established, and is not worth establishing —
 * the current measurement is the one that governs, and the fix lives in
 * `src/data-grid/data-grid.tsx`. What the paragraph above still gets right is its conclusion:
 * severing references inside one bundled file buys nothing, so a subpath is the mechanism rather
 * than the packaging of one.
 *
 * So a subpath here is the mechanism rather than the packaging of one: severing references inside
 * a single bundled file buys nothing. `apps/docs/test/tree-shaking.test.ts` holds each entry to
 * the set it may reach, which is how the next one gets added — by measurement, not by assumption.
 *
 * `.` keeps exporting the whole surface, so every subpath is an option and none is a migration.
 */
export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'state/index': 'src/state/index.ts',
		'cell-types/index': 'src/cell-types/index.ts',
		contract: 'src/contract.ts',
		kit: 'src/kit.ts',
		menu: 'src/menu.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	// Shared code lands in hash-named chunks rather than being duplicated into every entry that
	// reaches it — without this, five entries would each carry their own copy of what they share.
	splitting: true,
	external: ['react', 'react-dom'],
})
