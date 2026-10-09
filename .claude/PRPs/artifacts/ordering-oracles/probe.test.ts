import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../src/column/create-columns'
import { createTable } from '../../src/create-table'
import { canDropColumn, dropColumn } from '../../src/features/ordering/drop'
import { canMoveColumn, ColumnMoveDirection, moveColumn } from '../../src/features/ordering/ordering'

import type { ColumnDef } from '../../src/column/types'

type Row = { id: number; name: string; email: string; age: number }
const DATA: Row[] = [{ id: 1, name: 'A', email: 'a@b.c', age: 3 }]
const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature })

const LOCKED: ColumnDef<Row>[] = [
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email', ordering: false },
	{ accessorKey: 'age', header: 'Age' },
]

function make(columns: ColumnDef<Row>[], config: Record<string, unknown> = {}) {
	return createTable({ features: F, data: DATA, columns: createColumns<Row>(columns), ordering: true, ...config })
}

describe('probe: locked column inside the span', () => {
	it('step vs drop across a locked middle column', () => {
		const t = make(LOCKED)
		console.log('canMoveColumn(name, End)  =', canMoveColumn(t, 'name', ColumnMoveDirection.End))
		console.log('moveColumn(name, End)     =', moveColumn(t, 'name', ColumnMoveDirection.End))
		console.log('canDropColumn(name, age)  =', canDropColumn(t, 'name', 'age'))
		console.log('dropColumn(name, age)     =', dropColumn(t, 'name', 'age'))
		console.log('canMoveColumn(age, Start) =', canMoveColumn(t, 'age', ColumnMoveDirection.Start))
		console.log('canDropColumn(age, name)  =', canDropColumn(t, 'age', 'name'))
		console.log('dropColumn(age, name)     =', dropColumn(t, 'age', 'name'))
	})
})
