# @ez-kit/form-react

## 0.5.0

### Minor Changes

- 3f778c2: `ArrayField` is now registered with the fields, not the components, and carries its entry view as
  `ArrayField.Item`: `fields: { ArrayField: Object.assign(Frame, { Item: Entry }) }`. A kit's
  `ArrayField` is a new root export of both `@ez-kit/form-shadcn` and `@ez-kit/form-heroui`, and it
  already has its `Item`. Inside an array entry, only field components are scoped to the entry:
  `item.Section`, `item.SubmitButton` and `item.GridItem` are gone from the entry scope, which is a
  compile break for anyone who wrote them — use `form.Section` and the like around the array
  instead.
- 3bdd24c: **Kit contract:** every field's render props carry `data-form-id`, the id of the form the field
  belongs to, and a kit spreads it onto the same element as `data-field`. Both kits do; a custom kit
  that picks its props rather than spreading them must add it, or focus-on-error skips its fields.
  `form.Field` hands it over too.

  **Focus on the first error.** After a submit that fails validation, the first field in DOM order
  that has an error takes focus — its control by `id`, or the first focusable element inside it. It
  works in a `<form>`, under `FormProvider` alone, and with several forms on one page. `focusOnError:
false` (an option of `useForm`, a prop of the uncontrolled `<Form>` / `<SchemaForm>`) turns it off;
  `onSubmitInvalid` still runs, after the focus.

  **Server errors.** `form.setServerErrors({ fields, form })` puts errors a server reported onto the
  form: `fields` maps a field path to a message or a list of them, `form` holds messages for the form
  as a whole. A field's error shows at once, stays when the field is focused and left, and goes the
  first time its value changes — it does not come back if the value is changed back. Every server error
  goes on a whole-form submit or reset, whichever API starts it — the instance `useForm` returns, or the
  `formApi` TanStack passes to `onSubmit`, listeners and validators. When the errors name a field,
  the first field with an error takes focus, unless `focusOnError` is `false`.
  Field errors live in TanStack's `errorMap.onServer`, so every kit renders them unchanged.

  `serverErrors` is the declarative form of the same: an option of `useForm` and a prop of the
  uncontrolled `<Form>` and `<SchemaForm>`, applied whenever its value changes by reference — the shape
  `useActionState` hands back. Messages for the form as a whole arrive in `form.Submit`'s `formErrors`
  and do not disable submitting; the next whole-form submit clears them.

  **Searchable sources wait for the user.** A searchable field over an option source hands the source
  its query after 300 ms without typing, not on every keystroke; `debounce` and `minLength` on the
  source, or `searchable={{ debounce, minLength }}` on the field (and in a schema node), tune it. Below
  `minLength` the source receives `query: undefined` and the kit shows a hint. An in-memory searchable
  list still filters at once. **Kit contract:** `search` gains `minLength` and `belowMinLength`, and
  `loading` is now also `true` while a debounce is pending — on an in-memory list too, once a field sets
  `debounce` above 0. A kit that blanks or disables its control on `loading` does so on every pause.

  **Migration:** a source that already debounces its query internally now waits twice — drop its own
  debounce, or set `debounce: 0` on the source.

