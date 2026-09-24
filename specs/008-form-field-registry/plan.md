# Implementation plan — form field registry

**Date:** 2026-09-23
**Status:** planned; open questions in §7 unanswered at time of writing.
**Related:** `specs/003-form-schema/`, `specs/005-form-array-fields/design.md`

## 1. Target shape

```tsx
// app/form.ts
import { createForm, formComponents, formFields } from '@ez-kit/form-shadcn'
import { RatingField } from './fields/rating'

export const { useForm, Form, FormRenderer, withForm, withFieldGroup } = createForm({
	components: formComponents, // chrome, closed — 7 slots
	fields: { ...formFields, RatingField }, // field kinds, open — 12 built-ins + yours
})
```

`form.RatingField` exists on the instance, typed; `{ type: 'rating' }` resolves in a schema
document; inside `form.ArrayField` it is scoped to the entry with no extra work.

## 2. Decisions, checked against the code

1. **Two bags; the array slots are chrome.** Confirmed: `ArrayField` / `ArrayItem` are consumed by
   `createArrayField` / `createArray` (`fields/array-field.tsx:121,191`), which take the whole
   `FormComponents` and read `components.Button` at `:511`. They are not per-kind binders.
2. **The 12 built-ins live in `fields`.** Confirmed and cheap: `buildFieldComponents` already
   destructures exactly those twelve off `components` (`build-field-components.tsx:33-49`) and
   nothing else does.
3. **Key by component name; derive the document id** (strip a trailing `Field`, lowercase).
   Confirmed exhaustively against `FormFieldType` (`packages/form/core/src/field-types.ts:8-21`):
   all twelve round-trip. The reverse direction is lossy — `radiogroup` cannot yield
   `RadioGroupField` — which is why this direction was chosen.
4. **Built-ins keep their bespoke binders; unknown keys get one generic binder.** Confirmed, with
   a gap: see §3.3. `createSelectField` wraps `FieldOptions` _above_ `AppField`
   (`fields/select-field.tsx:25-34`) and no generic wrapper reproduces that.
5. **`defineFieldType<TProps, TValue>()`.** `defineCellType`
   (`packages/data-grid/react/react/src/cell-types-context.tsx:87-90`) is the precedent: curried,
   returns the definition unchanged, records the config in a type-only phantom. Needs **two**
   parameters here, not one — see §3.3.
6. **`FormRenderer`'s `fields` prop stays, layered over the factory registry.** Confirmed:
   `SharedRendererProps.fields` (`schema/form-renderer.tsx:58`) threads to
   `RenderNodeContext.fields` (`schema/render-node.tsx:51`), looked up at `:277`.
   **Correction to the precedent:** do _not_ port data-grid's `mergeCellTypes`. It merges per entry
   because a cell type is an object of four slots; a field type is a single component, so a plain
   `{ ...factory, ...perForm }` already is entry-by-entry.
7. **Kit exports:** `createForm`, `formComponents`, `formFields`, every field individually, and the
   ready-made default bundle stays. The comment to rewrite is `shadcn/src/index.ts:3-8` and the
   identical `heroui/src/index.ts:3-8`.
8. **Multiple bundles in one app are the app's problem.** Confirmed:
   `createFormHookContexts()` runs per `createForm` call (`create-form.tsx:76`), so two bundles have
   disjoint contexts. Documented warning, not a mechanism.
9. **The proposed slicing was wrong** — see §5.0.

### Already stale, found while checking

- **`custom-kit.mdx:94` says "every one of the seventeen is required."** `FormComponents` has
  **nineteen** keys (`contract.ts:377-397`). Written before `ArrayField` / `ArrayItem` landed and
  never updated. Recorded so the rewrite is not mistaken for a regression.
- **`component-guard.tsx:59-63` already anticipates this work** — it names "a kit assembled at
  runtime from a spread (which is how an app adds its own fields)" as a case the type system does
  not see. Carry that intent forward: the guard splits in two, it does not change shape.
- **Array scoping is already registry-generic.** `array-field.tsx:400` builds an entry's scoped set
  with `Object.entries(fieldComponents)`, and `scopeComponent` (`:56-71`) needs only
  `props.name: string`. A custom field gets array scoping free — no change in `array-field.tsx`
  beyond narrowing its import. This is a behavioural claim, so Slice A proves it with a test.
- **`FieldRenderProps['data-field-type']` is already `string`, on purpose** (`contract.ts:38-47`),
  precisely so a schema may declare a custom kind. Nothing to move.
- **`assertNoReservedFieldKeyCollision` must be left alone** (`schema/registries.ts:48`). It guards
  the per-form prop, which stays keyed by type id. The factory registry is keyed by component name
  and needs its own, differently-shaped check. Two checks, not one widened one.

## 3. Design

### 3.1 `contract.ts` split

