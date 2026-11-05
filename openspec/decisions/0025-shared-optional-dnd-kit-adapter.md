# 0025. Shared optional dnd-kit adapter

- Status: Accepted
- Recorded: 2026-11-05
- Related: [0002](./0002-shadcn-vendored-primitives-and-registry.md), [0014](./0014-tree-shaking-guarantees.md)

## Decision

The dnd-kit binding lives only at `@ez-kit/data-grid-react/dnd-kit`; ordinary entries expose the library-independent contract and never reach the binding. Both kits retain their `/dnd` compatibility and customization seams with explicit value/type re-exports. Both drag libraries remain aligned optional peers and external build imports, including sortable subpaths. Shared code authors no styles. The two shadcn registry items remain separate: the drag item copies only the compatibility wrapper and declares both peers; its grid dependency declares a React release supplying the new subpath. Production registry deployment follows publication of that release.

## Context, rationale and rejected alternatives

The two adapters had identical executable code and identical behavior suites. Keeping one provider and sortable hook avoids fixing each kit separately. Handles, visual primitives and ref forwarding still belong to each kit. A future differing adapter can implement the existing contract through its kit entry without adding configuration knobs now.

A shared helpers-only layer leaves most duplication. A new factory has no differing configuration to serve. A separate package adds release machinery for an existing optional-entry pattern. Putting the binding on the root or kit barrel would make optional drag peers reachable by ordinary imports. Externalizing only the root drag import can vendor its sortable subpath.

Behavior tests live beside the canonical adapter and run on React 18 and the standard environment. Kit tests retain all runtime identities and public types. Built-output tree-shaking and isolated consumer tests guard runtime and declaration optionality. Registry tests guard the separate file/dependency contract and use versioned package fixtures to reject releases missing the subpath. Versions advance through changesets rather than manual manifest bumps; the release flow keeps the production registry aligned with published packages. ADRs 0002 and 0014 remain accepted.