- a394b7e: `form.Submit`'s `formErrors` lists the issues a form-level standard schema reports without a path;
  it used to print the whole issue record as `[object Object]`. A group from `form.FormGroup` or
  `useFormGroup` gains `errors`: the messages its own validators report with no path (issues with a
  path show on their fields). `group.state.meta.errors` stays TanStack's raw value.

  `withForm`'s `form` prop is optional: a block placed without one takes the form above it (`<Form>`,
  `<SchemaForm>` or `FormProvider`), typed by the block's own options — a cast, as
  `useFormContext<V>()` is. With neither, it throws a named error. A `form` that is passed is checked
  against the block's data and fields but no longer against its validators: a block declared with
  `defaultValues` alone used to reject every form that had been given `validators`.

  Groups carry the bundle's fields. Inside `form.FormGroup` and a `withFieldGroup` block, `group.TextField`,
  `group.ArrayField`, `group.Array` and every field the app registered take a `name` relative to the
  group — a path for `form.FormGroup` and `fields='…'`, the map's own key for a field map. `form.X`
  inside a group stays absolute: the coordinates come from the object a field is called through.
  `withFieldGroup` is now built per bundle, and a block placed without `form` takes the form above it,
  with `fields` then unchecked; with neither, it throws a named error. Both kits export the new types
  `GroupFields`, `FieldGroupScope`, `FormGroupScope`, `FieldGroupPlacementProps`,
  `UncheckedFieldGroupPlacementProps`, `WithFieldGroupOptions` and `FieldGroupBlock`.

  **Groups validate and submit.** `withFieldGroup` takes `validators` — a Standard Schema or a function
  over the block's own shape, on `onMount`, `onChange`, `onBlur`, `onSubmit` and their async forms.
  Issues with a path land on the real fields; issues without one are the block's `group.errors`.
  `group.handleSubmit()` checks the block and calls the `onGroupSubmit` passed where the block is
  placed, with `value` typed by the block. `meta` is the argument `group.handleSubmit(meta)` was called
  with, `undefined` without one. **Breaking:** a block's `group.handleSubmit` used to submit
  the whole form; call `form.handleSubmit()` for that. On every group (`form.FormGroup`, `useFormGroup`,
  a block), a submit first clears the server errors of the fields inside it, runs the groups placed
  inside it, and focuses the group's first error when it fails. A whole-form submit runs the form's
  validators and no group's, as in TanStack: the form's schema decides whether the form is sent, so a
  rule that must hold the form belongs in it — build it from the blocks' schemas, and describe a part
  that is there only sometimes with `z.discriminatedUnion` or `superRefine`. An error a mounted group
  has already reported still blocks the form's submit. Both kits also export `GroupValidators`,
  `GroupValidator`, `GroupAsyncValidator` and `OnGroupSubmit`.

  A group that unmounts — a block behind a checkbox, a step — now takes its errors with it, including
  those it put on fields that were never mounted; before, they stayed and kept the form from submitting
  for good. A field mounted after a submit attempt shows the errors the form reported on it without
  being touched. `revalidateLogic` is re-exported from `@ez-kit/form-react` and both kits, for a form
  schema on `onDynamic` that stays quiet until the first submit and re-checks every change after it. In
  development, a group whose name begins another field's name (`billing` beside `billingDiffers`) logs
  an error: TanStack Form matches a group's fields by a plain prefix, so editing that field runs the
  group's validators.
  Two native groups on one name — a `form.FormGroup` and a block placed on its path — share one group
  state, so keep one validating group per branch: in development, two with validators log an error.

  A block placed with a field map — `fields={{ password: 'newPassword', confirm: 'newPasswordRepeat' }}`
  — validates and submits the same way: its value is assembled from the mapped fields, issues with a
  path land on the mapped field, and its own issues are `group.errors`. Those are kept under an
  `errorMap` key of the form `onGroup:<id>`, which `form.Submit`'s `formErrors` leaves out.

- dda2e5b: Add a form context. `<Form>` and `<SchemaForm>` provide it, `FormProvider` provides it without
  rendering a `<form>` (a form whose `<form>` element sits lower in the tree, or none at all), and
  `useFormContext()` reads it — the base form API, for components that do not depend on a particular
  form, such as a save bar. `createForm` also returns `FormProvider`.

  `useFormContext<Values>()` takes an optional type argument: it types the values, the base API and
  the kit's built-in fields by `name` over `Values`. It is a cast, not a check — nothing verifies that
  the form above holds `Values` — so a component that names paths in one form's data is better written
  with `withForm` or `withFieldGroup`.

- 5c8b8fa: Add `createSchemaForm`: the same options as `createForm`, returning the same bundle plus
  `SchemaForm`. `createForm` no longer returns `SchemaForm` and no longer pulls in the schema
  renderer, so an app that writes its forms in JSX does not ship it. Replace
  `const { SchemaForm } = createForm(options)` with `createSchemaForm(options)`; fields registered
  there resolve from JSX and from a document exactly as before.