`FormComponents` keeps seven members: `ArrayField`, `ArrayItem`, `Button`, `Form`, `Section`,
`GridItem`, `Wizard`. A new exported `FormFields` holds the twelve removed members verbatim — not a
closed contract, but the shape a kit's `formFields` export is written against (`satisfies
FormFields`), so a missing built-in is a compile error there while `createForm({ fields })` still
accepts additional keys.

The file header doc comment (`contract.ts:4-23`) describes one `satisfies FormComponents`
registration and must be rewritten, not extended.

### 3.2 New module `src/field-registry.ts`

`FieldTypeDefinition`, `FormFieldRegistry`, `defineFieldType`, `fieldTypeIdFor`,
`FIELD_NAME_SUFFIX`, `BASE_FIELD_PROP_KEYS`.

The `any` in the registry bound is the same trade `CellTypeRegistry` makes
(`cell-types-context.tsx:98-100`) and for the same reason: `FormFields`' twelve members and an
arbitrary custom definition have incompatible prop shapes, so no single non-`any` bound accepts
both; the real check is the kit's `satisfies FormFields`. That reasoning belongs in the doc comment,
or the eslint-disable reads as a shortcut and the next audit deletes it.

`defineFieldType` is curried so `TProps` can be given explicitly while the definition keeps its
inferred type, and returns the definition unchanged — the `__props` / `__value` markers are
type-only. Prove it with an identity assertion (`toBe`).

`fieldTypeIdFor` and its collision checks run **once at `createForm` time**, never per render (the
principle `registries.ts:43-47` already states). It throws on: an empty derived id (a key named
`Field`); two keys deriving the same id; an id colliding with `RESERVED_NODE_TYPES`
(`packages/form/core/src/schema.ts:11` — `section`, `step`, `submit`, `block`, `array`), without
which a key named `SectionField` silently shadows a container node type. It must **not** throw when a
built-in key derives its own built-in id — replacing a kit field is decision 2's whole point.

### 3.3 The generic binder — the one genuinely unresolved piece

`CustomFieldRenderProps` (`schema/registries.ts:13-17`) nests the author's props under `props`,
because on the schema path they come from `node.props`, passed straight through
(`schema/render-node.tsx:307`). A JSX call site writes them **flat**: `<form.RatingField name='score'
max={5} />`; there is no `props` object in `BaseFieldProps` (`field-props.ts:21-55`).

So decisions 4 and 5 describe two different things. Unresolved, a custom field must be authored
twice — once for `form.RatingField`, once for `{ type: 'rating' }` — which defeats the shared
registry.

**Recommended resolution:** one component serves both paths, and the generic **JSX binder collects
the non-`BaseFieldProps` keys into `props`** before rendering. The call site stays flat
(`BaseFieldProps<TFormData, TValue> & TProps`); the component receives
`CustomFieldRenderProps<TValue, TProps>`, byte-for-byte identical on both paths; and
`defineFieldType<{ max: number }>()` types `props` as `{ max: number }`.

The split uses a literal key list declared `satisfies Record<keyof BaseFieldProps<never, never>,
true>`, so a seventh base prop added later is a compile error at the split rather than a prop that
silently stops reaching the component — the technique `COMPONENT_KEYS` uses at
`component-guard.tsx:33`.

The alternative (pass flat everywhere) is rejected: it lets a delivered document's `props` collide
with `label` / `disabled` / `name` / `validate`, i.e. a BDUI payload silently overwriting the
binding. Nesting keeps a document's authored props in their own namespace.

**Why two type parameters here and one for `defineCellType`.** A cell type's config is pure data. A
form field is _bound to a value_, and `BaseFieldProps<TFormData, TValue>` types `name` as
`DeepKeysOfType<TFormData, TValue>` (`field-props.ts:22`). Without a value parameter,
`<form.RatingField name='email' />` compiles. Hence
`defineFieldType<TProps = Record<never, never>, TValue = unknown>()`.

`TValue = unknown` should make `DeepKeysOfType<TFormData, unknown>` yield every path — **the
implementer must confirm this before committing to it.** `DeepKeysOfType` is TanStack's
(`packages/form/core/src/schema.ts:8`); if it collapses to `never`, default to a `{}`-shaped
widening and say so in the doc comment. A one-line `expectTypeOf` pins whichever answer is true.

### 3.4 `FormFieldComponents` gains a **defaulted** second parameter

`FormFieldComponents<TFormData, TFields extends FormFieldRegistry = FormFields>` =
`BuiltInFormFieldComponents<TFormData>` & `CustomFieldComponentsOf<TFormData, Omit<TFields, keyof
FormFields>>`, with `PropsOf<T>` / `ValueOf<T>` reading the phantoms `defineFieldType` writes. An
entry not declared through `defineFieldType` falls to the defaults and gets an untyped-props,
unnarrowed-name component — graceful degradation rather than a compile error.

**The default is load-bearing.** These spell `FormFieldComponents<T>` with one argument today and
must keep compiling untouched: `RendererForm` (`schema/form-renderer.tsx:80`), `ArrayItemScope`
(`field-props.ts:224`), `RenderNodeArgs['form']` (`schema/render-node.tsx:78`),
`RenderChildrenArgs['form']` (`schema/render-children.tsx:13`), `renderSchemaFields`'s `form`
parameter (`form-renderer.tsx:340`), and the two `as unknown as FormFieldComponents<unknown>` casts
in `array-field.tsx:128` and `:194`.

### 3.5 Guards

`component-guard.tsx` keeps `COMPONENT_KEYS` — now seven entries, still `satisfies
Record<keyof FormComponents, true>` — and gains `FIELD_KEYS` `satisfies Record<keyof FormFields,
true>` plus `guardFields(fields)`.

An open registry has no key list to check against, so `guardFields` can only assert the twelve
built-ins and type-check the values. That is the correct scope, and the reason belongs in its doc
comment so nobody later "fixes" it by inventing a required set.

Both guards run once per `createForm` call, beside the existing `guardComponents` call
(`create-form.tsx:74`), for the reason that comment already gives: placeholder identities must be as
stable as the real components or React remounts the inputs.

**Consequence for the changeset:** `createForm({ components })` with no `fields` renders twelve
blanks and prints twelve named warnings rather than crashing — the designed failure, not an
oversight. See open question 4.

## 4. Public type changes

| Type                                                                            | Before                                                  | After                                                                                                                                                                                   | Who breaks                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormComponents`                                                                | 19 keys                                                 | 7 keys                                                                                                                                                                                  | **Every kit outside this repo.** `satisfies` does excess-property checking against an object literal, so an existing 19-key literal fails with _"Object literal may only specify known properties"_. Headline break. **Major.** |
| `FormFields`                                                                    | —                                                       | new; the 12 field kinds                                                                                                                                                                 | additive                                                                                                                                                                                                                        |
| `CreateFormOptions`                                                             | `{ components }`                                        | `{ components; fields? }`, generic over `TFields`                                                                                                                                       | compiles unchanged; **behaviour** becomes twelve placeholders. Source-compatible, semantically breaking. **Major.**                                                                                                             |
| `CustomFieldRenderProps<TValue>`                                                | one parameter; `props: Record<string, unknown>`         | `<TValue, TProps>`; `props: TProps`                                                                                                                                                     | additive via defaults                                                                                                                                                                                                           |
| `FormFieldComponents<TFormData>`                                                | one parameter                                           | second, defaulted to `FormFields`                                                                                                                                                       | additive (§3.4)                                                                                                                                                                                                                 |
| `FormBundle`                                                                    | `ReturnType<typeof createForm>` (`create-form.tsx:538`) | re-spell explicitly as `FormBundle<TFields = FormFields>` — `ReturnType` on a now-generic function instantiates at the constraint and quietly types the bundle over `FormFieldRegistry` | source-compatible                                                                                                                                                                                                               |
| `FieldTypeDefinition`, `FormFieldRegistry`, `defineFieldType`, `fieldTypeIdFor` | —                                                       | new exports                                                                                                                                                                             | additive                                                                                                                                                                                                                        |
| `FormRenderer`'s `fields` prop                                                  | `CustomFieldRegistry`                                   | type unchanged; **precedence** changes — layers over the factory registry                                                                                                               | additive                                                                                                                                                                                                                        |

