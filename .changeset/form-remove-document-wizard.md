---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Breaking: the document wizard is removed. A `FormSchema` no longer has a `step` node:
`StepNode` is gone from `@ez-kit/form-core` and from the kits' re-exports, and `parseFormSchema`
rejects a node of type `step` as an unknown node type. The `Wizard` member of `FormComponents`, `WizardRenderProps` and
`WizardStep` are removed from `@ez-kit/form-react`, and both kits stop shipping `Wizard` and drop
it from `allFormComponents`. A form split into steps is written in JSX with `form.Steps` and
`form.Step`.