- 1290e36: Every form instance gains `form.NativeField`: TanStack's render-prop field, with its `FieldApi`, under
  a new name. It is also on every array entry (`item.NativeField`, item-relative).

  Every group gains `NativeField` too: `withFieldGroup` and `useFieldGroup` groups (names mapped
  through `fields`), and `form.FormGroup` and `useFormGroup` groups (names relative to the group's
  `name`). `useFieldGroup`, `useFormGroup` and the bundle's `withFieldGroup` are now this package's own,
  taking the form instance `useForm` returns; they no longer accept a TanStack `FormApi` built
  elsewhere, nor a group as another group's `form`.

  On a group and on an array entry, `NativeField`'s `name` and its validators' `onChangeListenTo` /
  `onBlurListenTo` are relative; the `field` its render prop receives is the root form's, so
  `field.name` is the absolute path (`address.city`).

  **Breaking:** `form.Field` is no longer TanStack's field. It binds a control of your own the way a
  registered field is bound: its render prop receives `id`, `name`, `value`, a value-taking `onChange`,
  `onBlur`, `errors` (already filtered by the display rule), `invalid`, `data-field`, … — the props a
  `defineFieldType` field gets — and it validates through `validate`, like every field of this package
  (TanStack's `validators` stay on `form.NativeField`). It is also on every array entry
  (`item.Field`) and every group (`group.Field`), with names relative to them. Code written against
  TanStack's `form.Field` (`field.state.value`, `field.handleChange`) moves to `form.NativeField` and
  no longer compiles in `form.Field`. Three more compile breaks follow from retyping `Field` and `FormGroup`: a group's submit meta now defaults to `never` (TanStack resolved an unspecified one to the form's) and `useFieldGroup` no longer takes `onSubmitMeta`; `useFieldGroup` no longer takes TanStack's `formComponents` option, so an existing `formComponents: {}` is an excess-property error; and the instance `useForm` returns is no longer assignable to a TanStack API whose parameter is typed `FormApi`, such as `useField({ form })` from `@tanstack/react-form`, which needs a cast. Both kits export the new types `FieldProps`, `FieldControlProps`,
  `BoundFieldComponent`, `FieldGroupInstance`, `FieldGroupOptions`, `FormGroupInstance` and
  `FormGroupProps`.

  `form.AppField` is now this package's binding seam — the component every bound field renders
  through — and no longer provides TanStack's field context.

- 5545349: Add `FormInstance<TValues>`, the one public type for a form instance. `KitFormApi`, `BoundForm`,
  `RendererForm` and `BoundFieldApi` are no longer exported: write `FormInstance<Values>` where you
  wrote `KitFormApi<Values, …twelve parameters…>`.

  An app with custom fields writes `FormInstance<Values, Fields>` where it wrote
  `KitFormApi<Values, …twelve parameters…, Fields>`.

  `BoundFieldApi` has no new name: to name an array scope's `field`, write
  `ArrayFieldScope<Item>['field']`. The controlled `SchemaForm`'s `form` prop is now a `FormInstance` rather than a structural slice of
  one: every instance `useForm` returns is still accepted, but a hand-built object carrying only
  `handleSubmit` and the field components no longer is.

- c143f83: A built-in field passes every prop it does not bind to the kit's component, flat. `form.<Field>`
  keeps `name`, `label`, `description`, `disabled`, `required` and `validate` — plus `options`,
  `optionsFrom`, `optionsParams`, `loading`, `searchable`, `creatable` and `createLabel` on the four
  option-bearing fields — and everything else reaches the component under its own name:
  `<form.TextField name='password' type='password' autoComplete='current-password' maxLength={64} />`.
  What a field accepts beyond the binding is read off the parameter of the component registered under
  its key, so a kit or an app declares a prop by typing its component and nothing else: under a
  `TextField` that declares `variant?: 'flat' | 'bordered'`, `variant='bordered'` compiles and
  `variant='outlined'` does not. The props the binding computes — `value`, `onChange`, `onBlur`, `id`,
  `name`, `errors`, `invalid`, `required`, the `data-field` attributes, and `options` / `loading` /
  `search` on the option-bearing fields — are a compile error on `form.<Field>` and win at runtime when
  they arrive anyway. The same holds for an array entry's fields and a group's.

  The kits declare what they forward and export it as `<Field>KitProps` (`TextFieldKitProps`,
  `SliderFieldKitProps`, …). shadcn forwards the native `<input>` / `<textarea>` attributes of its text
  fields and the Radix primitive's props of the checkbox, switch, radio group and slider. HeroUI
  forwards the React Aria root's props, which is where React Aria takes an input's attributes, and
  puts `placeholder` and `rows` on the input itself. Both declare `placeholder`, `type`, `rows`, `min`,
  `max` and `step` wherever they did before, so existing JSX is unchanged.

  Breaking: the kit contract no longer carries input attributes. `placeholder`, `type`, `rows`, `min`,
  `max` and `step` are gone from the render props (`TextFieldRenderProps` … `DateRangeFieldRenderProps`)
  and from the consumer props (`TextFieldProps` … `DateRangeFieldProps`, now the binding props alone).
  A third-party kit that read them declares them on its own components —
  `(props: TextFieldRenderProps & { placeholder?: string; type?: string }) => …` — and a component that
  requires a prop beyond the contract no longer satisfies `FormFieldSlots`. `TextInputType` is no
  longer exported from `@ez-kit/form-react` or either kit: write the string, `type='password'` rather
  than `type={TextInputType.Password}`. A schema document is unaffected — the renderer still passes a
  node's `placeholder`, `rows`, `min`, `max`, `step`, and `inputType` as `type` — but those reach the
  kit unchecked. A hand-written `FormInstance<V>` defaults to the contract's own field signatures and so
  carries no kit props; name the field set, `FormInstance<V, typeof fields>`, to keep them.

