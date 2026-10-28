---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

**Step flows in JSX.** Every form instance gains `form.Steps` and `form.Step`: a headless step flow
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
