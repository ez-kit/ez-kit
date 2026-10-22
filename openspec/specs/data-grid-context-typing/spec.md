# data-grid-context-typing Specification

## Purpose

Defines where the grid context gets its type from: a default object handed to the grid factory,
an explicit typed reader for grids built without one, and an untyped fallback otherwise. No
program-wide declaration is involved, so grids in one program can carry different contexts.

## Requirements

### Requirement: The factory context default determines the context type

`createDataGrid` SHALL accept a `context` option. Its value SHALL be the factory-level default for
the grid context, and its type SHALL become the context type of the returned bundle without a type
argument being written.

#### Scenario: Type inferred from the default

- **WHEN** a bundle is created with `createDataGrid({ components, context: { currentUser: null as User | null } })`
- **THEN** the bundle's context type is `{ currentUser: User | null }`

#### Scenario: Default reaches a grid that sets no context

- **WHEN** a grid from that bundle is rendered without a `context` of its own
- **THEN** reading the context inside the grid returns the factory default

### Requirement: The bundle reader returns the complete context type

A bundle created with a factory context SHALL expose a `useGridContext` reader. Its whole-object
form SHALL return the bundle's context type with every key present. Its selector form SHALL type
the selector's argument the same way.

#### Scenario: Required key reads without optional chaining

- **WHEN** the factory default declares `permissions: { canEdit: boolean }`
- **AND** a cell reads `useGridContext((c) => c.permissions.canEdit)` from that bundle
- **THEN** the read type-checks and returns a `boolean`

#### Scenario: Unknown key is a compile error

- **WHEN** a cell reads `useGridContext((c) => c.tenant)` from a bundle whose context has no `tenant`
- **THEN** compilation fails

### Requirement: A grid's own context is a partial override of the factory default

On a bundle created with a factory context, the `context` accepted by the bundle's `DataGrid` and
`useDataGrid` SHALL be typed as a partial of the bundle's context type. A key the instance omits
SHALL keep the factory value.

#### Scenario: Instance overrides one key

- **WHEN** the factory default is `{ currentUser: null, permissions: { canEdit: false } }`
- **AND** a grid passes `context={{ currentUser: alice }}`
- **THEN** that grid reads `currentUser` as `alice` and `permissions` as `{ canEdit: false }`

#### Scenario: Instance key of the wrong type

- **WHEN** a grid from that bundle passes `context={{ currentUser: 42 }}`
- **THEN** compilation fails

#### Scenario: Key outside the context type

- **WHEN** a grid from that bundle passes a `context` key the factory default does not declare
- **THEN** compilation fails

### Requirement: The factory has a single context entry point

`createDataGrid` SHALL NOT accept `context` inside its `defaults` option. The `context` option
SHALL be the only way to set a factory-level context.

#### Scenario: Context written under factory defaults

- **WHEN** a bundle is created with `createDataGrid({ components, defaults: { context: { a: 1 } } })`
- **THEN** compilation fails

### Requirement: Context layers keep their merge order

The factory default, a `DataGridOptionsProvider` context and a grid's own context SHALL merge in
that order, nearer layers winning. Plain-object values SHALL merge recursively, key by key. Any
other value (array, class instance, store, primitive) SHALL be replaced as a whole.

#### Scenario: Three layers

- **WHEN** the factory default sets `a: 1, b: 1, c: 1`
- **AND** an enclosing `DataGridOptionsProvider` sets `context: { b: 2 }`
- **AND** the grid sets `context: { c: 3 }`
- **THEN** the grid reads `{ a: 1, b: 2, c: 3 }`

#### Scenario: Nested plain object merged

- **WHEN** the factory default sets `permissions: { canEdit: true, canDelete: true }`
- **AND** the grid sets `context: { permissions: { canEdit: false } }`
- **THEN** the grid reads `permissions` as `{ canEdit: false, canDelete: true }`

#### Scenario: Store replaced as a whole

- **WHEN** the factory default sets `highlight` to one store instance
- **AND** the grid sets `context: { highlight }` with another store instance
- **THEN** the grid reads the grid's store instance, unmerged

### Requirement: Grids without a factory context accept any object

Where no factory context is bound, the grid context SHALL be typed as a string-keyed record of
unknown values. This covers the kits' prebuilt `DataGrid`, a bare `useDataGrid`, a
`DataGridOptionsProvider`, and reading through the package-level `useGridContext`.

#### Scenario: Prebuilt grid takes an arbitrary context

- **WHEN** an application renders a kit's prebuilt `DataGrid` with `context={{ currentUser }}`
- **THEN** it compiles, and components inside the grid can read `currentUser`

#### Scenario: Package-level reader returns unknown values

- **WHEN** a component reads `useGridContext((c) => c.currentUser)` from the package entry, with no typing applied
- **THEN** the selected value is typed `unknown`

### Requirement: A typed reader can be derived without a factory

The package-level `useGridContext` SHALL provide `withTypes<T>()`, which returns a reader typed for
`T` and behaving exactly like `useGridContext`. Deriving it SHALL NOT validate `T` against the
context a grid actually carries.

#### Scenario: Derived reader is typed

- **WHEN** a module declares `const useAppGridContext = useGridContext.withTypes<{ tenant: string }>()`
- **AND** a cell reads `useAppGridContext((c) => c.tenant)`
- **THEN** the selected value is typed `string`, and at runtime the cell reads the grid's `tenant`

#### Scenario: Same subscription behaviour

- **WHEN** a cell reads one field through a derived reader and another field of the context changes
- **THEN** the cell does not re-render, as with `useGridContext`

### Requirement: No program-wide context declaration

The package SHALL NOT export a context interface meant to be extended by declaration merging. A
context type declared for one bundle SHALL NOT affect the context type of another bundle or of
untyped grids in the same program.

#### Scenario: Two bundles with different contexts

- **WHEN** one program creates bundle A with context `{ tenant: string }` and bundle B with context `{ tenant: number }`
- **THEN** both compile, and each bundle's `useGridContext` reads `tenant` with its own type

#### Scenario: Module augmentation no longer types the context

- **WHEN** an application writes `declare module '@ez-kit/data-grid-react' { interface GridContext { tenant: string } }`
- **THEN** the context type of every grid is unchanged by it