## 5. Task list, dependency-ordered

### 5.0 Correction to the slicing

**Slices 1 and 2 cannot land separately.** The moment `FormComponents` loses its twelve field keys,
`build-field-components.tsx:33-49` stops compiling, and with it `create-form.tsx`,
`test-kit.tsx:333`, `create-form.test.tsx:536`, `loading-options.test.tsx:101` and
`component-guard.test.tsx:15,37`. There is no intermediate state in which the repo typechecks.

Land them as one unit. Separate _commits_ on one branch is fine; separate _PRs into `develop`_ is
not, because every PR is gated on `verify`.

Renumbered: **A** = contract + registry + binder + guards + both kits; **B** = schema path;
**C** = kit exports; **D** = docs + docs tests; **E** = size budget + changeset. B, C, D, E are
independent of one another.

### Slice A — contract split, registry, generic binder, guards, both kits

**Tests first**

1. `src/field-registry.test.ts` (new): `fieldTypeIdFor` for all twelve, driven from
   `FORM_FIELD_TYPES` and the `FormFields` key list rather than a hand-written table so they cannot
   drift; throws on an empty derived id, on two keys deriving one id, and on a `RESERVED_NODE_TYPES`
   collision; does **not** throw when a built-in key derives its own id; `defineFieldType(...)(def)`
   returns `def` by identity; an `expectTypeOf` pinning what `DeepKeysOfType<TFormData, unknown>`
   actually does (§3.3).
2. `src/component-guard.test.tsx` (extend): `components` missing `Button` still renders the rest and
   warns naming `Button`; `fields` missing `TextField` renders nothing and warns naming `TextField`;
   `createForm({ components })` with no `fields` mounts without throwing; existing
   placeholder-identity assertions keep passing across both guards.
3. `src/custom-field.test.tsx` (new): `RatingField` is reachable as `form.RatingField`; it receives
   the full `FieldRenderProps` binding asserted against the same expectations the built-in field
   tests use, not a hand-rolled subset; `data-field-type` is `rating`; flat author props arrive
   nested under `props` while `label` / `disabled` / `validate` do **not** leak in; replacing
   `TextField` at the same key renders the replacement **and still goes through the bespoke text
   binder** (assert the `asText` coercion at `fields/text-field.tsx:36`); a custom field inside
   `form.ArrayField` binds to `items[0].score`.

