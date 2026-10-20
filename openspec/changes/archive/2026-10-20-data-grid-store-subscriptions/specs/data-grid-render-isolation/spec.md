# Spec Delta

## Purpose

Defines how changes to grid state, grid context and grid options reach rendered components, so
that a component re-renders only when a value it reads changes.

## ADDED Requirements

### Requirement: Selector subscriptions re-render only on a changed selection

Reading grid state or grid context through a selector SHALL re-render the reading component only
when the selected value changes, judged by strict equality unless a comparison is supplied.

#### Scenario: Unrelated state change

- **WHEN** a component reads the sorting state through a selector and the column filters change
- **THEN** that component does not re-render

#### Scenario: Selected value changes

- **WHEN** a component reads the sorting state through a selector and the sorting changes
- **THEN** that component re-renders with the new sorting

#### Scenario: Context slice read

- **WHEN** a component reads one field of the grid context through a selector and another field of the context changes
- **THEN** that component does not re-render

### Requirement: Selectors may return derived objects

A selector that builds a new object or array on every call SHALL NOT cause an endless render
loop. When a comparison function is supplied, the component SHALL re-render only when that
comparison reports the selection as different.

#### Scenario: Fresh object without a comparison

- **WHEN** a component selects `(s) => ({ count: s.columnFilters.length })` with no comparison
- **THEN** the component renders without entering an infinite render loop

#### Scenario: Fresh object with a shallow comparison

- **WHEN** a component selects a fresh object with a shallow comparison and an unrelated state slice changes
- **THEN** the component does not re-render

### Requirement: Existing selector call sites keep their behaviour

The comparison argument SHALL be optional on every selector hook, and omitting it SHALL behave as
strict equality, so existing call sites compile and behave unchanged.

#### Scenario: Call site without the new argument

- **WHEN** an application calls a selector hook with only a selector, as before this change
- **THEN** it type-checks and re-renders on the same changes as before

### Requirement: Provider values are stable across host re-renders

Every context value the grid publishes SHALL keep its identity across a re-render of the grid's
host when the inputs it derives from are unchanged.

#### Scenario: Host re-renders with the same configuration

- **WHEN** the component that renders `<DataGrid>` re-renders with an unchanged configuration and the layout is passed as `children`
- **THEN** no cell, header cell or row component re-renders

#### Scenario: Cell type registry is not rebuilt

- **WHEN** the grid's host re-renders without changing the cell types it registered
- **THEN** components reading the cell type registry receive the same registry and do not re-render

### Requirement: A layout passed as children is isolated from its host

When the layout is passed to `<DataGrid>` as `children` created outside the host, a host
re-render that changes only the grid context SHALL re-render only components subscribed to the
changed part of the context.

#### Scenario: Context change from host state

- **WHEN** a host holds a permission in local state, passes it through `context`, and the permission changes
- **THEN** components selecting that permission re-render and other rows and cells do not

### Requirement: A store passed through context updates only its subscribers

A grid context field holding an external store with a stable identity SHALL NOT cause the grid to
re-render when the store's contents change.

#### Scenario: Store update outside React state

- **WHEN** the application updates a store that the grid context holds by reference
- **THEN** only components subscribed to that store re-render, and the grid itself does not
