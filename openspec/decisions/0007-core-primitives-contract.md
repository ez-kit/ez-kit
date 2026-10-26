# 0007. New UI is composed from `core` primitives

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0008-layouts-and-optional-slots](./0008-layouts-and-optional-slots.md)

## Decision

**New UI is composed from `core` primitives; the component contract grows only by generic ones.** Any new key in `FullGridComponents` breaks external kits (a major after 1.0). Rejected generics: `Popover`, `Chip`, `Select`, `Dialog` — re-proposing one needs a second real consumer. New cell types go through the kit's cell-type registry, not the contract.

## Context, rationale and rejected alternatives

- **New UI is composed from `core` primitives; the component contract grows only by generic
  ones.** A feature that needs a button, a menu, a dialog or a chip reaches for the `core` slot —
  the way the row-pin menu uses `core.Menu`, and every number field uses `core.NumberInput`, which
  is why that one sits in `core` rather than in `editing`. When nothing fits, what gets added to
  `FEATURE_COMPONENTS` is a **generic primitive in `core`**, never a component named for the
  feature that prompted it. New cell types are not contract slots at all — they go through the
  kit's own cell-type registry (`blocks/cell-types.ts`), a separate extension axis.
  The reason is `FullGridComponents`: it is `{ [F in GridFeature]: ComponentsFor<F> }` with every
  member required, so **any** new key — in an existing group or in a new group — is a compile
  error in every external kit that wrote `satisfies FullGridComponents`. After 1.0 that makes each
  feature-specific slot a major.
  The corollary: `core`'s primitive set must be complete **before** 1.0, because adding a
  primitive later is the same break — so settle the generics as part of the 1.0 cut rather
  than per feature.
  That audit ran against the features still ahead of 1.0, and **rejected all four** generics it
  considered — `Popover`, `Chip`, `Select` and a `Dialog`: re-proposing one needs a second real
  consumer, not a new argument. `core.Menu` is a full menu model (sections, named icons,
  `disabled`, `destructive`, a slot form), so density and group-by pickers go there; a preset chip
  is a toggle, so it is `core.Button` with `aria-pressed`; and the dialog already existed as
  `Modal`, which only needed moving out of the `editing` group.
  Making post-1.0 slots optional inside their group is a planned follow-up, and needs a runtime
  contract first. `ComponentGuard` already turns a missing component into a named dev error, but
  only for the ones whose need is unambiguous at render time — the structural primitives plus a
  few gated by a config that is definitively present. Everything outside that list still reaches
  React as `undefined` and crashes on first render.
