# @ez-kit/form-core

## 0.3.0

### Minor Changes

- fd7c480: Give the flat JSX fields a `validate` prop — the same `FieldValidate` object a schema field
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

- fd7c480: config-driven forms: render a form from a plain-data `FormSchema`

  A form can now be described as data — `{ version: 1, children: [...] }` — and rendered with
  `<FormRenderer>` through the very same bound field components the JSX API uses, so a
  config-driven form and a hand-written one produce identical DOM. The document is JSON with no
  functions anywhere, so the same schema can be authored in TypeScript, stored in a database, or
  delivered by a backend.

  `@ez-kit/form-core` gains the format and everything that reasons about it: `defineFormSchema`
  (curried, so `name` is checked per field kind against your value type), the closed rule
  language behind `when` / `disabledWhen` (`compileCondition`), `buildValidator` (schema
  constraints → one standard-schema validator, no zod), `visibleFieldNames` /
  `stripHiddenValues`, `walkNodes`, `resolveText`, and `parseFormSchema` — the trust boundary a
  backend-delivered document passes through, which throws `FormSchemaError` with the offending
  node's path.

  `@ez-kit/form-react` (and both kits) gain `FormRenderer`, in the same controlled and
  uncontrolled modes as `<Form>`, with registries for custom field kinds, value-less blocks and
  named validation rules; wizards, when the document's top-level children are `step` nodes; and
  the composition helpers `withForm`, `withFieldGroup`, `useFormGroup` and `useFieldGroup`.

  The UI-kit contract grows `Section`, `GridItem` and `Wizard` — a breaking change for a
  hand-written kit, which must supply the new primitives.

  Both kits now also re-export the schema-authoring API of `@ez-kit/form-core`
  (`defineFormSchema`, `parseFormSchema`, `FormSchemaError`, `buildValidator`,
  `stripHiddenValues` and the `FormSchema` / `FormNode` / `NamedRule` types), so a kit stays the
  only package a consumer installs.

- fd7c480: Add `creatable`: a `searchable` select or multiselect can accept a value its option list does
  not contain.

  When the typed text matches no option, the renderer appends one extra option offering to add
  it; picking that row writes the text into form state. Nothing is committed by blurring or by
  typing alone — the same explicit act react-select's `Creatable` and react-admin's `onCreate`
  ask for. `createLabel` captions the row, defaulting to `Add "<query>"` and merging the typed
  text in under `query` for its `{ key, params }` form.

  `creatable` is legal only on a **string-valued** list — a compile error on a numeric one, and
  rejected by `parseFormSchema` for a document. Typed text is a string; a numeric-valued field
  would have to invent an id its backend never issued. A created value is therefore the text
  itself, and it labels itself in the list, which is what keeps a multiselect's chips from going
  blank once the query that made them is gone.

  **Neither UI kit changed, and neither can tell the feature is on** — the offered row reaches a
  kit as an ordinary option. A custom kit supports `creatable` the moment it supports
  `searchable`.

  `creatable` requires `searchable`, because a value is created by typing it. In exchange,
  **`searchable` no longer requires an option source**: a static `options` list is now filtered
  in the renderer by one fixed rule — a case-insensitive substring of the label, with no
  configuration. That combination previously threw. Anything more particular than substring
  matching is what an option source is for.

