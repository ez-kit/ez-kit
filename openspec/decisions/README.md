# Architecture decision records

Long-lived decisions about this repository, with the reasoning behind them. `AGENTS.md` carries
each decision as a short rule and links here; this directory carries why it was made, what was
measured, and what was considered and rejected.

An OpenSpec change records its decisions in its own `design.md`, and that file goes to
`openspec/changes/archive/` with the change. A decision that should outlive the change — one a
later change must not silently undo — is copied here as an ADR before the change is archived.

## Format

One file per decision, `NNNN-kebab-slug.md`, numbered in order and never renumbered.

```md
# NNNN. Title

- Status: Accepted | Superseded by [NNNN](./NNNN-slug.md)
- Recorded: YYYY-MM-DD
- Related: [NNNN-slug](./NNNN-slug.md)

## Decision

The rule, in one paragraph. The same text, plus a link here, goes into `AGENTS.md`.

## Context, rationale and rejected alternatives

Why, what was measured, what was tried and rejected, and which test guards it.
```

## Rules

- An accepted ADR's decision is not edited in place. To reverse it, write a new ADR and set the old
  one's status to `Superseded by …`; update the rule in `AGENTS.md` to point at the new one.
- Correcting a fact in the rationale (a renamed file, a moved test) is an ordinary edit.
- Do not put byte counts or other figures that go stale in an ADR; point at the test that holds
  them.
- ADRs 0001–0014 were moved verbatim out of `AGENTS.md` on 2026-10-26, so their rationale keeps
  that file's voice, including references to "this section" or "the note above".