**Then implement**

- `src/contract.ts` — split; rewrite the header doc comment (`:4-23`).
- `src/field-registry.ts` — new (§3.2).
- `src/fields/custom-field.tsx` — new; `createCustomField(form, typeId, Component)`. Model on
  `fields/text-field.tsx` plus the `AppField` block already hand-written at
  `schema/render-node.tsx:289-311` — that block _is_ this binding. Reuse `fieldRenderProps` and
  `fieldValidators` exactly as both do. One difference from the render-node version: it passes
  `validate: undefined` because schema constraints compile into the form-level validator; the JSX
  binder passes the caller's `validate` through `fieldValidators`, like every built-in binder.
- `src/schema/registries.ts` — widen `CustomFieldRenderProps` to `<TValue, TProps>`. Leave
  `assertNoReservedFieldKeyCollision` and `RESERVED_REGISTRY_KEYS` untouched.
- `src/component-guard.tsx` — `COMPONENT_KEYS` down to 7; add `FIELD_KEYS` and `guardFields`.
- `src/build-field-components.tsx` — third `fields` argument; replace the twelve-key destructure
  with a `BUILT_IN_BINDERS` table `satisfies Record<keyof FormFields, …>`; loop the registry,
  routing a known key to its bespoke binder and an unknown key to `createCustomField`.
  `SubmitButton` / `Section` / `GridItem` still come from `components`; the two late assignments at
  `:73-74` stay exactly as they are (the comment at `:67-68` explains why).
- `src/field-props.ts` — defaulted `TFields` parameter; extract `BuiltInFormFieldComponents`; add
  `CustomFieldComponentsOf`, `PropsOf`, `ValueOf`.
- `src/create-form.tsx` — generic over `TFields`; call `guardFields`; derive the id-keyed registry
  once at factory time; pass `fields` into `buildFieldComponents` (`:137`); re-spell `FormBundle`
  (`:538`).
- `src/test-kit.tsx` — split `testComponents` (`:333`) into `testComponents` (7) + `testFields`
  (12); keep the `testComponents` name for the chrome half.
- Update `create-form.test.tsx:536`, `loading-options.test.tsx:101`,
  `component-guard.test.tsx:15,37`.
- `shadcn/src/form.tsx` and `heroui/src/form.tsx` — two objects, two `satisfies`, both **exported**
  (module-private today, `:31` / `:29`); `createForm({ components: formComponents, fields:
formFields })`; update each file's doc comment.
- `src/index.ts` — export `FormFields`, `FieldTypeDefinition`, `FormFieldRegistry`,
  `defineFieldType`.

**shadcn caution:** `shadcn/src/**` is also the registry payload `npx shadcn add` copies verbatim.
Re-run `pnpm --filter @ez-kit/docs registry:build` and read the emitted JSON before the PR.

**Gate:** the three package suites, then `pnpm typecheck`.

### Slice B — schema path

**Tests first** — `src/schema/registries.test.tsx`: a factory-level `RatingField` resolves
`{ type: 'rating' }` with **no** `fields` prop; a per-form `fields` entry wins for that id while the
factory's other entries survive; a factory id colliding with a reserved node type throws at
`createForm` time, not at render time; existing `assertNoReservedFieldKeyCollision` tests unchanged.

**Then implement** — `create-form.tsx` only: merge `{ ...factoryFieldsById, ...props.fields }` at
both `renderSchemaFields` call sites (`:356`, `:410`), memoised on the props' identity for the same
reason `validators` is memoised at `:322`. `render-node.tsx`, `render-children.tsx`,
`form-renderer.tsx` and `form-wizard.tsx` need **no change**. Put the "do not port `mergeCellTypes`"
reason in a comment at the merge site.

### Slice C — kit exports

Both `shadcn/src/index.ts` and `heroui/src/index.ts`: export `createForm`, `formComponents`,
`formFields`, each field individually; add `FormFields`, `FieldTypeDefinition`, `FormFieldRegistry`
to the type list and `defineFieldType` to the value list, beside the `CustomFieldRegistry` /
`CustomFieldRenderProps` they already re-export; keep the default bundle at `:1` exactly as it is.

**Rewrite the comment at `:3-8`, do not delete it.** Its stated reason for avoiding `export *` —
that the star would leak `createForm`, "which a consumer must not call with a different component
set and still call 'the shadcn kit'" — is now exactly backwards. The surviving reason is that a star
would also export the kit-author contract types, whose home `custom-kit.mdx` names.

**Tests:** extend both `index.test.tsx` — the new names are exported, and
`createForm({ components: formComponents, fields: formFields })` produces a bundle whose
`form.TextField` renders the kit's real input, not a guard placeholder.

### Slice D — docs and docs tests

`apps/docs/test/docs-options/page-type-map.ts`:

- add `FormFields` to `FORM_TYPE` beside `FormComponents` (`:303`);
- `:900` (`Per-kind props`) changes root from `FORM_TYPE.FormComponents` to `FORM_TYPE.FormFields`;
  **`expectedCount: 12` unchanged** — the twelve rows are exactly the twelve keys that moved;
