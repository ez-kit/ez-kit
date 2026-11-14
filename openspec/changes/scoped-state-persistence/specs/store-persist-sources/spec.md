# Spec Delta

## Purpose

Defines registration and resolution of persistence sources so applications select storage by name without duplicated configuration or implicit writes to multiple sources.

## ADDED Requirements

### Requirement: Map and array registration

PersistProvider MUST accept an adapter map without a required internal `source`, as well as the existing array. A map MUST use its key as the source name; an array MUST use `adapter.source`.

#### Scenario: Map key determines the name

- **WHEN** an adapter with internal `source: 'localStorage'` is registered under `browser`
- **THEN** a field with `source: 'browser'` uses that adapter without an additional alias

#### Scenario: Arrays remain supported

- **WHEN** an array includes an adapter with `source: 'server'`
- **THEN** the source resolves as `server`

### Requirement: Each record selects one source

A field MUST use its explicit source or the nearest `defaultSource`. If neither exists, or the name is unknown, connection MUST report a configuration error with the address and available names. Registering other adapters MUST NOT enable fallback or fan-out.

#### Scenario: Default source

- **WHEN** a field omits source and the Provider sets `defaultSource: 'browser'`
- **THEN** its reads and writes use only `browser`

#### Scenario: Explicit source takes precedence

- **WHEN** a field selects `server` and defaultSource is `browser`
- **THEN** the field uses only `server`

#### Scenario: Unknown source name

- **WHEN** a field requests `missing`, absent from the effective registry
- **THEN** connection reports a diagnostic error without choosing another source

#### Scenario: Missing defaultSource

- **WHEN** a field omits source and no Provider supplies defaultSource
- **THEN** connection explains that a source must be selected

### Requirement: Nested inheritance by name

A nested Provider MUST inherit sources and defaultSource that it does not override. A matching name MUST be replaced only within the child scope. All public source lookup surfaces MUST expose the same effective registry.

#### Scenario: Extending the registry

- **WHEN** the parent registers `browser` and the child registers `server`
- **THEN** both names are available inside the child and only `browser` outside it

#### Scenario: Local override

- **WHEN** the child overrides `server` and defaultSource
- **THEN** new child stores use the child configuration while siblings use the parent configuration

### Requirement: Stable registration and instance ownership

Registration MUST keep source names, port identities and adapter kinds stable for the Provider lifetime. Actual replacement without remount MUST be diagnosed. A cache hit MUST preserve its birth registry, source and defaults; changing Provider MUST NOT silently reconnect that instance.

#### Scenario: Fresh object with the same registration

- **WHEN** a rerender supplies a new map with the same names and adapters
- **THEN** engines and store restoration are not recreated

#### Scenario: Replacing a port under the same name

- **WHEN** the Provider receives a different port for `server` without remount
- **THEN** a configuration error is reported and the store does not switch backend

#### Scenario: Cache outlives its registry

- **WHEN** a retained instance encounters a different registry after remounting the persistence Provider
- **THEN** reuse requires recreating the instance and performs no hidden rebind

### Requirement: Registration respects React lifecycle

Render-scoped adapter registration MUST preserve valid hook ordering. Duplicate source names in arrays MUST be rejected. An inherited engine MUST have one lifecycle owner; unmounting a child Provider MUST NOT destroy its parent engine.

#### Scenario: Reordered map properties

- **WHEN** a rerender changes only enumeration order of the same adapters
- **THEN** hook order remains valid and engine identities are preserved

#### Scenario: Duplicate names in an array

- **WHEN** two array elements declare `source: 'server'`
- **THEN** the Provider rejects ambiguous registration

#### Scenario: Unmounting a child Provider

- **WHEN** a child Provider inheriting `browser` unmounts
- **THEN** parent stores continue using their original engine

### Requirement: Persistence identity excludes unrelated services

Changing unrelated dependency-injection services MUST NOT replace the effective persistence registry when its engines/defaultSource are unchanged. Render-scoped returned port identity MUST be validated even when the usePort function itself stays stable.

#### Scenario: Locale changes without changing sources

- **WHEN** an outer service registry changes locale but all persistence engines and defaultSource stay the same
- **THEN** existing stores remain connected without a birth-registry replacement error

#### Scenario: A stable hook returns a different port

- **WHEN** the same usePort hook returns another port without remount
- **THEN** the Provider diagnoses replacement rather than splitting reads/writes and subscriptions across ports

### Requirement: Source selectors are unambiguous

Explicit named control handles MUST select that exact registered source, independently of shorthand control names. Unknown explicit sources MUST be diagnosed rather than returning a handle that falsely confirms flush success.

#### Scenario: A source is named dollar persist

- **WHEN** a store has sources first and $persist and reset selects the literal $persist source
- **THEN** only that named source resets and the shorthand cannot redirect the operation

#### Scenario: A source selector contains a typo

- **WHEN** a consumer selects sevrer while the source binding is named server
- **THEN** selection reports a diagnostic with available names instead of an inert successful flush

### Requirement: Source-specific restore policy overrides shared defaults

PersistOptions.restore MUST support source-keyed timeout/externalChanges overrides using the effective registered source alias. Global options remain defaults. Resolution MUST happen before initial reading without mutating caller configuration or enabling fallback/fan-out. Unknown override names MUST be diagnosed before I/O; registered unused sources remain valid. Existing pending restore deadlines MUST remain unchanged by joining calls.

#### Scenario: Layout and drafts have different deadlines

- **WHEN** shared timeout is 2000 ms and draftsApi overrides it to 10000 ms
- **THEN** settingsApi can time out after 2000 ms while draftsApi keeps waiting for its own deadline

#### Scenario: Sources use different external-change policies

- **WHEN** one source inherits ignore and another overrides externalChanges to apply
- **THEN** external events affect only the binding whose effective policy permits them

#### Scenario: An override references an unknown alias

- **WHEN** restore.sources contains a name absent from the effective registry
- **THEN** setup reports a configuration error before any source read

### Requirement: Field helpers support source aliases

Storage/URL accessor helpers and decorators MUST accept explicit source aliases while retaining their existing default source names. Unknown decoders plus typed schema validators MUST remain composable through helpers.

#### Scenario: Browser is an alias for local storage

- **WHEN** local storage is registered as browser and a storage helper selects source browser
- **THEN** its fields resolve through browser without requiring a hand-written replacement descriptor
