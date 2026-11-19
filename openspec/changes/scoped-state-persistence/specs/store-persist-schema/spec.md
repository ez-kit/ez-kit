# Spec Delta

## Purpose

Defines independent evolution of persisted state formats so changing one layout does not require migrating other records, and an old application cannot destroy newer data.

## ADDED Requirements

### Requirement: Schemas belong to records

A field MUST support optional `schema` with version, minVersion, migrate and validate. The version MUST belong to that record independently of the container and other records. Unsupported source schema capabilities MUST be diagnosed before I/O.

#### Scenario: Independent layout versions

- **WHEN** workspace uses version 1 while details moves from version 2 to 3
- **THEN** migrating details neither changes workspace nor requires raising the container version

#### Scenario: Source lacks record version support

- **WHEN** a field declares version 2 for an adapter without version metadata support
- **THEN** connection reports the missing capability instead of ignoring the version

### Requirement: Missing versions mean zero

Missing versions in declarations and recognized values MUST mean 0. Explicit version and minVersion MUST be finite nonnegative integers, and minVersion MUST NOT exceed version. Invalid stored version metadata MUST be treated as damage to that record only.

#### Scenario: Simple state without a schema

- **WHEN** state was saved without a version and the application also omits version
- **THEN** the value is processed as version 0

#### Scenario: Moving from zero to one

- **WHEN** the application declares version 1 and migrate, while a recognized record omits version
- **THEN** migrate receives fromVersion 0

#### Scenario: Invalid configuration

- **WHEN** version is -1 or minVersion exceeds the current version
- **THEN** connection rejects the configuration

### Requirement: Validation follows migration

The parser MUST decode without requiring current-shape validation. A matching version MUST run validate when supplied. A supported older version MUST run migrate before validate. Only the returned validated value MUST enter the store.

#### Scenario: Current format

- **WHEN** versions match and validate returns a normalized value
- **THEN** the returned value is applied and migrate is not called

#### Scenario: Old format fails current Zod validation

- **WHEN** migrate transforms the old structure into a valid current structure
- **THEN** current Zod validation runs after migrate and restoration succeeds

### Requirement: Migration performs no I/O

Migrate MUST be a synchronous transformation of value and fromVersion without its own I/O. Validate MUST synchronously return the current value or throw. A successful format upgrade MUST be saved through the ordinary write mechanism with operation validity checks.

#### Scenario: Successful version upgrade

- **WHEN** an old record migrates and validates successfully
- **THEN** the new value is applied and its current version is queued for persistence

#### Scenario: User edit precedes rewrite

- **WHEN** the user changes the value after migration but before its rewrite is sent
- **THEN** saving the migrated result does not overwrite the user edit

### Requirement: Unsupported old records are invalidated

If a version is older than current without migrate, or below minVersion, the system MUST retain the original default and delete only that record override. MinVersion MUST be checked before migrate. A late read MUST NOT reset user-edited state.

#### Scenario: Missing migrate

- **WHEN** version 1 is stored, version 2 is declared and migrate is absent
- **THEN** the default is used and only the obsolete record is deleted

#### Scenario: Dropping support for an old format

- **WHEN** stored version is 0 and minVersion is 1
- **THEN** migrate is not called and the old record is removed

### Requirement: Damage is isolated

Envelope, decode, migrate or validate errors MUST retain the default for the affected clean record, report error context and invalidate only its override. Other records MUST restore independently. A stale read MUST NOT initiate invalidation.

#### Scenario: One panel fails validation

- **WHEN** workspace passes validate while details fails
- **THEN** workspace restores, details keeps its default, and only the details override is deleted

#### Scenario: Timeout before damaged data arrives

- **WHEN** a damaged response arrives after timeout
- **THEN** it is not applied and causes no deletion or rewrite

### Requirement: Future formats are protected

Versions newer than supported MUST be checked before decode/migrate/validate. Such a record MUST remain in storage, stay unapplied and block automatic writes and clearOnDefault for its address. Users MUST remain able to edit in-memory state and explicitly reset the record.

#### Scenario: Old application opens a new record

- **WHEN** stored version is 4 while the application supports version 2
- **THEN** the default is used, schema callbacks are not called and status reports future-version

#### Scenario: Editing memory with a future version

- **WHEN** the user edits the protected local record and calls flush
- **THEN** the future version is not overwritten and status explicitly reports blocked persistence

#### Scenario: Future version is unread because of timeout

- **WHEN** restore times out, the user edits memory and storage contains a future version
- **THEN** an ordinary commit detects incompatibility without replacing the future record

#### Scenario: Explicit removal of a future format

- **WHEN** the user explicitly resets the protected address
- **THEN** the override is deleted and the block clears after deletion is acknowledged

### Requirement: Zod is not a transport parser

The public API MUST exclude zodParam and validator subpaths. Applications MUST be able to use Zod through schema.validate without a runtime persistence dependency on Zod. The validate return type MUST match the persisted field type.

