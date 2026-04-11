# Implementation Report: Column Dependency Injection Refactor

## Summary
Replaced hardcoded `<Input>` usage across cell, filter, edit, and creating rendering with
a flexible DI system. Added `component` fields to all column configs, a `CellTypeRegistry`
context for custom type strings, built-in view rendering for `boolean`/`number`/`date`, and
extended `CellType` to allow arbitrary custom type identifiers.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large |
| Confidence | 9/10 | 9/10 |
| Files Changed | 11 | 11 |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Extend core column types | ✅ Complete | Added `InputComponentProps`, `component` to CellDef/configs, `cellView` to ColumnMeta |
| 2 | Update mapColumns for cell.component | ✅ Complete | `viewFn = component ?? view`; sets both `result.cell` and `meta.cellView` |
| 3 | Create CellTypesContext | ✅ Complete | Mirrors `components-context.tsx` DI pattern exactly |
| 4 | Extend useDataGrid with cellTypes | ✅ Complete | Strips `cellTypes` before `createTable`; stores on instance via Symbol |
| 5 | Wrap DataGrid root with CellTypesProvider | ✅ Complete | Reads from table Symbol + direct prop, merges both |
| 6 | Type-aware cell view rendering (cell.tsx) | ✅ Complete | Named `BooleanCell`/`NumberCell`/`DateCell` components; priority chain |
| 7 | filtering.component in header | ✅ Complete | Column-level component → default Input |
| 8 | creating.component in creating row | ✅ Complete | Column → registry (creating → edit fallback) → Input |
| 9 | Update AutoForm (editing/creating modals) | ✅ Complete | component → registry → built-in type Input |
| 10 | Update exports | ✅ Complete | New types exported from both core and react packages |
| 11 | Tests for new functionality | ✅ Complete | 5 new core tests + 4 new react tests |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Type Check (core) | ✅ Pass | Zero errors |
| Type Check (react) | ✅ Pass | Zero errors |
| Lint (core) | ✅ Pass | Zero warnings |
| Lint (react) | ✅ Pass | Zero warnings |
| Unit Tests (core) | ✅ Pass | 42 tests (13 in map-columns, +5 new) |
| Unit Tests (react) | ✅ Pass | 24 tests (+4 new) |
| Build | ✅ Pass | All 6 turbo tasks successful |

## Files Changed

| File | Action | Notes |
|---|---|---|
| `packages/data-grid/core/src/column/types.ts` | UPDATED | `InputComponentProps`, `component` fields, `cellView` meta, open `CellType` |
| `packages/data-grid/core/src/column/map-columns.ts` | UPDATED | `viewFn = component ?? view`, `meta.cellView` |
| `packages/data-grid/core/src/index.ts` | UPDATED | Export `InputComponentProps` |
| `packages/data-grid/react/react/src/cell-types-context.tsx` | CREATED | `CellTypesProvider`, `useCellTypes`, registry types |
| `packages/data-grid/react/react/src/use-data-grid.ts` | UPDATED | `UseDataGridConfig`, `cellTypes` stripping, `CELL_TYPES_KEY` symbol |
| `packages/data-grid/react/react/src/data-grid/data-grid.tsx` | UPDATED | `cellTypes` prop, `CellTypesProvider` wrapper |
| `packages/data-grid/react/react/src/data-grid/cell.tsx` | UPDATED | Built-in named view components, edit component resolution |
| `packages/data-grid/react/react/src/data-grid/header.tsx` | UPDATED | `filtering.component` support |
| `packages/data-grid/react/react/src/data-grid/creating-row.tsx` | UPDATED | `creating.component` + registry fallback |
| `packages/data-grid/react/react/src/data-grid/auto-form.tsx` | UPDATED | Full priority chain: component → registry → built-in |
| `packages/data-grid/react/react/src/index.ts` | UPDATED | Export `CellTypesProvider`, `useCellTypes`, registry types, `UseDataGridConfig` |

## Deviations from Plan

1. **`ColumnCreatingConfig`/`ColumnFilteringConfig` type casts** — ESLint auto-fix removed explicit casts; replaced with narrower inline interface casts to satisfy the type checker cleanly.
2. **`cellTypes` not passed to `renderFilterInput`** — The header helper only uses `filtering.component` (not registry lookup for filters); `cellTypes` was unused and removed. Registry-based filter components can be added later if needed.
3. **`CellType` changed to open union** — Added `| (string & {})` to allow custom type strings; this was necessary for the registry feature to work with TypeScript.

## Tests Written

| Test File | Tests Added | Coverage |
|---|---|---|
| `packages/data-grid/core/src/column/map-columns.test.ts` | 5 | `cell.component`, priority over `view`, filtering/editing/creating component in meta |
| `packages/data-grid/react/react/src/data-grid/data-grid.test.tsx` | 4 | Custom `cell.component`, boolean view ✓/✗, registry view, registry creating→edit fallback |

## Next Steps
- [ ] Code review via `/code-review`
- [ ] Create PR via `/prp-pr`