- 8aee311: TanStack Form is now a dependency of `@ez-kit/form-react` rather than a peer of every form package,
  so an app gets exactly one copy and no longer installs `@tanstack/react-form` or
  `@tanstack/form-core` itself — remove them from your `package.json` unless you use TanStack
  elsewhere. The kits depend on `@ez-kit/form-react` alone; the schema-authoring API and `useSelector`
  are re-exported from it and from each kit.

  `@tanstack/form-core` is now a peer of `@ez-kit/form-core`: if you install `@ez-kit/form-core` on its
  own (for example to use it in a server component), add `@tanstack/form-core` beside it.

- ad434e0: `createForm` takes `{ FormElement?, fields?, components? }`, all optional. `form.X` exists in the
  types for exactly what was passed: a field kind under its key, and any component under its key with
  its own props — `components: { SaveBar }` gives `<form.SaveBar />`. Without `FormElement` the form
  renders a plain `<form>`. A component reads the form from context, so it needs `<Form>`,
  `<SchemaForm>` or `<FormProvider>` above it: an instance from `useForm` rendered under a
  hand-written `<form>` is wrapped in `<FormProvider form={form}>`, or `form.SubmitButton` throws.
  Because `<Form form>` puts its instance in that context, the controlled `form` prop now takes a
  whole form instance (`FormInstance<V, NoRegistry, NoRegistry>`, generic over the values) rather than
  any object with a `handleSubmit`; every `useForm` result is accepted, and `FormProvider` now also
  accepts one whose values hold an array.

  Breaking: the `Button` and `Form` slots are gone. Pass the kit's `FormElement` as `FormElement`, and
  its `SubmitButton`, `Section` and `GridItem` in `components`; `form.SubmitButton` is now
  the `SubmitButton` you passed. `ArrayScope.Button` is removed — a custom array layout renders its
  own buttons. `ButtonProps`, `SectionRenderProps` and `GridItemRenderProps` are no longer exported;
  a kit's `Section` and `GridItem` take `SectionProps` and `GridItemProps`. `createForm` no longer
  warns about missing slots; `SchemaForm` throws a named error, before it renders anything, when a
  document needs a component or a field kind that was not passed — a hidden node included, so a built-in kind with no slot (`DateField`) or an unregistered custom type
  no longer throws `Unknown node type` mid-flow.

  Every key of `FormFieldSlots` and `FormComponents` is now optional, so a third-party kit checks
  that it ships all of them with `satisfies AllFormFieldSlots` / `satisfies AllFormComponents`. A
  field set typed `FormFieldSlots` gives possibly-`undefined` members; a `satisfies`-checked one gives
  required members. A misspelt built-in key in `fields` is a type error, and every custom entry is checked against
  what the generic binder passes: a hand-written field that types its value
  (`(p: CustomFieldRenderProps<number>) => …`) is declared with `defineFieldType` instead. The exported
  `FormFieldComponents` holds only the field kinds — `Array` and `Submit` are `FormPrimitives`, and
  `SubmitButton`, `Section` and `GridItem` are the components you pass. `FormInstance<V>` defaults to
  every field kind and all four components, the shape a kit's bundle has; name `NoRegistry` for an
  empty set, as in `FormInstance<V, typeof fields, NoRegistry>`.

- 299f1d3: Rename `OptionsSource` to `OptionSourceRef` — it is the document's reference to a source, not the
  source. `OptionSourceInput` and `OptionSourceResult` move to `@ez-kit/form-core` and are still
  re-exported from `@ez-kit/form-react` and both kits.
