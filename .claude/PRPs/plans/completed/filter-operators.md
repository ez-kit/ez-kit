# Filter Operators UI — Implementation Plan

> React adapter layer plan for `@ez-kit/data-grid-*`.
> All business logic in `core`, React layer handles UI + state sync only.

---

## Requirements

- Filter operators (contains, equals, >, between, etc.) inline in header — trigger button **after** filter input
- `operators: true` — default operators by column cell type
- `operators: { items, betweenOperator }` — explicit configuration
- Custom operators: register at table-level, define inline at column-level
- `between` with `variant: 'inputs' | 'slider'` (number) and `'inputs' | 'calendar'` (date)
- No-input operators (`isEmpty`, `isNotEmpty`) → hide filter input entirely
- Operator switch → reset value when types are incompatible (between ↔ single, any ↔ no-input)
- All business logic in `core`, React only for UI + state sync

---

## Key Types (Public API)

```typescript
// Operator definition
interface FilterOperatorDef<TValue = unknown> {
  id: string
  label: string
  symbol?: string                // shown in trigger button: '=', '>', '⊇'
  requiresInput?: boolean        // default: true; false = hide input (isEmpty etc.)
  component?: (props: OperatorInputProps<TValue>) => ReactNode
  filterFn: (rowValue: unknown, filterValue: TValue) => boolean
}

// Structured filter value (stored in TanStack columnFilters[n].value)
interface StructuredFilterValue {
  operator: string
  value: unknown
}

// For between operator
interface BetweenValue<T = unknown> {
  from?: T
  to?: T
}

// Between UI config
interface BetweenOperatorConfig {
  variant?: 'inputs' | 'slider' | 'calendar'
  // 'inputs' = default for both number and date
  // 'slider' = number only (shadcn Slider with range)
  // 'calendar' = date only (shadcn Calendar in range mode)
}

// Column-level operators config
interface ColumnOperatorsConfig {
  items: Array<string | FilterOperatorDef>  // IDs or inline definitions
  betweenOperator?: BetweenOperatorConfig
}

// Extended ColumnFilteringConfig
interface ColumnFilteringConfig {
  component?: (props: InputComponentProps) => unknown
  operators?: boolean | ColumnOperatorsConfig
  defaultOperator?: string  // override default operator for this column
}

// Extended FilteringConfig (table-level)
interface FilteringConfig {
  manual?: boolean
  global?: boolean
  operators?: FilterOperatorDef[]  // global registry: new operators + built-in overrides
}

// Extended CellTypeDefinition
interface CellTypeDefinition {
  view?: ...
  edit?: ...
  creating?: ...
  filter?: ...
  operators?: string[]       // default operator IDs for this cell type
  defaultOperator?: string
}
```

---

## Default Operators by Cell Type

| Type | Operators | Default |
|------|-----------|---------|
| **text** | `contains`, `equals`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty` | `contains` |
| **number** | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between` | `eq` |
| **date** | `eq`, `after`, `onOrAfter`, `before`, `onOrBefore`, `between` | `eq` |
| **boolean** | — | trigger hidden |

---

## Operator Resolution Priority (per column)

```
1. Inline FilterOperatorDef in column.filtering.operators.items  ← local to this column only
2. string ID → table-level filtering.operators registry
3. string ID → built-in operators
4. operators: true → CellTypeDefinition.operators or DEFAULT_OPERATORS_BY_TYPE[cellType]
```

---

## API Examples

```typescript
// Simple enable
{ id: 'name', filtering: { operators: true } }

// Subset of built-in operators with between slider
{
  id: 'salary',
  filtering: {
    operators: {
      items: ['eq', 'gt', 'lt', 'between'],
      betweenOperator: { variant: 'slider' }
    }
  }
}

// Mixed: built-in + inline custom operator
{
  id: 'score',
  filtering: {
    operators: {
      items: ['eq', { id: 'myOp', label: 'My Filter', symbol: '★', filterFn: (rowVal, val) => ... }]
    }
  }
}

// Register custom operator at table level, then use by ID in column
useDataGrid({
  filtering: {
    operators: [
      { id: 'fuzzy', label: 'Fuzzy match', symbol: '~', filterFn: (rowVal, val) => ... }
    ]
  }
})
// Then in column:
{ filtering: { operators: { items: ['contains', 'fuzzy'] } } }

// Date between with calendar variant
{
  id: 'createdAt',
  cellType: 'date',
  filtering: {
    operators: true,
    // override between variant:
    operators: {
      items: ['eq', 'after', 'before', 'between'],
      betweenOperator: { variant: 'calendar' }
    }
  }
}
```

---

