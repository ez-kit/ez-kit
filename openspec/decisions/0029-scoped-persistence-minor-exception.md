# 0029. One-time minor release exception for scoped persistence

- Status: Accepted
- Recorded: 2026-11-13
- Related: [0017](./0017-release-from-develop.md), [0028](./0028-scoped-state-persistence.md)

## Decision

The user explicitly authorized a one-time breaking minor release for scoped-state-persistence,
including removal of zodParam/validator subpaths, scoped storage addressing and the changed ambient
external-change default. Each affected store package receives its own minor changeset with BREAKING
notes. Package versions remain independent; no fixed/linked release group is introduced. The ordinary
major-release rule remains in force for other breaking changes.

## Context, rationale and rejected alternatives

The user chose this exception instead of a public mode switch and parallel legacy engine while
agreeing the design. It is a deliberate compatibility cost, not a claim that these changes are additive.
Previously published caret ranges may accept the incompatible minor and cannot be repaired
retroactively. Consumers should upgrade the bindings and shared packages together, review the
migration guide and pin versions where necessary. New bindings must resolve the new core/persistence
dependency floors; workspace:^ expands against each package's release version when packed.

Existing storage namespaces remain readable by the old release and are not automatically imported
or removed. A new storageKey allows rollback without deleting the previous namespace; transfer is
explicit. Publishing still uses the established release flow and is not authorized by implementation.

Rejected: silently calling this semver-compatible, changing general version policy, fixed/linked
version groups, and releasing a compatibility mode that would duplicate the engine indefinitely.
