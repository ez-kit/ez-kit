---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

The field set is no longer closed: an app registers its own field kinds and gets them typed.

`createForm` takes two bags instead of one — `components` for the form's chrome, `fields` for the
field kinds — and `fields` is an **open registry**. A kit spreads its own twelve and an app adds to
them:

```tsx
// app/form.ts — once per project
import { createForm, defineFieldType, formComponents, formFieldSlots } from '@ez-kit/form-shadcn'

const RatingField = defineFieldType<{ max: number }, number>()(({ value, onChange, props }) => (
	<Stars
		value={value}
		max={props.max}
		onChange={onChange}
	/>
))

export const { useForm, Form, FormRenderer, withForm } = createForm({
	components: formComponents,
	fields: { ...formFieldSlots, RatingField },
})
```

`form.RatingField` is then a real field on the instance: `name` is narrowed to the paths that hold
its value type, `max` is required and checked, and it receives exactly what a built-in receives —
`id`, `data-field`, normalised `errors`, `invalid`, `onBlur`, `disabled`, plus `value` / `onChange`
and the author's own props. It works inside `form.ArrayField`, scoped to the entry, and inside a
`withForm` block, with nothing extra written at either call site.

**The registry key is the component name; the document type id is derived from it** — strip a
trailing `Field`, lowercase. So `RatingField` answers to `{ type: 'rating' }` in a schema document,
through the same component, with the same props. The derivation runs in that direction because the
other one is lossy: `radiogroup` cannot yield `RadioGroupField`.

Registration is checked once, when `createForm` runs, not per render. A key whose derived id
collides with a reserved node type (`section`, `step`, `submit`, `block`, `array`), two keys
deriving one id, and a key that would collide with the form's own components (`SubmitButton`,
`Section`, `GridItem`, `ArrayField`, `Array`) each throw by name.

## Breaking — and shipping as a minor, deliberately

These packages are still `0.x`, where the convention is that a breaking change lands as a **minor**
rather than a major. That is what this release is: the surface below is genuinely incompatible with
`0.3`, and it moves the minor digit so the break can be tried, used and corrected before anything
is promised. The major is the promise, and it comes later, once this API has been lived with.

**`FormComponents` split, and every kit must be updated.** It keeps the seven chrome slots —
`Form`, `Button`, `Section`, `GridItem`, `Wizard`, `ArrayField`, `ArrayItem` — and the twelve field
kinds moved to the new `FormFieldSlots`. Split your single object in two, write
`satisfies FormComponents` on the first and `satisfies FormFieldSlots` on the second, and call
`createForm({ components, fields })`. No component's props changed: this is a move, not a rewrite.
`satisfies` does excess-property checking, so an unsplit nineteen-key literal fails to compile with
"Object literal may only specify known properties" rather than silently half-working.

Export both objects, and each field individually — that is what lets a consumer of your kit extend
the set without forking it. Keep exporting your ready-made bundle too: an app with no custom fields
should never have to call the factory.

**`fields` is required.** `createForm({ components })` no longer compiles. The guard that fills a
missing slot with a warn-once placeholder still ships, but it is for JavaScript consumers and
partially-written kits — a TypeScript kit gets a compile error instead of twelve blank fields.

**`FormRenderer`'s `fields` prop is gone.** Custom field kinds are registered at the factory, which
is now the single registration site, so a per-form registry would have been a second spelling of the
same thing keyed differently (`RatingField` there, `rating` here). `blocks` is unchanged — a block
carries no binding and no field kind.

**`FormBundle` is now generic** over the registry, defaulted, so the bare spelling keeps working.
`FormFieldComponents`, `KitFormApi`, `BoundForm`, `RendererForm` and the array scope types likewise
gained a trailing defaulted parameter; every existing one-argument spelling compiles unchanged and
keeps meaning "the kit's twelve".

## Also in this release

- `parseFormSchema` now **accepts a `./`-prefixed field reference inside an array item**, where it
  is the only way to name a sibling field of the same entry — the entry's index is not knowable when
  a document is authored. It still rejects one outside an array, where there is no item to resolve
  against. Previously it rejected every `./`, so a document that worked inline threw when the same
  payload arrived as JSON.
- `ButtonProps`, `FieldRenderProps` and every per-kind `*RenderProps` are unchanged.
