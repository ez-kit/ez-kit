import { defineConfig } from 'tsup'

/**
 * Multiple entries, not one.
 *
 * A single-entry build emits one pre-bundled `dist/index.js`, and a consumer's bundler does not
 * shake an export out of it: importing the `PAGE_GAP` constant measured 54 857 bytes gzipped
 * against 54 873 for the whole `DataGrid` — 16 bytes apart. Three plausible causes were measured
 * and ruled out (the 28 `DataGrid.X = …` compound assignments: 273 bytes; the
 * `export * from '@ez-kit/data-grid-core'` star: 2.5 kB; the two top-level `createContext` calls:
 * nothing). What did work was giving a module its own entry — the same `PAGE_GAP` import then
 * cost 53 bytes.
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