- 1bda12e: Breaking: the document wizard is removed. A `FormSchema` no longer has a `step` node:
  `StepNode` is gone from `@ez-kit/form-core` and from the kits' re-exports, and `parseFormSchema`
  rejects a node of type `step` as an unknown node type. The `Wizard` member of `FormComponents`, `WizardRenderProps` and
  `WizardStep` are removed from `@ez-kit/form-react`, and both kits stop shipping `Wizard` and drop
  it from `allFormComponents`. A form split into steps is written in JSX with `form.Steps` and
  `form.Step`.
- 15c6d9c: `createForm` rejects a field or component registered under a name the form instance already owns
  (`Subscribe`, `state`, `reset`, `Field`, `Submit`, …) or under a name used in both `fields` and
  `components` — a type error at the key, and an error thrown by `createForm`. Previously such a key
  silently replaced the instance's own member.
- 1bda12e: Breaking: a form document is now JSX written as data. A block names a component from the bundle's
  `components` — the same one JSX reaches as `form.<Name>` — takes its `props` flat under the names
  JSX uses, and with `children` is a container. `columns` goes on any container: a block with
  children, an `array` (laying out each entry) or the document itself, and the renderer puts the
  kit's grid inside it.

  | Before                                          | After                                                                          |
  | ----------------------------------------------- | ------------------------------------------------------------------------------ |
  | `{ type: 'section', title, columns, children }` | `{ type: 'block', component: 'Section', props: { title }, columns, children }` |
  | `{ type: 'submit', label: 'Save' }`             | `{ type: 'block', component: 'SubmitButton', props: { children: 'Save' } }`    |
  | `<SchemaForm blocks={{ Banner }} />`            | `createSchemaForm({ components: { Banner } })`                                 |
  | block component takes `{ props }`               | block component takes its props flat                                           |
  | `{ key: 'x', params }`                          | `{ i18n: 'x', params }`                                                        |
  | `parseFormSchema(doc, { blocks })`              | `parseFormSchema(doc, { components })`                                         |
  | `components.GridItem`, `form.GridItem`          | `components.Grid` with `Grid.Item`, `form.Grid` / `form.Grid.Item`             |
  | `<form.Section columns={2}>`                    | `<form.Section><form.Grid columns={2}>…</form.Grid></form.Section>`            |

  `SectionNode`, `SubmitNode`, `BlockRegistry` and `SectionProps.columns` are removed;
  `GridProps`, `GridSlot`, `isBlockNode` and `hasChildren` are added. `parseFormSchema` rejects a
  `section` or `submit` node naming the block that replaces it, a block naming `Grid` or carrying
  `label` / `description` / `disabledWhen`, a `colSpan` whose container sets no `columns` or fewer than it spans, and block `props` that JSON
  cannot carry. A
  block's top-level `{ i18n }` props are translated through `translate`.

- a27cd8c: Rename `FormRenderer` to `SchemaForm`, and its prop types to `SchemaFormControlledProps`,
  `SchemaFormUncontrolledProps` and `SharedSchemaFormProps`. It is a form whose children come from a
  schema document; the name now pairs with `Form` and with `defineFormSchema`. Behaviour is unchanged.
- 576593e: **Step flows in JSX.** Every form instance gains `form.Steps` and `form.Step`: a headless step flow
  over one form, with nothing drawn by the package. `form.Steps` holds which step is on screen, which
  the user has tried to leave and which passed — outside the form's values, so none of it reaches
  `onSubmit`, `isDirty` or `reset`. `form.Step` renders its children while it is on screen; steps are
  listed in JSX order, and one that applies only sometimes takes `when` and is skipped in place.
  `initial` renders a step on the server, and `step` / `onStepChange` make the step controlled.

  A step learns its fields by rendering them — every bound field, group and array entry inside it — and
  remembers them while it is off screen. "Next" (`goNext`) is a submit of the step: it marks the step's
  fields touched, runs their validators, the form's validators limited to them, the groups inside the
  step and the step's own `validators`, runs async validators only once the sync ones passed, and moves
  on only if the step is clean; otherwise it focuses the first error. A whole-form submit runs no step's
  validators — the form's schema holds the submit. `linear` (on by default) lets a forward `goTo` pass
  only steps that passed and are still valid; `linear={false}` jumps anywhere, while "Next" still checks.

  The parts hand state to your own markup: `form.Steps.List` (`steps` with `name`, `visited`, `invalid`,
  plus `current` and `goTo`), `form.Steps.Item` and `useStep(name)` for one step, `form.Steps.Controls`
  (`canGoBack`, `isLast`, `isValidating`, `stepErrors`, `formErrors`, `goBack`, `goNext`), and
  `form.Steps.Subscribe` / `useSteps(selector, equal?)` for any slice. `useStep`, `useSteps` and the step
  types are exported from `@ez-kit/form-react` and both kits.

  A step's values survive the step being left or skipped; send the schema's output —
  `schema.parse(value)` — to leave a skipped step out. Every form now carries the step code, which raises
  `@ez-kit/form-react`'s size budget to 19.5 kB.