- fd7c480: feat(form): date and date-range fields

  Two new field kinds — `date` and `daterange` — available from both the JSX API
  (`form.DateField`, `form.DateRangeField`) and a schema (`FormFieldType.Date`,
  `FormFieldType.DateRange`).

  Every date is a **`YYYY-MM-DD` string**, and a range is `{ start, end }` of two of them under
  a single `name`. No `Date` object ever enters form state: a calendar date has no time zone to
  lose, and only a string survives `JSON.stringify` — which is what keeps a date field
  describable by a backend-delivered document. Each kit converts at its own edge (React Aria's
  `CalendarDate` for HeroUI, `Date` for shadcn's react-day-picker), so no date library reaches
  the adapter or your values.

  A range is a separate kind rather than a flag, because its value shape differs — which is
  what keeps `name` narrowed to paths of the right type in both cases. Its value appears only
  once **both** ends are picked; a half-picked range stays inside the picker.

  `min` / `max` on a node bound what the calendar offers. Enforcement stays in
  `validate: { min, max }`, which now accepts a `YYYY-MM-DD` string as well as a number — ISO
  dates compare correctly as text, so no date-only constraint was needed. `parseFormSchema`
  rejects a malformed day, an impossible one (`2026-02-31`), or a range default missing an end.

  **Breaking for custom kits:** `FormComponents` gains `DateField` and `DateRangeField`; a kit
  built against the old contract will not satisfy it until both are implemented.

  Also: `buildValidator`'s `options` argument is now optional — a schema that names no rules
  had nothing to pass, and omitting it used to throw.

- fd7c480: feat(form): multi-select and checkbox-group fields

  Two new field kinds — `multiselect` and `checkboxgroup` — from the JSX API
  (`form.MultiSelectField`, `form.CheckboxGroupField`) and from a schema
  (`FormFieldType.MultiSelect`, `FormFieldType.CheckboxGroup`). Both bind to a **`string[]`**
  under a single `name`, take the same `options` list as their single-value counterparts, and
  complete the selection grid: collapsed vs expanded, one value vs many.

  They are separate kinds rather than a `multiple` flag, because the value type differs — which
  is what keeps `name` narrowed to `string[]` paths here and `string` paths on `select` /
  `radiogroup`. The value is always a list (`[]` when nothing is chosen, never `undefined`).

  Validation follows: **an empty list now counts as empty**, so `required` is no longer
  satisfied by a multi-select with nothing selected, and `minLength` / `maxLength` measure
  entries for a list (characters for a string, as before). `parseFormSchema` rejects a
  `defaultValue` that is not an array of option values, and requires `options` on both kinds.

  No new dependencies in either kit: HeroUI uses its own `Select` in `selectionMode='multiple'`
  and its real `CheckboxGroup`; shadcn — whose Radix select is single-selection only — composes
  a popover of vendored checkboxes, the same shape this repo's data-grid kit already uses for
  its faceted filter.

  **Breaking for custom kits:** `FormComponents` gains `MultiSelectField` and
  `CheckboxGroupField`.

- fd7c480: feat(form): numeric values for select-like options

  A `select`, `multiselect`, `radiogroup` or `checkboxgroup` option's `value` may now be a
  **number** as well as a string, and `name` is checked against it: a field bound to a `number`
  path (a `number[]` one for the multi-value kinds) must be given numeric options, and a
  string-valued path string ones. That makes the format's headline case — a backend-authored
  document whose entity ids are integers — expressible: the id stays a number all the way into
  form state and back out of `onSubmit`, rather than being stringified at the edge.

  No new node `type`: `select<string>` and `select<number>` are the same widget with the same
  value shape, and only the JSON scalar differs. The union members are generated once per
  option-value scalar (`SelectMember<TValues, string> | SelectMember<TValues, number>`, and the
  same for the other three kinds), which is what keeps `name` and `options` **correlated** — a
  mixture is a compile error rather than a lookup that silently finds nothing.

  The kit contract is unchanged and stays string-only at the DOM edge (`value: string`,
  `options: readonly SelectOption[]`) — Radix requires string item values and reserves `''`.
  The binding layer stringifies option values on the way down and maps the string a kit reports
  back to the option it came from; a **lookup**, never `Number(value)`, so a string-valued
  `'42'` stays a string.

  `parseFormSchema` follows: an option `value` must be a string or a finite number, one list
  cannot mix the two (`1` and `'1'` collide as DOM keys), and a `multiselect` /
  `checkboxgroup` `defaultValue` must be a homogeneous array of option values agreeing with the
  list's scalar type.

  **Breaking (types only, no runtime change).** `SelectFieldProps`, `MultiSelectFieldProps`,
  `CheckboxGroupFieldProps` and `RadioGroupFieldProps` are now unions of a string-valued and a
  number-valued arm rather than single object types, so code that referenced one of them as a
  plain object type — spreading it, extending it, or writing a `Pick<…>` over it — needs
  updating. Authoring a field, from JSX or from a schema, is unaffected.

- fd7c480: `searchable` on a `multiselect`: the same combo box, with chips that carry resolved labels.

  `searchable` shipped on `select` only, and `parseFormSchema` rejected it on `multiselect` with
  "not supported in this version". It is supported now: the parser accepts the flag there, the
  JSX prop exists on `MultiSelectFieldProps`, and both kits render a multi-value combo box.

  **The source contract did not change**, and does not need to. `useSelectedOptions` already took
  its `values` as an array; a `multiselect` simply sends its whole selection where a `select`
  sends a one-element one. A source written for a searchable select serves a searchable
  multiselect unchanged — the same registry entry can serve both fields in one form.

  Resolving those values is the entire point. With a server-side search the current selection is
  normally absent from the current page of results, so without the second hook every chip would
  read as a raw id. The renderer merges both hooks' options into the one list the kit sees, and
  each kit labels its chips by looking a value up in it — neither kit learns two queries exist.

  After a selection **the query resets to empty**, in both kits: the term that produced the chip
  has been consumed by it, and leaving it behind would silently narrow the next search. Removing a
  chip updates form state and leaves the query alone. Changing the source's resolved parameters
  still clears the whole selection to `[]`, as it always did.

  **Breaking for third-party kit authors, not for source or form authors.**
  `MultiSelectFieldRenderProps` gains a required `search: { query, onQueryChange } | undefined`
  key, the identical one `SelectFieldRenderProps` grew — a kit that does not declare it no longer
  satisfies `FormComponents`. Handling it is optional in practice: `search === undefined` is every
  non-searchable field, and a kit may pass the prop through and keep rendering its plain control.

  `searchable` stays illegal on `radiogroup` and `checkboxgroup`, which render every option
  inline; the parse error now names both legal kinds. A `searchable` field wired to a static
  `options` list, or to a plain-function source, still throws at render naming the field.

  No new package dependency in either kit: `@ez-kit/form-shadcn` uses the `multiple` mode and the
  chip parts of the Base UI combobox it already vendored, and `@ez-kit/form-heroui` uses
  `ComboBox` in `selectionMode='multiple'` with `Chip` for the selection.

- fd7c480: `searchable` on a `select`: a combo box that queries a source as the user types.

  Everything `optionsFrom` shipped so far assumes a source returns **the whole list**, which is
  what guarantees the option carrying the value in form state is on it and can be found for its
  label. Server-side search breaks that permanently: the source returns only the page matching
  the last query, so form state holding `city: 4821` next to results for "lis" draws a blank
  control forever.

  So a source may now take a second, optional shape — two hooks instead of one:

  ```ts
  type OptionSource = ((input: OptionSourceInput) => OptionSourceResult) | SearchableOptionSource
  ```

  `useOptions` answers "what matches what was just typed" (its input gains an additive `query`),
  and `useSelectedOptions` answers "what is the option behind the values already selected". The
  renderer calls both and merges their results — deduped by value, `loading` true while either is
  — so a kit still sees one `options` list and one `loading` flag. react-admin pays the same
  price, with `getMany(ids)` alongside `getList`.

  `searchable` is a flag on `select`, not a new node type: the value and its shape are unchanged.
  It is rejected on `radiogroup` / `checkboxgroup` (they render every option inline) and, for now,
  on `multiselect` (coherent, not yet built — the parse error says so in those words). A
  `searchable` field wired to a static `options` list, or to a plain-function source, throws at
  render naming the field.

  The query reaches the source **raw**, every keystroke. Debouncing and a `minChars` gate are the
  source's job for now — there is deliberately no delay option, constant or timer in the package;
  it intends to take debouncing over later.

  Both kits gained the widget. `@ez-kit/form-heroui` renders `ComboBox` from `@heroui/react`, so
  it costs nothing new. `@ez-kit/form-shadcn` takes a **new dependency, `@base-ui/react`**: the
  `radix-nova` style's own combobox is built on it, Radix ships no combobox primitive, and this is
  the registry's first-class answer. The kit therefore now ships two primitive systems side by
  side; no existing Radix-based block was migrated. Its size budget moves 95 KB → 135 KB (real
  size 124.86 KB, up from 88.88 KB). Tree-shaking is intact — only the combobox lands, not the
  library.

  Who this breaks:
  - **Source authors: no one.** The widening is a union, `query` is additive, and every source
    written against the function shape stays valid.
  - **Third-party kit authors: yes.** `SelectFieldRenderProps` gains a required
    `search: { query, onQueryChange } | undefined` key — the same class of break `loading` made.
    A kit that spreads unknown props onto the DOM must destructure it; one that wants the feature
    branches on `search !== undefined` and must not filter `options` itself.

- 2264a8d: form: a standalone `<Form>` component in two modes, replacing `form.Form`

  `<Form>` is now the single place the `<form>` element is rendered, and it comes in two
  mutually exclusive modes:
  - **uncontrolled** — pass the options `useForm` takes and it runs the hook itself, handing
    the instance to a render prop. The form is created by mounting the element, so unmounting
    it (closing a dialog, switching a record) takes its values, errors and submit state with
    it. `children` is a function because React context cannot carry the form-data generic —
    through context every `name` would degrade to a bare `string`.
  - **controlled** — `<Form form={form}>` around an instance from `useForm`, with plain JSX
    children, for when something outside the markup reads the form.

  **Breaking:** `form.Form` is gone — render `<Form>` instead. `FormWrapperProps` is replaced
  by `FormProps`. Kits now export `Form` alongside `useForm`, and `createForm` returns both.
  `@ez-kit/form-core` re-exports `AnyFormOptions`, which the component uses to tell form
  options from DOM props.

- fd7c480: form: a select/radiogroup option label is `LocalizedText`

  **Breaking (schema authoring).** A `select` / `radiogroup` node's `options` now carry
  `label: LocalizedText` — the new `LocalizedSelectOption` type — so a document delivered by a
  backend can name a translation key instead of shipping finished copy in one language, which
  every other label in the format could already do. A plain string is still a `LocalizedText`,
  so existing schemas keep compiling; only code that typed its option list as `SelectOption`
  needs to switch to `LocalizedSelectOption`.

  `SelectOption` itself is unchanged (`label: string`): the kit contract and the JSX API stay a
  resolved-strings surface, and `FormRenderer` bridges the two through the new
  `resolveSelectOptions(options, translate)`.

  `parseFormSchema` now also validates `options` — a `select` / `radiogroup` with no options
  array, an option missing `value` or `label`, or a label that is neither a string nor a
  `{ key }` object is a `FormSchemaError` instead of a silently empty dropdown.

- fd7c480: Named option sources: a select-like field can name a list instead of carrying it.

  A 200-country list, or a country → city cascade, cannot be written into a form document. The four select-like nodes now take `optionsFrom` — a **name**, never a URL — beside the existing `options`, and the app decides what that name fetches:

  ```json
  {
  	"type": "select",
  	"name": "address.city",
  	"optionsFrom": {
  		"source": "dictionary",
  		"params": { "domain": "cities" },
  		"dependsOn": { "country": "address.country" }
  	}
  }
  ```

  The same prop works in TSX, where the live value is passed directly instead: `<form.SelectField name='address.city' optionsFrom='dictionary' optionsParams={{ domain: 'cities', country }} />`.

  Sources are registered on the new `<FormOptionSources value={…}>` provider — a provider rather than a `FormRenderer` prop, because unlike `fields` / `blocks` / `rules` a source serves the JSX path too. **A source is a React hook**, so it is whatever query the app already has (TanStack Query, SWR, RTK Query, or a plain synchronous list); this package ships no fetching, no cache and no abort logic, and no built-in `dictionary` source. `parseFormSchema` gains `optionSources` and rejects an unregistered name with the node's path, exactly as it does for an unknown rule or block.

  When a source's resolved parameters change, the dependent field's value is cleared immediately — otherwise `{ country: 'de', city: 'msk' }` gets submitted. Parameters are compared by value, and the first computation is skipped so a loaded draft survives mount.

  **Breaking (`@ez-kit/form-core`).** `options` on the four select-like schema members is no longer unconditionally required: they now take exactly one of `options` and `optionsFrom`. A node carrying both, or neither, is a compile error — and a parse error for a delivered document, whose message changed from `"select" is missing an "options" array` to `"select" needs either an "options" array or an "optionsFrom" source`. Every existing schema that writes its `options` out still compiles unchanged.

  **Breaking (`@ez-kit/form-react`).** `options` on the four option-bearing field components is now optional in the types, with the "exactly one of `options` / `optionsFrom`" rule enforced at runtime with the field's name in the message. Expressing it in the types would collide with the string/number correlation those props are already a union over. `BindableForm` gains `setFieldValue`, which every real TanStack instance already has.

  **Fix (`@ez-kit/form-shadcn`).** `SelectField` omitted Radix's `value` prop when the field was empty, which dropped the select into uncontrolled mode: after the user had picked an option, clearing the field left Radix holding its own last value, and the trigger rendered blank — no label, and no placeholder either. The prop is now always passed; Radix reads `''` as "no selection" and draws the placeholder, which is what the empty state was meant to look like all along. Nothing exercised this before, because nothing reset a select from a chosen value back to empty.

## 0.2.0

### Minor Changes

- 8b845e0: Add the `@ez-kit/form-*` packages: TanStack Form with dependency-injected UI kits.

  `createForm({ components })` returns a `useForm` that is a superset of TanStack Form's —
  the instance carries flat, fully-wired field components (`form.TextField`,
  `form.NumberField`, `form.TextareaField`, `form.SelectField`, `form.CheckboxField`) plus
  `form.SubmitButton` and `form.Form`, while the entire native API (`form.Field`,
  `form.Subscribe`, `form.handleSubmit`, `form.state`, `form.AppField`) stays available on
  the same object. Each field renders its own label, description, input and error text, and
  `name` is narrowed to the paths whose value type fits the field.
  - `@ez-kit/form-core` — field kinds, `SelectOption`, validator-error normalisation.
  - `@ez-kit/form-react` — the DI contract and field layer, with zero visual styling.
  - `@ez-kit/form-shadcn` / `@ez-kit/form-heroui` — the two UI-kit implementations.

  Validation is pure pass-through of TanStack Form's native standard-schema validators
  (zod / valibot / arktype); there is no custom resolver.
