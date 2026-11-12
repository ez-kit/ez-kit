---
'@ez-kit/data-grid-heroui': patch
---

Disable Cancel alongside Save while a modal validates or saves, and add a close control that remains available during pending work. Dismissal abandons the form session; an already-dispatched Query connector mutation continues and cannot overwrite a newer form. The same pending controls are provided by the shadcn registry adapter.
