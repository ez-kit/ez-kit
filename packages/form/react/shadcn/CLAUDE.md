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

`createForm({ components })` in `src/form.tsx` is wired exclusively to `src/blocks/*`
adapters, which internally re-use `src/components/ui/*` primitives. Always add or override
behaviour in `src/blocks/`, never in `src/components/ui/`.

All visual styling for the form lives in this package: `@ez-kit/form-react` contains none
by design and only emits `data-*` attributes.
