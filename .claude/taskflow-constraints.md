# taskflow — house rules for ez-kit

Injected into the implementation brief by `/taskflow:execute`. These are the rules a worker is
most likely to break without knowing this repo. Architecture and commands live in `CLAUDE.md`;
this file is only the short list that must survive into an autonomous run.

## Layer map (for decomposition)

Slices follow the package dependency direction:

```
data-grid/core            headless, TanStack Table         ← ready first
  └─ data-grid/react/react   framework adapter, zero styling
       ├─ react/shadcn        ┐
       ├─ react/heroui        │ parallel wave — each depends on the adapter,
       └─ react/native        ┘ never on a sibling
apps/docs                 depends on the flavours it documents  ← last

store-core                shared foundation
  ├─ zu-store             Zustand-backed
  └─ valtio-kit           Valtio-backed  (both depend on store-core, not on each other)
```

`FullGridComponents` (`data-grid/react/react/src/contract.ts`) is the `satisfies`-enforced
contract: it demands every feature group with every component. **`shadcn` and `heroui` register
with `satisfies FullGridComponents`; `native` does not** — it passes a partial `GridComponents`.

So adding a component key to the registry breaks the shadcn and heroui builds until both
implement it, while native keeps compiling. That change is atomic across the contract + those two
flavours: they go in **one** slice, whatever the file count. Verify the `satisfies` list before
slicing rather than assuming it — a flavour can move between full and partial.

## Package boundaries

- **No visual styling in `packages/data-grid/react/react`.** No inline `style={{}}`, no
  Tailwind/`className` styling. The shared React package may only add semantic `data-*`
  attributes for the UI kits' CSS to target. All visuals belong to `shadcn` / `heroui` / `native`.
- **`packages/data-grid/react/shadcn/src/components/ui/**`is vendored and immutable.** Every
behavioural override goes in`src/blocks/`adapters that wrap the primitives. This rule is
shadcn-specific — heroui's`src/components/ui/action-bar.tsx` is hand-written and freely
  editable.
- Public API is exported **only** from `src/index.ts`. ESM-only, strict TS, `import type` for
  types under `verbatimModuleSyntax`.

## Code style

- **No magic values.** Any literal that carries meaning — or appears twice — becomes a named
  constant (`UPPER_SNAKE_CASE`) or an `enum` member. Closed sets are `enum`s referenced by member
  everywhere, including tests. Prefer a lookup map over a `switch` used as a dispatch table.
  This overrides the general "prefer string literal unions" guidance for ez-kit code.
- Keep the commit scoped to the task. Never sweep in unrelated files.

## Changesets

- Every published-package change needs a changeset. **Write it in English** — it ships verbatim
  to the public npm CHANGELOG.
- Pre-1.0 packages ship breaking changes as **minor**, never major. Describe the break in the
  summary.

## Gate gotchas

- `build` must run before `typecheck`/`test`: package exports resolve to `./dist`, and turbo's
  `test` task declares `dependsOn: ["^build"]`. The gate script already enforces this order.
- A stale `apps/docs/.source` (fumadocs-mdx codegen) or `.next` makes the first docs build die
  with `Module not found: collections/server`. The gate wipes both before a docs build — do not
  chase that error, and do not commit either directory.
- There is deliberately **no** `test:visual` run in the gate: that suite screenshots only
  `/sandbox/data-grid/*`, its baselines are gitignored, and cold `next dev` turned it into ~18
  minutes of zero-signal timeouts.

## Docs examples

- Live examples live at `apps/docs/shared/examples/<package>/<name>.tsx`; MDX references them by
  relative path without the `.tsx` extension. No registry.
- **data-grid examples are the exception** — they are manifest-based. A new source file must also
  get a `sourceFile` → dynamic import entry in
  `apps/docs/shared/data-grid/examples/registry.ts`. Miss it and the example throws at render
  time while lint, typecheck, and build all still pass — nothing catches it for you.

## Review severity

- **CRITICAL / HIGH** block: the task stays in progress, the PR does not advance.
- **MEDIUM / LOW** do not block, but fix them when the fix is cheap and clearly correct, re-run
  the gate, and only then advance. Leaving a valid finding unaddressed because "it isn't
  blocking" is not acceptable; say so explicitly in the report if you deliberately skip one.