- `:901` (`Form level`, 2), `:902` (`Layout and wizard`, 3), `:899` (`Fields`, rooted at
  `FieldRenderProps`, 11) — **all unchanged**;
- add `FormCustomFields: 'content/docs/form/custom-fields.mdx'` to `DocPage` (`:130-149`) **and** a
  matching `PAGE_ENTRIES` entry classifying every table on the new page. Missing either is a CI
  failure, not a warning.

No other fixture moves; `type-resolver.ts` and `mdx-tables.ts` are untouched. `FormFields` resolves
through the same `TypeModule.FormReact` path, which reads the built `./dist`.

`apps/docs/test/e2e-slots.test.ts` — this work renames no `data-slot` and adds none, so no edit is
expected. Confirm by running it, not by inspection.

Pages: rewrite `custom-kit.mdx` `## The contract` (`:62`), its example (`:69-89`) and the stale
"seventeen" (`:94`); **new** `custom-fields.mdx` (`defineFieldType`, the registry, the
component-name→id rule with the `RatingField → rating` case and the `radiogroup` counter-example,
how a registered field meets `{ type: 'rating' }`, and the decision-8 warning that two `createForm`
calls produce incompatible bundles — which breaks at runtime with no type error); `schema.mdx:278`
(factory registry primary, prop as override); one sentence each in `index.mdx:27` and
`basic-concepts.mdx:16`. **Leave `arrays/api.mdx:67`** — `Button` stays in `FormComponents`, so the
row is still correct; checked specifically because it looked like a casualty.

**Gate:** `pnpm --filter @ez-kit/docs test`.

### Slice E — size budget and changeset

Measure before touching: the first `size-limit` entry (`form-react/package.json:39-45`) is at
8.29 kB against 9 kB, and already `ignore`s `@ez-kit/form-core`. This change adds `BUILT_IN_BINDERS`
(a static object of twelve existing references — near-free), `fieldTypeIdFor` and its checks,
`createCustomField`, `guardFields`, and the prop-splitting loop. Estimate **0.3–0.6 kB min+gz**,
landing at or just over the limit — expect to raise it, but on the measurement, not the estimate.
If it breaches, raise to **10 KB** (`:41`) and quote the measured output in the PR body.

The **second** entry ("config-layer helpers alone", 0.5 KB, `:46-54`) **must not move**. If it does,
registry code is being anchored into a partial import by something the bundler cannot prove pure —
chase that rather than raising the budget. `apps/docs/test/tree-shaking.test.ts` exists for this
class; if `@ez-kit/form-react` has no case there, this is the moment to add one.

**Changeset:** major on `@ez-kit/form-react` and `@ez-kit/form-heroui`. **`@ez-kit/form-shadcn` must
not appear** — it is `private` and in `.changeset/config.json`'s `ignore`, and naming it beside a
released package fails the `version` job _after_ the merge, where it quietly stops the release PR
from being written. The shadcn-visible part rides on `@ez-kit/form-react` and `@ez-kit/docs`.

Migration text for the changeset body is in §8.

## 6. Explicitly not changing

`render-node.tsx`, `render-children.tsx`, `form-wizard.tsx`, `form-shell.tsx`,
`field-render-props.ts`, `field-validate.ts`, every `fields/*-field.tsx` bespoke binder,
`array-field.tsx` beyond its import, and the whole of `@ez-kit/form-core`.

## 7. Open questions

1. **Does the generic binder nest the author's extra props under `props`, or pass them flat?**
   §3.3 recommends nesting. Everything in Slice A's generic binder depends on it.
2. **Is `formFields` / `FormFields` the right name?** The adapter already exports
   `FormFieldComponents` meaning something else (the _bound_ components on the instance). Three
   near-identical names is the "one concept, three spellings" defect AGENTS.md's settled-decisions
   section exists to clean up.
3. **The two `fields` are keyed differently** — `createForm({ fields })` by component name,
   `<FormRenderer fields>` by type id, and their values have different shapes. They merge correctly
   after derivation, so nothing is broken, but one option name spans two spellings. Options:
   (a) accept and document loudly; (b) rename the per-form prop; (c) accept both spellings there.
4. **Should `fields` be required rather than optional?** Required is a clearer break — a compile
   error instead of twelve console warnings — but removes the `createForm({ components })` shape,
   including from this repo's test kits and every docs snippet. §3.5 assumes optional.
5. **Does the form package want a settled-decisions section in `AGENTS.md`?** The data-grid has one
   and it is doing real work. The two-bag split, the name→id direction, and whatever question 3
   resolves to are exactly what gets re-proposed at the next audit otherwise.

## 8. Migration text for the changeset body

