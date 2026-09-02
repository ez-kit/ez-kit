---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

feat(form): a `loading` flag for option-bearing fields

`form.SelectField`, `form.MultiSelectField`, `form.RadioGroupField` and
`form.CheckboxGroupField` accept an optional `loading` boolean, so an app that fetches its
options can say which kind of empty list it is passing:

```tsx
<form.SelectField
	name='role'
	options={data ?? []}
	loading={isPending}
/>
```

Without it `options={data ?? []}` is ambiguous — "still fetching" and "the backend genuinely
offers nothing" both render as an empty dropdown, which is exactly the failure `assertOptions`
in `parseFormSchema` exists to prevent on the authoring side. It also covers the edit-form
case: a value restored from the server (`city: 'msk'`) arrives before the option that carries
its label, so the trigger would otherwise render blank.

Both kits disable the control while `loading` is true and show a skeleton where its value
would go — one bar in a select or multi-select trigger, a short list of placeholder rows in a
radio or checkbox group, which have no trigger to put a single skeleton in. The shadcn kit
adds the skeleton as a `blocks/` adapter (its vendored `components/ui/**` stays untouched);
the HeroUI kit uses HeroUI's own `Skeleton`.

Nothing in `@ez-kit/form-core` changes: `loading` is a rendering concern, not part of the
serialisable document format, and a statically authored `options` array renders as
`loading: false`.

Failure is deliberately **not** in the contract — no `error`, no `onRetry`. A retry button
inside a select popover is dubious UI and multiplies awkwardly across the four widgets, and
the code supplying the options can already surface a failed fetch itself.

**Breaking (kit contract).** `SelectFieldRenderProps`, `MultiSelectFieldRenderProps`,
`RadioGroupFieldRenderProps` and `CheckboxGroupFieldRenderProps` gain a **required**
`loading: boolean` key. A third-party kit implementing `FormComponents` still compiles if it
ignores the prop, but it will not render a loading state until it handles it; anything that
_constructs_ one of those props objects (a test harness, a wrapper component) must now supply
`loading`. Consumers of the shipped kits are unaffected — the new consumer prop is optional
and defaults to `false`.
