# @ez-kit/form-shadcn — Package Rules

## `src/components/ui/**` is immutable

Files under `src/components/ui/**` are vendored shadcn UI primitives. They are upstream-owned.

- Do NOT edit, refactor, restyle, or "fix" anything in `src/components/ui/`.
- Adapters that translate the `@ez-kit/form-react` contract onto those primitives
  (value/onChange shapes, `invalid` → `aria-invalid`, the flat `options` list → Radix's
  compound select, …) live in `src/blocks/`.
- If a primitive truly needs to change, propose an adapter in `src/blocks/` first. The
  vendored file stays untouched.

This rule applies to humans and to AI assistants — no exceptions.

## Layering

Every form component is a `src/blocks/*` adapter, which internally re-uses `src/components/ui/*`
primitives. Always add or override behaviour in `src/blocks/`, never in `src/components/ui/`.

Three modules put those adapters on the package root, and the split is what lets the root
tree-shake:

- `src/index.ts` exports each component **straight from its block**, never through `./form`.
- `src/sets.ts` holds `allFormFields` / `allFormComponents` — every component at once, in the two
  bags `createForm` takes. Importing one is a deliberate "everything".
- `src/form.tsx` holds the prebuilt bundle and nothing else: one `/* @__PURE__ */ createForm(…)` and
  one `/* @__PURE__ */ createSchemaForm(…)`, each with a flat, spread-free argument, and exports
  that read the bundle only inside a function body. A top-level property read
  (`export const Form = kit.Form`) or a spread argument anchors both bundles and every component
  they register; `apps/docs/test/tree-shaking.test.ts` fails if one comes back.

Accepted residue: a one-field form still carries a few hundred bytes of top-level statements from
the vendored `components/ui/combobox.tsx` and `components/ui/input-group.tsx` (a property read, a
`forwardRef` call, two `cva` calls) and the `@base-ui/react` import line, which esbuild cannot prove
pure. It stays because vendored files are not edited; the combobox's real code is still dropped.

All visual styling for the form lives in this package: `@ez-kit/form-react` contains none
by design and only emits `data-*` attributes.
