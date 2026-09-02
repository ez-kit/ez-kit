---
'@ez-kit/form-heroui': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
---

Ship `'use client'` in the published bundles, make TanStack Form a peer dependency, and
complete the kits' re-export surface.

**Breaking** — `@tanstack/react-form` and `@tanstack/form-core` moved from `dependencies` to
`peerDependencies` (`^1.33.2`) on `@ez-kit/form-react`, `@ez-kit/form-shadcn` and
`@ez-kit/form-heroui`. The kits' `useForm` _is_ a TanStack Form hook and the types they
re-export are TanStack's own, so two copies in one tree would mean two `FormApi`s and two
sets of contexts. pnpm and npm install peers automatically; other package managers need the
dependency added by hand.

**Fixed** — the published `dist/index.js` of all three React packages now starts with
`'use client'`. The directive was present on the source modules but tsup bundles them into
one file and esbuild drops a directive that is no longer the first statement, so the shipped
bundle carried none and importing `Form` or `FormRenderer` from a React Server Component
failed with an unrelated-looking hook error. `@ez-kit/form-core` deliberately keeps no
directive — import the pure helpers (`parseFormSchema`, `stripHiddenValues`, …) from there in
a server component or a server action.

**Fixed** — both kits now re-export the whole consumer surface they claim to. Most visibly
`FormOptionSources`, which the option-sources docs already told readers to import from the
kit while only `@ez-kit/form-react` exported it. Also added: the `OptionSource*` types, the
field prop types for the kinds that were missing them (`MultiSelectFieldProps`,
`CheckboxGroupFieldProps`, `Date`/`DateRange`/`RadioGroup`/`Slider`/`SwitchFieldProps`),
`FormUncontrolledProps`, `BoundForm`, `KitFormApi`, `DateRangeValue`, `OptionsSource`,
`JsonValue`, the grid range helpers, and the remaining schema node types and traversal
helpers from `@ez-kit/form-core`. The kit-author contract (`createForm`, `FormComponents`,
the per-kind `*RenderProps`) stays out on purpose — writing a kit means depending on
`@ez-kit/form-react` directly.
