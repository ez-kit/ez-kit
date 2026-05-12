'use client'

import { SelectCellInput } from './SelectCellInput'

import type { BadgeCellConfig, FieldState } from '@ez-kit/data-grid-react'

/** Badge cell input on HeroUI v3 — same Select compound as SelectCellInput. */
export function BadgeCellInput(props: FieldState<BadgeCellConfig>) {
	return <SelectCellInput {...props} />
}
