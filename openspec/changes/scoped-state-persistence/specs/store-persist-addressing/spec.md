# Spec Delta

## Purpose

Defines a stable state address shared by cache, persistence and reset, separating logical record identity from the physical representation selected by storage or URL adapters.

## ADDED Requirements

### Requirement: Addresses include the store and field

A logical address MUST include `StoreId` with path, name and id, plus the persisted field path. Cached stores MUST use their existing cache address. Consumers MUST NOT assemble field names and scopes into a parallel persistence key system.

#### Scenario: Same panel on two pages

- **WHEN** the `workspace` instance of group `panel`, with field `layout`, is created under `devices` and `users`
- **THEN** values are isolated both in memory and in persistent storage

#### Scenario: Multiple fields in one instance

- **WHEN** one store persists `layout` and `view`
- **THEN** the fields have different addresses and can be reset and versioned independently

### Requirement: Scopes extend structurally

Nested scopes MUST append to the parent path. Scope membership MUST compare segments, and address encoding MUST prevent separator collisions. A prefix reset MUST include the selected scope and descendants but MUST NOT affect similarly named siblings.

#### Scenario: Nested scope

- **WHEN** scope `['details']` is added within `['devices']`
- **THEN** the address contains path `['devices', 'details']`

#### Scenario: Special characters

- **WHEN** paths `['a/b']` and `['a', 'b']`, names containing dots, and empty segments are compared
- **THEN** different structural addresses do not collide

#### Scenario: Similarly named sibling scope

- **WHEN** `['devices']` is reset
- **THEN** `['devices', 'details']` is included, but `['devices-old']` is not

### Requirement: Identifiers are reproducible

Persistent addresses MUST be reproducible across reloads without random IDs or mount-order dependence. Context stores MUST support explicit stable addresses. Distinct live instances sharing a logical address in one source engine MUST be rejected.

#### Scenario: Reload in a different order

- **WHEN** panels with the same scope, name and id mount in reverse order after reload
- **THEN** each receives its own previously saved record

#### Scenario: Reconnecting the same instance

- **WHEN** lifecycle reconnects the same handle at the same address
- **THEN** registration is idempotent and is not treated as a collision between stores

#### Scenario: Two context instances with one singleton address

- **WHEN** two independent persisted stores share name, path and id in one engine
- **THEN** an address collision error occurs instead of implicit shared persistence

### Requirement: Partial writes preserve other data

Changing or deleting a record MUST affect only the selected addresses. Records of disconnected and never-mounted components, and unknown keys, MUST be retained. Returning an edited value to its default MUST delete its override when clearOnDefault is enabled.

#### Scenario: Unmounted neighboring panel

- **WHEN** A and B are saved, only A is mounted, and the user changes A
- **THEN** B remains unchanged in storage

#### Scenario: One field returns to default

- **WHEN** A returns to default with clearOnDefault while B has an override
- **THEN** only A is removed and B is retained

### Requirement: URL keeps its own key projection

Logical addressing MUST NOT require storage envelopes in public query parameters. The URL adapter MUST preserve declared readable keys, foreign parameters, push/replace and navigation restoration. Physical URL key collisions MUST be diagnosed.

#### Scenario: Changing a search filter

- **WHEN** a field with URL key `q` becomes `boots`
- **THEN** the URL contains `q=boots` without a required serialized StoreId or envelope

#### Scenario: Foreign query parameter

- **WHEN** the application changes `q` while `utm_source` exists in the URL
- **THEN** `utm_source` is retained

#### Scenario: Two owners of one URL key

- **WHEN** different stores in one URL engine declare the same physical key `q`
- **THEN** ambiguity is detected instead of mutual overwriting

### Requirement: Address format changes are explicit

The new contract MUST operate without a public mode/legacy switch. On a format change, old keys MUST NOT be automatically deleted, assigned a new address or imported by guessing. The migration guide MUST describe explicit transfer and fallback to defaults without transfer.

#### Scenario: Only legacy keys exist

- **WHEN** the new address is absent and old storage contains unaddressed fields
- **THEN** the store uses defaults without deleting the old fields

#### Scenario: Application supplies an explicit transfer

- **WHEN** the application explicitly maps a legacy key to a new address
- **THEN** the imported value follows ordinary version checks, migration and validation

### Requirement: Reset validates selected persisted fields

Reset MUST validate all explicit requested paths before memory or storage mutations. Unknown paths MUST fail rather than silently succeeding as an empty reset. Public control types SHOULD infer supported state paths through either binding, including nested objects/arrays; runtime membership remains authoritative for the selected persisted fields.

#### Scenario: Reset contains a misspelled field

- **WHEN** a reset selects layout and unknown layuot together
- **THEN** the operation fails before resetting layout or deleting either override

### Requirement: IndexedDB supports configured object-store provisioning

Built-in IndexedDB adapters MUST provision a missing configured object store in an existing database without deleting other stores. Owned connections MUST cooperate with version upgrades, and blocked/unavailable provisioning MUST surface as observable failure rather than false acknowledgement.

#### Scenario: Two sources share a database with different stores

- **WHEN** adapters select the same dbName and different storeName values
- **THEN** both can persist independently and provisioning the second store preserves the first