- bfe01fe: Add `form.Submit`, a headless render-prop on every form instance:
  `{ canSubmit, isSubmitting, isDirty, formErrors, submit }`. `submit` is `form.handleSubmit`, so a
  button built on it works outside a `<form>` element too.

### Patch Changes

- bf06e11: `SchemaForm` no longer resolves a custom field kind or a block component named after an
  `Object.prototype` member (`toString`, `constructor`, …). Such a document now fails with the same
  error as any unregistered kind instead of rendering the prototype function.
- Updated dependencies [c53a0af]
- Updated dependencies [c143f83]
- Updated dependencies [8aee311]
- Updated dependencies [299f1d3]
- Updated dependencies [1bda12e]
- Updated dependencies [1bda12e]
  - @ez-kit/form-core@0.5.0

## 0.4.0

### Minor Changes

- c4ac267: Repeatable field groups, through both authoring paths.

  JSX scopes the components to the entry rather than composing a path, so a field inside one is
  written `<item.TextField name='firstName' />` and checked against the item's type:

  ```tsx
  <form.ArrayField
  	name='people'
  	newItem={{ firstName: '' }}
  >
  	{({ items }) =>
  		items.map((item) => (
  			<item.Item key={item.key}>
  				<item.TextField
  					name='firstName'
  					label='Name'
  				/>
  			</item.Item>
  		))
  	}
  </form.ArrayField>
  ```

  A document says the same thing with an `array` node whose `children` are the entry's fields,
  named relative to the entry. Nested arrays work on both paths. `defineFormItem` authors an
  entry's field set separately, for reuse across forms and across arrays.

  Conditions inside an entry use the `./` prefix that `FieldRef` had reserved — `{ field: './kind',
eq: 'vip' }` means _this_ entry's `kind`, while an absolute ref still reaches the form root.

  Validation treats the list as a value of its own: `minLength` / `maxLength` count entries, and a
  named `rule` receives the whole array, so a cross-item check ("no two people share an email") is
  expressible. Such a rule may answer with `{ path, message }` issues that name the offending
  entry instead of blaming the list.

  `form.Array` is the headless counterpart of `form.ArrayField`: same engine, same scope handed to
  `children`, but it draws no frame, no label and no add control of its own — it renders exactly
  what the render prop returns. Reach for it when the kit's own chrome doesn't fit the layout (rows
  in a table, a remove control folded into a card heading, and so on):

  ```tsx
  <form.Array
  	name='people'
  	newItem={{ firstName: '' }}
  >
  	{({ items, add, Button }) => (
  		<>
  			{items.map((item, index) => (
  				<item.Item
  					key={item.key}
  					label={`Person ${index + 1}`}
  				>
  					<item.TextField
  						name='firstName'
  						label='Name'
  					/>
  				</item.Item>
  			))}
  			<Button onClick={add}>Add person</Button>
  		</>
  	)}
  </form.Array>
  ```

  `item.Item` works the same way inside the primitive — there's just no array-level `itemLabel` /
  `removeLabel` / `reorderable` to fall back to, so `Item` takes its own `label`, `removeLabel` and
  `reorderable` directly. The scope's `disabled` and `required` mirror the props given to `Array` (or
  `ArrayField`) as plain data, since a bare primitive has no frame of its own to render them on;
  likewise `errors` and `invalid` carry the list's own validation failures, but **nothing renders
  them for you** — a `minLength` failure still blocks submit even when the render prop doesn't read
  `errors`. https://ez-kit-docs.vercel.app/docs/form/arrays calls this out at length.

  **`ButtonProps` gained an optional `onClick`.** The kit's generic button used to be only the
  submit button, which fires through the surrounding `<form>`'s submit event and takes no handler —
  now the scope's `Button` (used above for `add`) needs to be clickable too. This is additive at the
  type level and adds no `FormComponents` key, but it is a real behavioural gap for a kit outside
  this repo: **implement `Button` without honouring `onClick` and it silently becomes a dead
  control**, something the type system cannot catch. The shadcn and HeroUI kits already wire it
  through.

  **The submit marker moved off the non-submit buttons.** Both kits stamped every `Button` as the
  form's submit — `data-slot='form-submit'` in shadcn, `data-form-submit` in HeroUI — which was
  accurate while the only `Button` was the submit button. Now that the array scope hands the same
  component out for add, remove, duplicate and reorder controls, the marker is stamped only when the
  button's `type` is `'submit'`; anything else gets `data-slot='form-button'` / `data-form-button`.
  CSS or a test keying on the submit marker to reach a scope button needs to switch to the new one.
  This matters beyond this repo for shadcn: those files ship as the registry payload `npx shadcn add`
  copies into a project, so a consumer who already ran it has the old spelling in their own tree.

  **The item type is read from `name`.** `ArrayProps` and `ArrayFieldProps` are generic over the
  array path (`<TFormData, TName extends ArrayKeys<TFormData>>`) rather than over the item, so `name`
  is the inference site and `newItem`, `children` and the scope are resolved from the value at that
  path. An inline `newItem` therefore needs no annotation even when a key of the item is itself an
  array, and a `newItem` that does not match reports on **`newItem`**, naming the item type and the
  key at fault. A `newItem` missing a key of the item is now a compile error rather than an
  uncontrolled input on the new row. `@ez-kit/form-core` exports `ArrayKeys` and `ArrayItemOf`, the
  two helpers the schema side already used, so a kit or app can spell the same thing. Type-level
  only — no runtime change — but code that wrote the type arguments explicitly
  (`ArrayProps<Values, Person>`) becomes `ArrayProps<Values, 'people'>`.

  **Breaking for a kit outside this repo.** `FormComponents` gains two required slots,
  `ArrayField` and `ArrayItem`, so a kit that wrote `satisfies FormComponents` must implement
  them. The shadcn and HeroUI kits already do. `form.Array` adds no further slot — it reuses the
  same two.

  Two behavioural fixes come with it, both from the same root cause — the traversal that decides
  what a schema owns now follows paths instead of top-level keys:
  - `stripHiddenValues` now strips a hidden field addressed by a dotted path (`company.inn`) out
    of its parent object. It previously left it in place, and the value reached `onSubmit`.
  - `minLength` / `maxLength` now apply to an **empty** list. A `minLength: 1` used to pass on
    `[]`, which is the one case the option exists for; the same fix makes it work on an empty
    multi-select.