## Implementation Phases

### Phase 1 — Core: Types

**File:** `packages/data-grid/core/src/features/operators.ts` *(new)*

- Types: `FilterOperatorDef`, `StructuredFilterValue`, `BetweenValue`, `BetweenOperatorConfig`, `ColumnOperatorsConfig`
- Extend `ColumnFilteringConfig` in `column/types.ts`
- Extend `FilteringConfig` in `types.ts`
- Extend TanStack `ColumnMeta` module augmentation to include operator config

---

### Phase 2 — Core: Built-in Operators & Registry

**File:** `packages/data-grid/core/src/features/operators.ts` *(continued)*

- `TEXT_OPERATORS`: `contains`, `equals`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty` — each with `filterFn`
- `NUMBER_OPERATORS`: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between` — each with `filterFn`
- `DATE_OPERATORS`: `eq`, `after`, `onOrAfter`, `before`, `onOrBefore`, `between` — each with `filterFn`
- `DEFAULT_OPERATORS_BY_TYPE: Record<string, FilterOperatorDef[]>`
- `DEFAULT_OPERATOR_ID_BY_TYPE: Record<string, string>`
- `buildOperatorRegistry(tableOperators?)` — merges built-ins with table-level overrides (same ID = override)
- `resolveColumnOperators(columnFilteringConfig, registry, cellTypeDef?)` — returns resolved operators list for a column
- `createOperatorFilterFn(registry)` — creates TanStack `filterFn` dispatcher:

```typescript
// filterFn dispatcher pattern
(row, columnId, filterValue: StructuredFilterValue) => {
  const op = registry.get(filterValue.operator)
  if (!op) return true
  if (!op.requiresInput) return op.filterFn(row.getValue(columnId), undefined)
  return op.filterFn(row.getValue(columnId), filterValue.value)
}
```

---

### Phase 3 — Core: Column Mapping Integration

**File:** `packages/data-grid/core/src/column/map-columns.ts`

- If `filtering.operators` is set on a column → attach `filterFn` dispatcher to TanStack columnDef
- Pass `betweenOperator` config through column meta (accessible in React for UI)

**File:** `packages/data-grid/core/src/create-table.ts`

- Build `operatorRegistry` from `config.filtering.operators`
- Pass registry into `mapColumns()`

---

### Phase 4 — Core: Exports

**File:** `packages/data-grid/core/src/index.ts`

Export: `FilterOperatorDef`, `StructuredFilterValue`, `BetweenValue`, `BetweenOperatorConfig`, `ColumnOperatorsConfig`, `TEXT_OPERATORS`, `NUMBER_OPERATORS`, `DATE_OPERATORS`, `DEFAULT_OPERATORS_BY_TYPE`, `DEFAULT_OPERATOR_ID_BY_TYPE`, `buildOperatorRegistry`, `resolveColumnOperators`

---

### Phase 5 — React: CellTypeDefinition

**File:** `packages/data-grid/react/react/src/cell-types-context.tsx`

- Add `operators?: string[]` and `defaultOperator?: string` to `CellTypeDefinition`

**File:** `packages/data-grid/react/react/src/built-in-cell-types.tsx`

- Declare operators for `number` and `date` built-in cell types

---

### Phase 6 — React: DI Components

**File:** `packages/data-grid/react/react/src/components-context.tsx`

Add to `GridComponents`:
- `OperatorSelect?: (props: OperatorSelectProps) => ReactNode`
- `BetweenInput?: (props: BetweenInputProps) => ReactNode`

New prop types:
```typescript
interface OperatorSelectProps {
  operators: FilterOperatorDef[]
  currentOperatorId: string
  onChange: (operatorId: string) => void
}

interface BetweenInputProps {
  value: BetweenValue
  onChange: (value: BetweenValue) => void
  variant: 'inputs' | 'slider' | 'calendar'
  type: 'number' | 'date'
}
```

---

### Phase 7 — React: Header Rendering

**File:** `packages/data-grid/react/react/src/data-grid/header.tsx`

Update `renderFilterInput` logic:

```
If column has operators configured:
  1. Resolve operators list and current active operator (from StructuredFilterValue.operator or defaultOperator)
  2. If active operator.requiresInput === false → hide input, show trigger only
  3. If active operator.id === 'between' → render <BetweenInput> instead of regular input
  4. Otherwise → render regular filter input
  5. After input/between → render <OperatorSelect> trigger button

onChange logic:
  - On operator change: if new operator requiresInput=false, or switching between↔single → reset value to undefined
  - Otherwise → preserve current value
  - Update StructuredFilterValue: { operator: newId, value: ... }

Clearing filter:
  - When user clears input value → set entire columnFilter to undefined (TanStack removes the filter)
```