> **Breaking for custom kits.** `createForm` now takes two bags instead of one: `components` for the
> form's chrome and `fields` for the field kinds. Split your single `components` object in two. Move
> the twelve field kinds (`TextField`, `NumberField`, `TextareaField`, `SelectField`,
> `CheckboxField`, `SwitchField`, `RadioGroupField`, `SliderField`, `MultiSelectField`,
> `CheckboxGroupField`, `DateField`, `DateRangeField`) into a second object and write `satisfies
FormFields` on it; leave `ArrayField`, `ArrayItem`, `Button`, `Form`, `Section`, `GridItem` and
> `Wizard` in the first and keep `satisfies FormComponents`. Then call
> `createForm({ components, fields })`.
>
> No component's props changed — this is a move, not a rewrite. Export both objects so consumers of
> your kit can extend the field set: `createForm({ components: formComponents, fields: {
...formFields, MyField } })` adds `form.MyField` to the instance, typed, and resolves
> `{ type: 'my' }` in a schema document.
>
> If you call `createForm({ components })` with no `fields`, every field renders nothing and warns
> once in development, naming the slot.

## 9. Answers to §7, taken 2026-09-23 — these override the sections above where they disagree

1. **The generic binder nests.** The call site stays flat; the binder collects every key outside
   `BaseFieldProps` into `props`. §3.3's recommendation is adopted as written, including the
   `satisfies Record<keyof BaseFieldProps<never, never>, true>` key list.
2. **`fields` is REQUIRED on `CreateFormOptions`**, not optional. §3.5's assumption is overruled.
   A kit that omits it gets a compile error rather than twelve console warnings. The zero-config
   path survives because each kit still exports its ready-made bundle, so an app with no custom
   fields never calls the factory. Cost, to be paid inside Slice A: this repo's own `test-kit.tsx`
   and every docs snippet that writes `createForm({ components })` must be updated in the same
   commit. `guardFields` still ships — it is for JavaScript consumers and partial kits, which the
   type system does not reach.
3. **The contract type is `FormFieldSlots`, the kit export is `formFieldSlots`.** Not `FormFields` —
   `FormFieldComponents` already means the _bound_ components on the instance, and
   `FormFields` / `FormFieldComponents` / `formFields` was three spellings of two concepts.
   "Slot" is already the repo's word for a contract member (`data-slot`,
   `FEATURE_OPTIONAL_COMPONENTS`, "contract slot" throughout AGENTS.md), so the kit contract and
   the instance's bound components now read as different things. The `createForm` **option** stays
   `fields`; only the type and the kit's exported object carry `Slots`.
4. **`FormRenderer`'s per-form `fields` prop is REMOVED** — not renamed, not kept. This reverses
   decision 6, which is recorded above as confirmed; the confirmation was about the mechanism
   working, not about wanting two entry points. The factory is the single registration site.
   Consequences, all inside the slices below:
   - `SharedRendererProps.fields` (`schema/form-renderer.tsx:58`) goes, and with it the threading
     into `RenderNodeContext.fields`. `RenderNode`'s custom branch keeps reading
     `context.fields?.[node.type]` — it is now fed only from the factory registry.
   - **`blocks` stays.** It registers `block` nodes, which carry no binding and no field kind, and
     nothing about it was in question.
   - `assertNoReservedFieldKeyCollision` (`schema/registries.ts:48`) keeps guarding `blocks`. Its
     `fields` parameter goes, and the equivalent check for the factory registry is
     `fieldTypeIdFor`'s reserved-id rejection (§3.2) — two checks in two places, as §2 said, but
     now for two different registries rather than two spellings of one.
   - `CustomFieldRegistry` stays exported (it is the type of the factory's derived, id-keyed map)
     but is no longer anything a consumer passes as a prop.
   - Docs: `schema.mdx:278` documents `fields={{ rating: RatingField }}` on `FormRenderer` and must
     be rewritten to the factory, not merely reworded. This is a **breaking change for anyone using
     that prop today** and needs its own paragraph in the changeset.

**Slice B is therefore no longer "wire the layering" but "remove the prop".** Its tests invert: a
factory-level entry resolves `{ type: 'rating' }` with no prop anywhere, and passing `fields` to
`FormRenderer` is a type error. The "do not port `mergeCellTypes`" note becomes moot — there is
nothing to merge.

## 10. Landmines Slice A left for B–E — read before starting any of them

Recorded 2026-09-23, after Slice A landed. Each one is a place the plan above is now factually
wrong; the plan is not rewritten in place so the sequence stays legible.

- **Every `FormFields` / `formFields` in this document is really `FormFieldSlots` /
  `formFieldSlots`** (§9.3). This bites Slice D's `FORM_TYPE.FormFields` reroot, Slice C's export
  lists, and Slice E's migration text, which spells `satisfies FormFields` twice.
- **Slice E's changeset body is wrong twice over.** It says `createForm({ components })` with no
  `fields` renders blanks and warns — that is now a **compile error** (§9.2). And it describes the
  twelve moving into "a second object" without saying that object is required.
- **Slice E's "expect to raise the budget" is not borne out.** Measured after Slice A:
  `@ez-kit/form-react` entry 1 is **8.56 kB** against the 9 kB limit (was 8.29), entry 2 is
  **332 B** against 500 B (was 330 B). The budget stays as it is, and entry 2 not moving is the
  evidence that no registry code is anchored into the partial import.
- **The shadcn registry warning does not apply to the form kit at all.** There is no
  `packages/form/react/shadcn/registry.config.mjs`; `apps/docs/scripts/build-registry.mjs` builds
  only `data-grid`. The plan inherited that caution from `AGENTS.md`, where it is stated about the
  data-grid kit, and generalised it wrongly. The form shadcn kit is not an `npx shadcn add` payload
  today.
- **`composition.ts` is still at the default** — `KitFormBlock` / `KitWithFormProps` spell
  `KitFormApi` with twelve arguments, so a `withForm` block sees the twelve built-ins and **not**
  the app's custom fields. Purely additive to fix, but it is the one place the instance type and
  the block type now disagree. Needs a slice; decide whether it joins B.
- **Slice B must also carry `TFields` into `RendererForm<TValues>` and `renderSchemaFields`' `form`
  parameter**, which are still at the default. Without it a factory-registered field is reachable
  from JSX and invisible to the renderer — the two halves of the feature would disagree.
- **Slice B inherits a `deriveFieldTypeIds(fields)` call in `create-form.tsx` whose result is
  discarded**, with a comment saying Slice B consumes it. If Slice B does not, that line reads as
  dead code and will be deleted by the next person.
- **Slice D's `custom-kit.mdx` work is bigger than a reroot.** The page documents chrome and field
  slots together, and `page-type-map.ts` currently roots all of `Per-kind props` at one governing
  type. Split across two, or restructure the page.
- **Slice C's stated reason for the curated export list is doubly stale** (§9 already voided it
  once). The kits now have two further names to export deliberately — `formComponents` and
  `formFieldSlots` — which exist in each `form.tsx` today but are unreachable from the package root.

