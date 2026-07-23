import { Description, FieldError, Label } from '@heroui/react'

import type { FieldRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Field chrome for the HeroUI kit.
 *
 * Each piece renders HeroUI's real primitive and is meant to be mounted **inside** the
 * field root (`<TextField>`, `<Select>`, `<Checkbox>`, …). That placement is the whole
 * point: React Aria hands `Label` the control's id, routes `Description` into
 * `aria-describedby`, and lets `FieldError` read the root's validation state. Rendered as
 * siblings of the root — the way a one-size-fits-all field wrapper would have to — none of
 * that wiring exists and HeroUI's own slot styling never applies.
 *
 * Nothing here adds a `data-slot`: HeroUI stamps its own (`label`, `description`,
 * `field-error`) *before* spreading props, so passing one would silently overwrite it and
 * break every `.checkbox [data-slot="description"]`-style rule in `@heroui/styles`.
 *
 * All visual styling for a field lives in this kit; `@ez-kit/form-react` ships none.
 */

export function FieldLabel({ label }: Pick<FieldRenderProps, 'label'>): ReactNode {
	if (label == null) {
		return null
	}

	return <Label>{label}</Label>
}

export function FieldDescription({ description }: Pick<FieldRenderProps, 'description'>): ReactNode {
	if (description == null) {
		return null
	}

	return <Description>{description}</Description>
}

export function FieldErrorText({ errors, invalid }: Pick<FieldRenderProps, 'errors' | 'invalid'>): ReactNode {
	if (!invalid) {
		return null
	}

	return <FieldError>{errors.join(', ')}</FieldError>
}
