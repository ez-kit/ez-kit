---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
---

Give the flat JSX fields a `validate` prop — the same `FieldValidate` object a schema field
node takes.

Until now a schema document was strictly more expressive than the JSX API: a field node could
declare `required` / `min` / `max` / `minLength` / `maxLength` / `format`, while
`<form.MultiSelectField />` had only a `required` prop that draws an asterisk and validates
nothing. The two now share one vocabulary and one engine.

```tsx
<form.TextField name='email' label='Email' validate={{ required: true, format: 'email' }} />
<form.MultiSelectField name='tags' options={TAGS} validate={{ maxLength: 2, messages: { maxLength: 'Pick at most two' } }} />
<form.NumberField name='age' validate={{ min: 18, max: 120 }} />
```

- **`@ez-kit/form-core`** exports `runFieldValidate(value, values, config, options?)`, the
  per-field entry point into the constraint engine `buildValidator` already compiled a whole
  schema into. Both entry points call the same `runConstraints`; the constraint logic is not
  duplicated. `FieldConstraintKey` and `RunFieldValidateOptions` are exported alongside it.
- **`@ez-kit/form-react`** attaches the prop to the field's TanStack `onChange` validator —
  the same hook the schema side attaches its generated validator to, so both behave
  identically, including the `isTouched` gate on _showing_ the error.
- `validate.required` implies the visual `required`, so the asterisk needs no second prop. The
  bare `required` prop keeps its own job — visual only — for a caller whose validation lives
  in an external zod/valibot validator.
- The JSX spelling omits the two keys that only mean something to a **document**: `rule` (a
  name looked up in a registry, because JSON cannot carry code — JSX has TanStack validators
  instead) and `LocalizedText` messages (resolving `{ key, params }` needs the `translate`
  that only `<FormRenderer>` takes; here `messages` are finished strings). Both are compile
  errors, and `rule` also throws naming the field if one arrives past a cast.

Neither UI kit changed: this is entirely above the kit contract.
