import * as shared from '@ez-kit/data-grid-react/dnd-kit'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as local from './dnd'

describe('the kit adapter compatibility entry', () => {
	it('preserves all runtime export identities', () => {
		expect(Object.keys(local).sort()).toEqual([
			'AnchorSide',
			'adapter',
			'dragActivationConstraints',
			'hasTravelled',
			'toDragAnchor',
			'toDragOverEvent',
			'toDropEvent',
		])
		for (const key of Object.keys(local) as (keyof typeof local)[]) expect(local[key]).toBe(shared[key])
	})
	it('preserves every existing public type', () => {
		expectTypeOf<local.DragActivationConstraints>().toEqualTypeOf<shared.DragActivationConstraints>()
		expectTypeOf<local.DragActivationEvent>().toEqualTypeOf<shared.DragActivationEvent>()
		expectTypeOf<local.DragActivationSource>().toEqualTypeOf<shared.DragActivationSource>()
		expectTypeOf<local.SortableDragEndEvent>().toEqualTypeOf<shared.SortableDragEndEvent>()
		expectTypeOf<local.SortableDragStartEvent>().toEqualTypeOf<shared.SortableDragStartEvent>()
		expectTypeOf<local.AnchorSide>().toEqualTypeOf<shared.AnchorSide>()
		expectTypeOf<local.DragAnchor>().toEqualTypeOf<shared.DragAnchor>()
		expectTypeOf<local.SortableManager>().toEqualTypeOf<shared.SortableManager>()
		expectTypeOf<local.DropContext>().toEqualTypeOf<shared.DropContext>()
		expectTypeOf<local.SortableDragOverEvent>().toEqualTypeOf<shared.SortableDragOverEvent>()
	})
})