---

### Phase 8 — Shadcn: OperatorSelect Component

**File:** `packages/data-grid/react/shadcn/src/blocks/OperatorSelect.tsx` *(new)*

- Compact trigger button (~28px) showing current operator's `symbol`
- `DropdownMenu` with full operators list
- Each item: `symbol` + `label`
- Separator before no-input operators (`isEmpty`, `isNotEmpty`)
- Active operator highlighted with a checkmark

---

### Phase 9 — Shadcn: BetweenInput Component

**File:** `packages/data-grid/react/shadcn/src/blocks/BetweenInput.tsx` *(new)*

- **number** + `variant: 'inputs'` → two number inputs (from / to), default
- **number** + `variant: 'slider'` → shadcn `Slider` in range mode
- **date** + `variant: 'inputs'` → two date inputs (from / to), default
- **date** + `variant: 'calendar'` → shadcn `Calendar` in range mode

---

### Phase 10 — Shadcn: Wire DI

**File:** `packages/data-grid/react/shadcn/src/shadcn-data-grid.tsx`

- Pass `OperatorSelect` and `BetweenInput` into `GridComponentsProvider`

---

### Phase 11 — Sandbox: Filter Operators Examples

**File:** `apps/docs/app/sandbox/data-grid/components/filter-operators.tsx` *(new)*

Internal sub-tabs:

| Sub-tab | What it demonstrates |
|---------|----------------------|
| `basic` | `operators: true` on text/number/date columns, default operators |
| `subset` | Subset of operators `{ items: ['eq', 'gt', 'lt'] }` |
| `between-slider` | Number between with `variant: 'slider'` |
| `between-calendar` | Date between with `variant: 'calendar'` |
| `custom` | Custom operator registered at table-level, used in column by ID |
| `mixed` | Different configurations on different columns simultaneously |

**File:** `apps/docs/app/sandbox/data-grid/page.tsx`

- Add `{ id: 'filter-operators', label: 'Filter Operators', component: FilterOperatorsExample }` tab

---

### Phase 12 — React: Exports

**File:** `packages/data-grid/react/react/src/index.ts`

Export: `OperatorSelectProps`, `BetweenInputProps`, extended `ColumnFilteringConfig`

---

## Files Touched

| File | Action |
|------|--------|
| `core/src/features/operators.ts` | **New** — types, built-ins, registry, resolver, filterFn factory |
| `core/src/column/types.ts` | Extend `ColumnFilteringConfig` |
| `core/src/types.ts` | Extend `FilteringConfig` |
| `core/src/column/map-columns.ts` | Attach filterFn dispatcher, pass betweenOperator via meta |
| `core/src/create-table.ts` | Build and pass operator registry |
| `core/src/index.ts` | New exports |
| `react/react/src/cell-types-context.tsx` | Extend `CellTypeDefinition` with operators |
| `react/react/src/built-in-cell-types.tsx` | Declare operators for number/date types |
| `react/react/src/components-context.tsx` | Add `OperatorSelect`, `BetweenInput` to `GridComponents` |
| `react/react/src/data-grid/header.tsx` | Update `renderFilterInput` for operator-aware rendering |
| `react/react/src/index.ts` | New exports |
| `shadcn/src/blocks/OperatorSelect.tsx` | **New** — shadcn trigger + dropdown |
| `shadcn/src/blocks/BetweenInput.tsx` | **New** — shadcn inputs/slider/calendar for between |
| `shadcn/src/shadcn-data-grid.tsx` | Wire OperatorSelect and BetweenInput into DI |
| `sandbox/data-grid/components/filter-operators.tsx` | **New** — 6 sub-tab examples |
| `sandbox/data-grid/page.tsx` | Add Filter Operators tab |

---

## Edge Cases to Handle

1. **Column with operators but no cellType** → fall back to text operators
2. **Custom cell type with `operators` in CellTypeDefinition** → used when column has `operators: true`
3. **Manual filtering (server-side)** → `StructuredFilterValue` is preserved in `table.getState().columnFilters`, server reads `{ operator, value }` directly
4. **No `OperatorSelect` DI component provided** → operators silently disabled (no crash, graceful degradation)
5. **Boolean cell type** → no operator selector rendered (trigger hidden)
6. **`between` value reset** → switching from between to single: reset `BetweenValue` → `undefined`; switching to isEmpty: reset both
7. **Empty filter value on operator switch** → set `columnFilter` to undefined when value becomes empty after reset
8. **Custom inline operator overrides built-in by same ID** → column-level inline wins for that column only; does not affect global registry
