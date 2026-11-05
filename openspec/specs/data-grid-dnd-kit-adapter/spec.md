# data-grid-dnd-kit-adapter Specification

## Purpose

Provides one optional dnd-kit integration for data-grid consumers while preserving kit imports,
drag behavior and the installation choices available through npm and the shadcn registry.

## Requirements

### Requirement: Consumers can import the shared adapter directly

The React package SHALL export `adapter` from `@ez-kit/data-grid-react/dnd-kit`. It MUST implement
the existing `DndAdapter` contract and remain stable across repeated imports. Consumers SHALL be
able to pass it to `createDataGrid({ dnd: adapter })` with either kit or a custom component bundle.

#### Scenario: Direct import with either kit

- **WHEN** a consumer imports the shared adapter and binds it to a shadcn or HeroUI bundle
- **THEN** the bundle supports the existing drag surfaces without a kit-specific adapter implementation

#### Scenario: Stable adapter identity

- **WHEN** a mounted bundle receives the adapter through repeated imports of the same module instance
- **THEN** the adapter identity does not change and no adapter-replacement warning is emitted

### Requirement: Existing kit runtime exports remain compatible

Both kit adapter entry points SHALL preserve `adapter`, `AnchorSide`, `dragActivationConstraints`,
`hasTravelled`, `toDragAnchor`, `toDragOverEvent` and `toDropEvent`. Their values MUST be the same
exports as those of the shared adapter module. The HeroUI npm subpath and installed shadcn file
path SHALL remain unchanged.

#### Scenario: Existing application imports

- **WHEN** an application imports any existing runtime adapter export from a kit's established path
- **THEN** the import resolves with the same API and behavior as before consolidation
- **AND** the value is identical to the corresponding shared export

### Requirement: Existing kit type exports remain compatible

Both kit adapter entries SHALL preserve the types `DragActivationConstraints`, `DragActivationEvent`,
`DragActivationSource`, `SortableDragEndEvent`, `SortableDragStartEvent`, `AnchorSide`, `DragAnchor`,
`SortableManager`, `DropContext` and `SortableDragOverEvent` with their existing meanings.

#### Scenario: Existing typed integration

- **WHEN** a consumer compiles existing imports of these types through either kit
- **THEN** they remain assignable to the corresponding shared types without changes to application code

### Requirement: Drag dependencies remain optional

The React package SHALL declare `@dnd-kit/react` and `@dnd-kit/dom` as optional peers, not mandatory
runtime dependencies. Importing or type-checking an ordinary React or kit entry MUST NOT require
either drag peer. Existing kit optional peer declarations SHALL remain compatible with the shared
adapter's supported ranges.

#### Scenario: Application without drag

- **WHEN** an application installs and uses ordinary React or kit entries without either drag peer
- **THEN** its imports and type checking succeed and its bundle contains no dnd-kit integration

#### Scenario: Explicit drag opt-in

- **WHEN** an application imports the shared adapter or a kit adapter entry with supported peers installed
- **THEN** the integration resolves successfully and activates only when supplied to the grid bundle

### Requirement: Builds preserve dependency isolation

Built adapter entries SHALL reference dnd-kit as external modules, including its sortable subpath.
Bundles of non-adapter entries MUST NOT reach those modules. The shared adapter MUST NOT pull
either UI kit's components, styles or the all-in grid compound into a consumer's bundle.

#### Scenario: Adapter bundle

- **WHEN** the built shared adapter or either kit adapter entry is bundled for a consumer
- **THEN** dnd-kit imports remain external and its implementation is not vendored into ez-kit output
- **AND** neither kit's visual components are included by the adapter

#### Scenario: Ordinary entry bundle

- **WHEN** any published non-adapter JavaScript entry is bundled
- **THEN** the shared adapter and dnd-kit modules are unreachable from that entry

### Requirement: Shadcn installation preserves the separate drag item

The `data-grid-dnd` registry item SHALL keep delivering `components/data-grid/dnd.tsx`, declaring
both drag dependencies and installing the grid item by its existing per-item URL. The resulting
installation MUST select a React package version that exports `./dnd-kit`. The ordinary grid item
MUST continue to contain no dnd-kit dependency or adapter import.

#### Scenario: Installing drag through the registry

- **WHEN** a consumer installs `data-grid-dnd` through its existing per-item URL
- **THEN** the installed adapter file resolves the shared entry from the declared React package version
- **AND** both supported drag dependencies and the grid item are installed

#### Scenario: Installing the ordinary grid

- **WHEN** a consumer installs only `data-grid`
- **THEN** no drag adapter file or dnd-kit dependency is installed by that item

### Requirement: Consolidation preserves drag outcomes

The shared adapter SHALL preserve existing pointer and keyboard activation, disabled-handle
behavior, axis/surface isolation, drop acceptance, displacement notifications and accessibility
announcements. A cancelled or refused operation MUST NOT commit a reorder.

#### Scenario: Accepted and refused drops

- **WHEN** the same drag operation is performed through the shared entry or either kit entry
- **THEN** accepted drops produce the same reorder and refused or cancelled drops produce no commit

#### Scenario: Supported drag surfaces

- **WHEN** a consumer drags rows, column headers, visibility entries or sort entries
- **THEN** each surface preserves its existing keyboard/pointer behavior and accessibility announcements
- **AND** operations on different axes or surfaces do not reorder one another