### Coverage Slice A could not provide, carried forward

- No test proves a custom field reaches the **schema** path. That is Slice B's by design, but it
  means `deriveFieldTypeIds`' output has no consumer-level coverage yet.
- No negative type test that `<form.RatingField name='email' />` (wrong value type) fails to
  compile. The positive narrowing is covered.

  ~~This package has no `@ts-expect-error`-in-test convention to write the negative against. Worth
  establishing one.~~ **Struck 2026-09-24: false, and it was false when written.** The convention
  predates all of this work — `array-types.test.tsx:84,104,123,205`, `form-types.test.tsx:50`,
  `composition-types.test.tsx:80`, and a dozen uses in `form/core/src/schema-types.test.ts`, plus
  `va-store`. Its shape is `// @ts-expect-error — <why, and where the error lands>`, the second
  half mattering because the directive has to sit on the line the diagnostic is reported on, which
  is often an attribute rather than the element. Slice B's negative test follows it. The claim came
  into this plan from a report rather than from a grep, and nobody checked it until Slice B did —
  worth remembering as the cost of recording an absence without verifying it.

### §5.0 correction, second instalment

**Slice D cannot land separately from Slice A either**, for the same reason slices 1 and 2 could
not: `apps/docs/test/docs-option-names.test.ts` resolves documented option names against the
**built** types, so the moment `FormComponents` lost its twelve field keys, `custom-kit.mdx`'s
`Per-kind props` table — 12 rows, rooted at `FORM_TYPE.FormComponents` — started failing with 12
named errors. That test runs inside `verify`, which gates every PR into `develop`.

The minimum to restore green was done alongside Slice A: `FORM_TYPE` gained a `FormFieldSlots`
entry and the `Per-kind props` table's root moved to it (`expectedCount: 12` unchanged, as §5's
Slice D predicted). The **prose** of `custom-kit.mdx` is still Slice D's work and is still wrong —
it describes one bag and says "seventeen".

The general lesson for the remaining slices: the docs fixtures are not downstream of the packages,
they are part of the same gate. Any slice that changes an exported type's shape carries its
`page-type-map.ts` entry in the same commit.

## 11. Review of Slice A — findings still open

H1, M1, M2 and M3 are fixed and mutation-checked. What follows is queued, and all of it lives in
files Slice B is touching, so it lands after Slice B reports.

- **L1 — `binders[key]` reaches through `Object.prototype`.** `build-field-components.tsx`: a field
  registered under the key `toString` resolves `Object.prototype.toString`, which is a function, so
  `binder === undefined` is false and the key is misclassified as a built-in. That function is then
  _called as a binder_, returns `"[object Object]"`, and a string lands on the instance where a
  component belongs — React throws `Element type is invalid`, naming neither the key nor the kit.
  `constructor` is worse: it resolves to `Object` and constructs. Fix: `Object.hasOwn` at the
  lookup, matching `BASE_FIELD_PROP_KEYS`.
  **Not a null-prototype table.** `Object.create(null)` types as `any`, so
  `Object.assign(Object.create(null), {…})` does too — which for `BASE_FIELD_PROP_KEYS` would cost
  the excess-property half of its `satisfies`, the half that catches a **renamed** base prop. A
  compile-time guarantee traded for a runtime one. `BUILT_IN_BINDERS` could afford it (its type is
  already erased by a cast) and that is precisely why it should not: two tables guarded by two
  mechanisms costs a reader more than the consistency saves.
  Write down the actual trap while fixing: `noUncheckedIndexedAccess` types `binders[key]` as
  `LooseBinder | undefined`, which **reads** as though the undefined case is handled. It is not —
  the type is honest about the index signature and silent about the prototype. That mismatch is why
  the bug survived a review pass.
