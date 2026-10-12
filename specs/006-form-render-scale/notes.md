# Notes: render scale for `@ez-kit/form`

**Date:** 2026-09-15
**Status:** Open topic — nothing designed, nothing decided. Collected so the discussion starts
from evidence rather than from scratch.
**Related:** `specs/005-form-array-fields/design.md` (D18 defers here)

## Why this file exists

Array fields make form size a function of **data**, not of the schema. Everything before them
was bounded by what an author typed. A repeatable group is not: the same three-level schema
renders three fields or three million depending on the payload.

This surfaced while deciding whether `parseFormSchema` should cap nesting depth (it should not
— D18). The depth question turned out to be a non-issue; the fan-out question underneath it is
the real one, and it is bigger than arrays.

## The shape of the problem

One array of 100 items × a nested array of 100 × a nested array of 100 = **10^6 fields**, from
a schema small enough to fit on a screen. No schema-side limit touches it, because the
multiplier lives in the values.

Two things make this worse than a generic "long list" problem:

- Every leaf is a real TanStack field with its own store subscription, not an inert row.
- Each kit's field is a full component (React Aria contexts in HeroUI, Radix primitives in
  shadcn), so the per-field constant is large.

Nothing here is measured yet. The numbers above are arithmetic, not benchmarks.

## What is already known

From the array-fields prototypes (`specs/005-form-array-fields/design.md`):

- **Type-level cost is not the constraint.** 20 nesting levels and 120 arrays typecheck in
  ~2.0–2.4 s, flat, because TS instantiates lazily (P4).
- **Parser recursion** overflows between 3 000 and 6 000 levels, non-deterministically — stack
  usage varies with frame size and JIT state. Irrelevant for realistic documents; recorded
  because it is the only hard number about traversal cost we have (D18).
- **`JSON.parse` is not a gate** — V8 parses iteratively and handles 100 000 levels.

## What is NOT known

- **Render cost per field**, for either kit. No benchmark exists.
- **IDE cost.** P4 measured `tsc`, which batch-checks. The language server also computes
  completions, a different profile — a form with many arrays may autocomplete slowly while
  `tsc` stays fast. Explicitly unmeasured.
- **Where the knee is.** 100 items in one flat array is presumably fine; 10 000 presumably is
  not. Nobody has looked.
- Whether TanStack's own store fan-out (one subscription per field) is the binding cost or a
  rounding error next to the kits' components.

## Candidate directions — none chosen

- **Virtualize array items.** The obvious answer for long flat lists, awkward for nested ones
  and hostile to "jump to the invalid field" and to native find-in-page.
- **Cap item count**, at the schema or the renderer. Cheap, but a form that silently stops
  rendering the user's data is its own defect.
- **Render collapsed items lazily** — an item that is not expanded mounts nothing. Fits the
  `ArrayItem` slot, which the kit owns anyway, and needs no new contract.
- **Iterative traversal** in `walkNodes` / `assertNodeShape`. Removes the parser's stack limit
  entirely with no arbitrary constant. Not needed today (D18); listed so the option is not
  rediscovered.

## First step when this is picked up

Benchmark before designing. The arithmetic above says a million fields is possible; it says
nothing about where the practical limit sits, and every direction in the previous section
trades away something real. Measure one kit at 100 / 1 000 / 10 000 fields, flat and nested,
and let the knee pick the approach.
