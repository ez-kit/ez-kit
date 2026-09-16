# Handoff: form array fields

**Written:** 2026-09-15, because the implementing session ran out of context.
**Worktree:** `/Users/sergejolcev/orca/workspaces/ez-kit/form-update` — a git worktree. Run
everything from there; do not `cd` to the main checkout.
**Branch:** `easylimeyep/form-update`, forked from `fa3470df`. **Nothing is committed.** The whole
change is uncommitted in the working tree.

Read `design.md` next to this file first — it holds the 18 decisions, the five prototypes and a
section on what implementation changed about the plan. This file is only about _where things
stand_.

## Done and verified

| package               | tests                        | typecheck | lint  |
| --------------------- | ---------------------------- | --------- | ----- |
| `@ez-kit/form-core`   | 154                          | clean     | clean |
| `@ez-kit/form-react`  | 171 (also green on React 18) | clean     | clean |
| `@ez-kit/form-shadcn` | 47                           | clean     | clean |
| `@ez-kit/form-heroui` | 45                           | clean     | clean |

Root `pnpm typecheck` passes (28/28 tasks). Root `pnpm lint` passes. `size-limit` passes —
`form-react`'s budget was raised 7.5 KB → 9 KB against an actual 7.74 KB, which is the ~15%
headroom convention AGENTS.md describes.

Slices 1–4 of `design.md` are complete: core, the JSX API, the schema renderer, and both kits.
A changeset is written (`.changeset/form-array-fields.md`) and passes `check-changesets.mjs`.

## In flight when the session ended — **verify before trusting**

Two subagents were still running. Subagents die with their session, so their work is on disk in
whatever state they left it, and **nobody reported it finished.**

1. **Docs** (`apps/docs/content/docs/form/arrays.mdx`, the two example components, `manifest.json`,
   `registry.ts`, `meta.json`, `FormKit.tsx`, `page-type-map.ts`). The agent verified all of this
   green **before** a late API change, then was asked to make one edit it never confirmed:
   `max` was removed from `ArrayFieldProps`, so the page's option table must drop the `max` row
   **and** the matching `expectedCount` in `page-type-map.ts` must go down by one. That count is
   pinned by a test, so `pnpm --filter @ez-kit/docs test` will say so if it was not done.
2. **e2e** (`apps/docs/e2e/packages/form/arrays/*.spec.ts`, plus edits to `apps/docs/e2e/fixtures.ts`
   and `apps/docs/test/e2e-slots.test.ts`). Two spec files exist. **No verification was ever
   reported** — assume unproven. Form had zero browser specs before this, so `e2e/packages/form/`
   is entirely new.

## What to do first, in order

```bash
pnpm --filter @ez-kit/form-core build && pnpm --filter @ez-kit/form-react build
pnpm --filter @ez-kit/docs test        # catches the page-type-map count and e2e-slots
pnpm --filter @ez-kit/docs lint
```

Then the browser suite (see `apps/docs/package.json` — `test:e2e`; it needs the docs app built or
served, so follow the existing script rather than inventing a command). Both kits must pass.

Finally `pnpm run ci` at the root, which is what the PR is gated on:
`lint + typecheck + test + build + size`.

## Gotchas that cost time already

- **`pnpm exec vitest run --root <pkg>` does not work here.** The shared config resolves
  `setupFiles` relative to its own URL and `--root` re-anchors it, so every suite fails to collect
  with `Cannot find module '<repo root>/vitest.setup.ts'`. Run vitest from **inside** the package
  directory, or use `pnpm --filter <pkg> test`.
- **`pnpm --filter @ez-kit/form-react test` alone can fail** with `Failed to resolve entry for
@ez-kit/form-core` — it bypasses turbo's `dependsOn: ["^build"]`. Build core first, or go
  through turbo.
- **`tsc --noEmit` and tsup's dts build do not always agree.** One API mismatch (`LocalizedText`
  vs `ReactNode` in the reorder captions) passed `tsc` and was caught only by `pnpm build`.

## Known remaining work

- The two in-flight items above.
- `specs/006-form-render-scale/notes.md` — the fan-out question, deliberately out of scope here.
  Nothing is decided in it; it exists so the discussion starts from evidence.
- `FormRenderer` cannot infer `TValues` from `schema` alone, so `onSubmit`'s `value` arrives as
  `unknown` unless `defaultValues` pins it. Pre-existing, unrelated to arrays, not addressed here.
  Worth a line on the schema docs page if someone picks it up.

## Do not re-litigate

`design.md` records 18 decisions with their reasoning and their rejected alternatives, and a
section naming the three things the plan got wrong. The costly ones to rediscover:

- `useFieldGroup` **cannot** carry an item scope — it freezes its API on first render, and a
  stale scope writes a phantom array element. Prototype P1 has the measured output.
- Component identity must be stable **per entry key**, not per index. A remount is invisible in
  the submitted values and shows only in control-local state.
- Nesting depth and array count are **not** a type-system constraint — 20 levels and 120 arrays
  typecheck flat (P4).
