/**
 * Type-level regression fixture for the kit-bound column helpers — checked by `tsc`, not by
 * Vitest, which is why the file is not named `*.test.tsx`.
 *
 * It is here, in `apps/docs`, rather than in either kit, because **that is the whole point**:
 * `apps/docs` resolves `@ez-kit/data-grid-shadcn` / `-heroui` through their `exports` → `./dist`,
 * so this compiles against the packages' published `.d.ts`. Every check that lived inside a kit
 * compiled against its `src`, where the defect never reproduced — a kit-bound `createColumns`
 * that had stopped checking anything at all through its built types passed six API audits and
 * the whole test suite. Turbo's `test` task already declares `dependsOn: ["^build"]`, and
 * `typecheck` runs after `build` in CI, so the `dist` this reads is always fresh.
 *
 * The `@ts-expect-error` directives are the assertions: `tsc` fails on an **unused** one, so if
 * any of these regressions silently starts compiling again, the build breaks here with a line
 * number. The un-annotated lines assert the opposite — that legal columns still compile, and
 * that a renderer's context is still contextually typed rather than an implicit `any`.
 */
import {
	createColumnHelper as createHeroColumnHelper,
	createColumns as createHeroColumns,
	extendDataGrid as extendHeroDataGrid,
} from '@ez-kit/data-grid-heroui'
import { defineCellType } from '@ez-kit/data-grid-react'
import {
	createColumnHelper as createShadcnColumnHelper,
	createColumns as createShadcnColumns,
	extendDataGrid as extendShadcnDataGrid,
} from '@ez-kit/data-grid-shadcn'

type User = { id: string; name: string; age: number; status: string }

const STATUS_ITEMS = [
	{ value: 'active', label: 'Active' },
	{ value: 'archived', label: 'Archived' },
]

// ── shadcn ────────────────────────────────────────────────────────────────

createShadcnColumns<User>([
	{ accessorKey: 'name', cell: 'text' },
	{ accessorKey: 'status', cell: { type: 'select', config: { items: STATUS_ITEMS } } },
	// `value` is contextually typed as the column's own value type — `toFixed` is the proof.
	{ accessorKey: 'age', cell: { component: (ctx) => ctx.value.toFixed(2) } },
])

createShadcnColumns<User>([
	// @ts-expect-error `select` declares a required `config.items`
	{ accessorKey: 'status', cell: { type: 'select' } },
])

createShadcnColumns<User>([
	// @ts-expect-error `nope` is not a registered cell type
	{ accessorKey: 'status', cell: { type: 'nope' } },
])

createShadcnColumns<User>([
	// @ts-expect-error `decimalz` is a typo for `decimals`
	{ accessorKey: 'age', cell: { type: 'number', config: { decimalz: 2 } } },
])

const shadcnColumn = createShadcnColumnHelper<User>()
shadcnColumn.select({ accessorKey: 'status', config: { items: STATUS_ITEMS } })
// The helper's builder methods are generated from the registry's ids, so an unregistered id is
// not one of them. Asserted through `keyof` rather than by calling `.nope(…)`, which under a
// `@ts-expect-error` is an unresolved call and trips `no-unsafe-call`.
// @ts-expect-error `nope` is not a registered cell type
const shadcnMissingMethod: keyof typeof shadcnColumn = 'nope'
void shadcnMissingMethod

// ── heroui ────────────────────────────────────────────────────────────────

createHeroColumns<User>([
	{ accessorKey: 'name', cell: 'text' },
	{ accessorKey: 'status', cell: { type: 'select', config: { items: STATUS_ITEMS } } },
	{ accessorKey: 'age', cell: { component: (ctx) => ctx.value.toFixed(2) } },
])

createHeroColumns<User>([
	// @ts-expect-error `select` declares a required `config.items`
	{ accessorKey: 'status', cell: { type: 'select' } },
])

createHeroColumns<User>([
	// @ts-expect-error `nope` is not a registered cell type
	{ accessorKey: 'status', cell: { type: 'nope' } },
])

createHeroColumns<User>([
	// @ts-expect-error `decimalz` is a typo for `decimals`
	{ accessorKey: 'age', cell: { type: 'number', config: { decimalz: 2 } } },
])

const heroColumn = createHeroColumnHelper<User>()
heroColumn.select({ accessorKey: 'status', config: { items: STATUS_ITEMS } })
// @ts-expect-error `nope` is not a registered cell type
const heroMissingMethod: keyof typeof heroColumn = 'nope'
void heroMissingMethod

// ── extendDataGrid keeps the same guarantees on the merged registry ────────

type RatingConfig = { max: number }
const ratingCellType = defineCellType<RatingConfig>()({})

const extendedShadcn = extendShadcnDataGrid({ rating: ratingCellType })
extendedShadcn.createColumns<User>([
	{ accessorKey: 'age', cell: { type: 'rating', config: { max: 5 } } },
	// the base registry survives the merge
	{ accessorKey: 'status', cell: { type: 'select', config: { items: STATUS_ITEMS } } },
])
extendedShadcn.createColumns<User>([
	// @ts-expect-error `max` is `rating`'s only config key
	{ accessorKey: 'age', cell: { type: 'rating', config: { maximum: 5 } } },
])
extendedShadcn.createColumns<User>([
	// @ts-expect-error still not a registered cell type after the merge
	{ accessorKey: 'status', cell: { type: 'nope' } },
])

const extendedHero = extendHeroDataGrid({ rating: ratingCellType })
extendedHero.createColumns<User>([{ accessorKey: 'age', cell: { type: 'rating', config: { max: 5 } } }])
extendedHero.createColumns<User>([
	// @ts-expect-error `max` is `rating`'s only config key
	{ accessorKey: 'age', cell: { type: 'rating', config: { maximum: 5 } } },
])
