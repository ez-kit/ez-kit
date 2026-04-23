'use client'

import { SelectCellInput } from './SelectCellInput'

import type { CellInputProps } from '@ez-kit/data-grid-react'

export function BadgeCellInput(props: CellInputProps) {
	return <SelectCellInput {...props} />
}