- **L2 — a field key of `SubmitButton` or `GridItem` is accepted, then silently shadowed.** The
  loop's output is spread first and five literal keys overwrite it. Three of the five are caught
  upstream **by accident** — their derived ids (`section`, `array`) happen to be reserved.
  `submitbutton` and `griditem` are not, so `form.GridItem` renders the layout component and the
  author's field never appears, with no error anywhere.
  One-list, one-throw fix: the five are exactly
  `Exclude<keyof BuiltInFormFieldComponents<unknown>, keyof FormFieldSlots>`, so anchor
  `LAYOUT_COMPONENT_KEYS` to that with `satisfies`, throw from `deriveFieldTypeIds` beside the
  reserved-id check, and give the spread's layout half `satisfies Record<keyof typeof
LAYOUT_COMPONENT_KEYS, unknown>` **before** the `as unknown as FormFieldComponents<TFormData>`
  cast — the cast erases checking on whatever it covers, so the check has to sit on a
  sub-expression outside it. `built` stays unchecked, correctly: its keys are the open registry's
  and are checked at `createForm`. Verify `Exclude<…>` at `unknown` first; the snippet is not
  compiled.
  Costs one line in the existing M3 tests to cover (`GridItem`).
- **M4 — the inline `'components' | 'fields'` union.** `component-guard.tsx`: a parameter type plus
  two call sites, four spellings of a two-member named set. Against the binding project rule
  (`.claude/rules/typescript/coding-style.md`, "Closed sets → `const` object + same-named union").
  A runtime value, so `export { … }` and a value import under `verbatimModuleSyntax`. Failure is
  maintenance: add a third bag or rename one and nothing links the parameter to the call sites.
  **No siblings** — `FIELD_NAME_SUFFIX` is correctly extracted, and the four lookup tables are
  already the `satisfies`-guarded form the rule asks for.
- **L3 — `FieldTypeDefinition` is exported and used by nothing.** `defineFieldType` spells its
  return inline and `FormFieldRegistry` spells the same shape a third time. Either give
  `FormFieldRegistry` the value type `FieldTypeDefinition<any, any>` — which also puts the
  `eslint-disable` and its justification in one place instead of two — or drop the export. It is a
  public name either way, so it is a semver commitment to something with no consumer.
- **L4 — `field-registry.ts` cites `component-guard.ts`; the file is `component-guard.tsx`.**
- **L5 — size headroom, observation only.** 8.63 kB against 9 kB is ~370 bytes, ~4%, where
  `AGENTS.md` describes ~15%. Fine for Slice A; B–E should know it was already tight. Entry 2 at
  332 B / 500 B stays the evidence that no registry code is anchored into the partial import.

## 12. Landed after Slice B — decisions and their reasons

- **`withForm` blocks now see the app's field kinds.** `KitFormBlock` and `KitWithFormProps` each
  took a trailing `TFields extends FormFieldRegistry = FormFieldSlots`, bound **by the factory**:
  `withForm` is declared inside `createForm<TFields>`, so the registry is already in lexical scope
  and the consumer writes nothing at the block or at its call site. §10 listed this as a slice of
  its own; it was two type parameters and a pass-through. Covered by a type test that renders
  `<form.RatingField max={5} />` inside a block; removing `TFields` from `KitFormBlock` turns it red.
- **`@ez-kit/form-react`'s first size budget: 9 KB → 10 KB.** Measured 8.7 kB, which is
  `AGENTS.md`'s "real size plus ~15%". Not pre-emptive: the number is what the tree weighs after
  Slices A and B and the review fixes. The second entry stays 500 B against a measured 338 B and
  did not move across any of it — still the evidence that no registry code is anchored into the
  partial import.
- **`.gitignore` gained `packages/**/tsup.config.bundled\_\*.mjs`.** tsup writes that file beside a
package's `tsup.config.ts`while building and removes it after; an interrupted build leaves it,
and because it is in no tsconfig,`eslint`fails on it with`parserOptions.project … file was not
  found`— in a package nobody touched. One such file was found in`packages/zu-store`during this
work and cost a full gate run to diagnose. The comment in`.gitignore` says why, so the line is
  not tidied away later.
- **The `disabled` asymmetry is a wording defect, not a behavioural one, and is closed by
  rewording.** `RenderNode` always computes a boolean (`false` when a node declares no
  `disabledWhen`); a JSX call site that omits the prop passes `undefined`. Both are falsy and both
  kits render identically from either, so nothing observable differs — only a kit testing
  `'disabled' in props` rather than its value could tell, which is its own defect. What is wrong is
  the claim in `fields/custom-field.tsx` and `schema/registries.ts` that the two paths produce a
  **byte-for-byte** identical object; that is true of every field but this one, which is why the
  parity test has to pin `disabled={false}` explicitly. Soften the claim in Slice D, where the
  prose is being rewritten anyway. Do **not** normalise a binder for it.
- **Not synchronising with `develop` for now** (owner's call, 2026-09-24). The branch is 35 ahead
  and 62 behind, and the gap grew by nine during this session; conflict cost rises with it.