- 03df900: The field set is no longer closed: an app registers its own field kinds and gets them typed.

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

- 0dc4733: A schema now carries its own value type, so `FormRenderer`'s `onSubmit` no longer needs
  `defaultValues` to type `value`.

  ```tsx
  const schema = defineFormSchema<Order>()({
  	version: 1,
  	children: [{ type: FormFieldType.Text, name: 'email' }],
  })

  // before: `value` was `unknown` here — only `defaultValues` could pin it
  // after:  `value` is `Order`
  <FormRenderer schema={schema} onSubmit={({ value }) => save(value)} />
  ```

  `TValues` appeared in a node only inside `DeepKeysOfType<TValues, …>`, a conditional type no
  inference can run backwards through: from `name: 'email'` TypeScript cannot ask which object
  produces that union, so it fell back to `unknown`. `defaultValues` was the only ordinary-position
  occurrence anywhere nearby, which made it the sole inference site — and a backend-delivered
  document, the case where the schema is the only thing that knows the shape, is exactly the case
  with no `defaultValues` to state it with.

  `FormSchema` gained an optional, type-only `__values` marker and `defineFormSchema` re-attaches it
  on the way out. It is never written and never read at runtime: `defineFormSchema` still returns its
  argument by identity, so the property exists in the type and in no object, and nothing new is
  serialised back to a backend. The same trick as `defineFieldType`'s `__props` / `__value`.
  `parseFormSchema<Order>(json)` carries the type the same way.

  Nothing is required of you: a hand-built or unannotated schema stays assignable and behaves exactly
  as before. The one way this can surface is as a **new** type error where `defaultValues` and the
  schema disagreed — previously `unknown` masked the mismatch, and it is now reported at the call
  site.

### Patch Changes

- Updated dependencies [c4ac267]
- Updated dependencies [03df900]
- Updated dependencies [0dc4733]
  - @ez-kit/form-core@0.4.0

## 0.3.1

### Patch Changes

