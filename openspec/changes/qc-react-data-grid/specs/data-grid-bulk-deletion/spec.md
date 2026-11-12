## Purpose

Defines explicit execution of selected-row deletion so applications control bulk requests and partial-failure semantics instead of inheriting an implicit per-row loop.

## ADDED Requirements

### Requirement: Bulk deletion requires its own executor

Enabled bulk deletion SHALL require an explicit bulk onDelete handler. The grid SHALL NOT fall back to single-row onDelete. A connector-provided deleteMany handler SHALL satisfy this requirement. Invalid dynamic configuration SHALL identify the missing bulk executor.

#### Scenario: Single delete alone
- **WHEN** bulk is enabled and only a single-row onDelete is available
- **THEN** configuration is rejected and no per-row deletion loop is started

#### Scenario: Connector supplies executor
- **WHEN** bulk is explicitly enabled and a connected source supplies deleteMany
- **THEN** the connector installs a bulk handler without requiring the consumer to duplicate it

### Requirement: One bulk invocation per confirmed action

After required confirmation, bulk deletion SHALL call its executor once with the resolved selected rows and IDs. It SHALL preserve existing confirmation behavior and clear successfully deleted selection after the handler resolves. Rejection SHALL NOT report the whole batch as successfully deleted.

#### Scenario: Confirm selected deletion
- **WHEN** a user confirms deleting five resolved selected rows
- **THEN** the bulk handler is called once for those rows and IDs
- **AND** successful resolution clears their selection

#### Scenario: Bulk failure
- **WHEN** the bulk handler rejects
- **THEN** no automatic single-delete fallback runs and selection is not cleared as if the whole batch succeeded

### Requirement: Application-owned sequential deletion

Applications requiring multiple single deletes SHALL provide an explicit bulk handler implementing that behavior. The grid SHALL NOT infer per-row success from arbitrary response envelopes or implement a partial-success protocol in this version.

#### Scenario: Explicit loop
- **WHEN** a project's bulk handler performs sequential API calls and stops on an error
- **THEN** the project owns partial-success reconciliation and the grid performs no additional delete calls
