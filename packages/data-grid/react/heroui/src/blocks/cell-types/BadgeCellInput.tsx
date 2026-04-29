'use client'

import { SelectCellInput } from './SelectCellInput'

import type { BadgeCellConfig, CellInputProps } from '@ez-kit/data-grid-react'

export function BadgeCellInput(props: CellInputProps<BadgeCellConfig>) {
	return <SelectCellInput {...props} />
}