- f12aac9: Make the React 18 support these packages already declared actually hold, and correct the one place
  where it could not.

  The packages have advertised `react: ">=18.0.0"` while the source used two spellings React 19
  introduced: the `<Context value>` JSX shorthand, and `ref` as a plain prop on a function component.
  Both fail silently on React 18 — the shorthand renders a context object as an element, and a
  stripped `ref` leaves the shared layer measuring nothing, so the sticky header published no height
  and pinned rows stacked on one another. Providers are now written as `<Context.Provider>`, and
  every component the layer hands a ref to (`DataGrid.Row`, the kits' `Thead` / `Tr`, shadcn's
  `Button` and `ComboboxChips`) forwards it with `forwardRef`.

  `DataGrid.Row` is consequently a `forwardRef` component rather than a plain function. It is used
  and typed exactly as before — `ref` stays part of `DataGridRowProps`, and the generic
  (`<DataGrid.Row<Order>>`) still applies — but code that inspected it as a value, rather than
  rendering it, now sees an exotic component object instead of a function.

  `@ez-kit/data-grid-heroui` and `@ez-kit/form-heroui` narrow their `react` / `react-dom` peer range
  to `>=19.0.0`. Their own peer `@heroui/react@3` requires `react: ">=19.0.0"`, so the `>=18` these
  kits advertised was never installable; the range now says what upstream already enforced.

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

- fd7c480: Ship `'use client'` in the published bundles, make TanStack Form a peer dependency, and
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

- 5a6bf03: **`form.Section` and `form.GridItem` — the JSX half of the layout the document side already had.**

  Both kits have implemented `Section` and `GridItem` since v1: the schema renderer draws a `section`
  node as a headed column grid and wraps each child of that grid in a `GridItem` carrying the node's
  `colSpan`. Neither was reachable from JSX — `createForm` built the fields and nothing else — so a
  hand-written form had to reproduce the grouping in its own markup, which is what the docs' showcase
  example did, in six lines of local component nobody could import.

  They are now on the form instance beside the fields:

  ```tsx
  <form.Section
  	title='Company'
  	columns={3}
  >
  	<form.GridItem colSpan={2}>
  		<form.TextField
  			name='company'
  			label='Company'
  		/>
  	</form.GridItem>
  	<form.TextField
  		name='vatId'
  		label='VAT id'
  	/>
  </form.Section>
  ```

  The one difference from the document spelling is where the span is written: a node carries
  `colSpan` itself, because a node cannot wrap itself, while JSX wraps the child — and only where a
  span above one column is wanted, since an unwrapped child is already a cell of its own. Both reach
  the same kit components, so the two spellings still produce identical DOM.

  New exported types: `SectionProps`, `GridItemProps`. New docs page: [Layout](https://ez-kit.dev/docs/form/layout).

- fd7c480: feat(form): a `loading` flag for option-bearing fields

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

### Patch Changes

- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [2264a8d]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
  - @ez-kit/form-core@0.3.0

## 0.2.0

### Minor Changes

- 77390a1: Invert the form UI-kit contract: a kit now owns each field's entire element tree.

  `@ez-kit/form-react` no longer renders any DOM. Instead of asking a kit for chrome
  primitives (`FieldRoot`, `Label`, `Description`, `ErrorText`) and assembling them itself in
  one fixed order as siblings of the input, it hands the kit one flat props object per field
  (`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`) carrying
  identity, `label`, `description`, `errors`, `invalid`, `value`/`onChange` and `onBlur`.

  This fixes HeroUI, where a field is a React Aria **context**: `Label`, `Description` and
  `FieldError` must be children of `<TextField>` to receive ids, `aria-describedby` and
  validation state. The HeroUI kit now renders HeroUI's documented anatomy — including its
  real `FieldError` instead of a hand-rolled stand-in — and drops the CSS `order` hacks that
  were reordering the checkbox layout. The shadcn kit keeps its sibling layout behind its own
  internal `FieldShell`.

  The consumer API is unchanged: `form.TextField` and friends work exactly as before. Only
  custom kits need updating.

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

- 03073ed: Lay a checkbox field out as `[control] Label` on one row.

  The shared field frame renders chrome in one fixed order — label, description, input, error — which is right for every field except a checkbox, where it left the control stranded under its own label. Both kits now reorder that case themselves, with description and error keeping a full row beneath.

  `FieldRootProps` declares the `data-field`, `data-field-type` and `data-invalid` attributes it receives, so a kit can branch on the field kind instead of only matching it from CSS.

### Patch Changes

- Updated dependencies [8b845e0]
  - @ez-kit/form-core@0.2.0
