# 0013. Docs option names and e2e slots are checked against the source

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)

## Decision

**Documented option names and e2e locators are checked against the source.** `apps/docs/test/docs-option-names.test.ts` resolves every option name in the data-grid, form, zu-store and va-store docs tables through `ts.TypeChecker` (deliberately not a grep), and coverage is total: a new page needs a `DocPage` and a `PAGE_ENTRIES` entry in `apps/docs/test/docs-options/page-type-map.ts`, with every table classified. Packages must be built first. `apps/docs/test/e2e-slots.test.ts` fails on a spec `data-slot` that no package authors.

## Context, rationale and rejected alternatives

**Documented option names are type-checked** — `apps/docs/test/docs-option-names.test.ts` (helpers in `apps/docs/test/docs-options/`) resolves every option name in the data-grid, form, zu-store and va-store docs' markdown option tables against the **real** exported types, via `ts.TypeChecker.getPropertiesOfType()` on a `ts.Program` built from `apps/docs/tsconfig.json`. Deliberately **not** a grep: `enableSorting`, `enableColumnFilters`, `enableRowSelection` and `manualPagination` all appear literally in `packages/data-grid/core/src/create-table.ts` (the core sets them as _internal_ TanStack options) while being illegal in the public config, so a substring check would bless exactly the defect class this test exists to catch. A fabricated name on a mapped page fails CI with file:line, the bogus name, the legal keys of the governing type, and a "did you mean". Package exports resolve to `./dist`, so the data-grid, form and store packages must be **built** before the test runs — the turbo `test` task's `dependsOn: ["^build"]` already enforces that.

Coverage over the documented packages is **total**: the explicit page → type map in
`apps/docs/test/docs-options/page-type-map.ts` classifies every page under the four scanned roots —
`content/docs/data-grid/**`, `form/**`, `zu-store/**` and `va-store/**` — keyed by file path **plus
the heading above each table** so multiple tables in one file map independently: 114 pages / 90
option tables / 432 checked names today, of which the store packages contribute 43 pages / 24 tables
/ 69 names. Pages with no option table still get an entry with two empty arrays, and that is the
point: while coverage was partial, an unmapped page was checked by nothing, and the two worst pages
in the docs were unmapped ones — `columns/resizing.mdx` documented a `sizing` option that never
existed, and the whole `editing/**` section documented a `meta.editType` / `onCellEdit` API that
never existed. Two guards keep the hole shut: the test **walks the scanned roots on disk** and fails
on any `.mdx` that is in neither `DocPage` nor `DELIBERATELY_UNMAPPED` (so the map cannot fall behind
the docs tree), and `everyPageIsMapped` fails the moment a listed page carries no `PAGE_ENTRIES`
entry. `form/index.mdx` and `form/ai.mdx` are the only deliberate exemptions: every table on them
documents exported symbols or URLs, so an entry would check nothing.

The store pages read their types **through the binding a consumer imports** (`@ez-kit/zu-store`,
`@ez-kit/va-store` and their `/persist` subpaths), not through `@ez-kit/store-core` — that is what
`apps/docs` depends on, and it is what the docs tell a reader to import. Note the two bindings'
generic vocabulary differs, which the map encodes: `zu-store` types are generic over the Zustand
**handle** (`STORE_TYPE_ARGS`), `va-store` types over the **state** object (`STATE_TYPE_ARGS`).

To add a page: verify its tables against the real types by hand, add the path to `DocPage`, and add a
`PAGE_ENTRIES` entry classifying **every** table on the page as either an `optionTables` entry
(governing type + expected name count) or a `nonOptionTables` entry (with a reason) — an
unclassified table fails the test, as does a table whose checked-name count drifts from what's
recorded. Rows that intentionally document a non-key (the literal `false` a per-column slot accepts,
a cache method written with its call signature) go in `OPTION_EXCEPTIONS`, each with its reason.

**e2e locators are checked against the slots the kits render** — `apps/docs/test/e2e-slots.test.ts`
(helper in `apps/docs/test/e2e-slots/`) collects every `data-slot="…"` literal the browser specs
address and every one the three data-grid React packages write onto an element, and fails with
`file:line` on a spec slot no package authors. Both sides are string literals in source and the JSX
attribute _is_ the DOM attribute the selector matches, so comparing the literals compares the
relationship rather than approximating it — but comments are stripped first, since a spec
explaining in prose which slot a kit stamps (HeroUI's `Chip` overwrites the caller's with its own
`chip`) is not addressing it. Package unit tests are excluded from the authored side for the same
reason: they name slots nothing renders. This is a weaker guarantee than
`docs-option-names.test.ts` gives — it cannot say _which_ kit renders a slot, or whether the
element is reachable in the state the spec drives it to — but it is the guarantee that was missing,
and it runs in `verify`. #233 renamed `clear-filters-button` to `clear-filter-button` in all three
packages, touched no spec, and the stale selector matched nothing from the moment it landed. A new
slot assembled at runtime rather than written as a literal is invisible here; a spec that must
address one is the case to reconsider this check, not to widen the regex.