#### Scenario: Zod after JSON

- **WHEN** a field uses paramJson and `validate: value => layoutSchema.parse(value)`
- **THEN** migration precedes validation and the typed Zod result enters the store

### Requirement: Container migrations preserve semantics

Existing adapter version/migrate MUST remain a separate layer with their previous container transformation rules. Their rewrite MUST coordinate with timeout/reset and MUST NOT bypass the queue from a stale read operation.

#### Scenario: Old container without migrate

- **WHEN** container version is below current but container migrate is absent
- **THEN** the container follows existing rules without new implicit invalidation

#### Scenario: Container migrate throws

- **WHEN** container migrate throws an exception
- **THEN** the previous container fallback result is preserved rather than replaced by new per-record rules

### Requirement: New valid reads supersede stale invalidation intent

A successful current restore MUST cancel obsolete pending invalidation/deletion from an earlier read before it can erase the newly validated value. This MUST retain the priority of user edits, explicit reset barriers and future-version guards.

#### Scenario: A valid retry precedes pending invalidation

- **WHEN** an invalid read queues deletion and a retry obtains a valid value before that deletion is sent
- **THEN** subsequent flush does not delete the value restored by the newer operation

### Requirement: Helper types preserve decoder and validator independence

Public field helpers MUST accept an unknown-output decoder with a validator returning the current field type without widening away the required validator. Wrong validator output MUST remain a type error through both bindings.

#### Scenario: JSON decoder and typed validator use a helper

- **WHEN** localStorageField or urlField combines paramJson with schema.validate returning Layout
- **THEN** the Layout field declaration typechecks without casts, and an incompatible validator remains rejected

### Requirement: Authoritative absence releases obsolete future protection

An authoritative current read proving that a previously future-version record is absent MUST release
its obsolete in-memory write block. Normal adapter-side version guards MUST still protect later races.

#### Scenario: Another client removes a future-version record

- **WHEN** an allowed external read confirms deletion of a previously blocked future-version value
- **THEN** memory returns to default and later ordinary edits can persist without an explicit reset

### Requirement: Built-in codecs preserve semantic equality and round trips

Array equality MUST compose item codec equality, including Date and nested/object values. Supported
array values MUST survive stringify/parse without empty-item or delimiter collisions. Legacy values
MUST remain readable where unambiguous. Number parsing MUST reject non-finite values and overflow.

#### Scenario: A pristine Date array has a persisted value

- **WHEN** defaults contain cloned Date instances and another date array is saved
- **THEN** restore applies the saved timestamps and returning to default timestamps clears its override

#### Scenario: An array contains one empty string or an unsafe legacy delimiter

- **WHEN** values include one empty string or a custom separator collides with encoded item content
- **THEN** new serialization distinguishes the values and round-trips every item

#### Scenario: An external number is infinite

- **WHEN** a stored numeric value is Infinity, negative Infinity or finite-syntax overflow
- **THEN** parsing reports invalid input rather than applying non-finite state

### Requirement: JSON equality preserves serialized value semantics

JSON codec equality MUST honor native serialization including Date/toJSON before recursive
canonical ordering. Own special keys MUST remain data. A changed validated value MUST NOT be
mistaken for its default because canonicalization discarded serializable content.

#### Scenario: Validation converts serialized dates into current Date values

- **WHEN** a JSON decoder plus validator restores a Date then the application changes its timestamp
- **THEN** flush saves the changed timestamp and only the original default timestamp clears the override

#### Scenario: JSON data has an own prototype-named key

- **WHEN** two valid JSON objects differ in their own **proto** value
- **THEN** equality distinguishes them without changing their prototypes or dropping the key

#### Scenario: Nested objects occur inside arrays

- **WHEN** JSON containers differ only in property insertion order at arbitrary array/object depth
- **THEN** canonical equality treats their serialized values consistently

### Requirement: Default snapshots preserve supported data serialization

Default snapshots MUST preserve supported ordinary data descriptors, toJSON behavior and nested data
prototypes without newly invoking schema validation on application defaults. Snapshot serialization
MUST remain faithful to the original supported default for restoration, reset and clearOnDefault.
Unsupported opaque state MUST fail before source I/O rather than causing destructive invalidation.

#### Scenario: A plain default declares non-enumerable toJSON

- **WHEN** parser and validator round-trip that value and storage contains a different valid value
- **THEN** the original default remains eligible for restoration and edited values can be cleared or reset

#### Scenario: A plain default contains a nested data serializer

- **WHEN** a nested ordinary data prototype supplies toJSON
- **THEN** its snapshot retains the same serialization and independent reset data

#### Scenario: The application default does not pass the incoming-data validator

- **WHEN** the instance captures an intentionally empty application default
- **THEN** capture does not newly invoke validation or reject that default for an incoming-data rule
