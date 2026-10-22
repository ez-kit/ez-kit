import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { COLUMN_DRAGGING_ATTR } from './dragging-attrs'
import { useColumnDragKeyboardGuard } from './keyboard-guard'

/**
 * A collection with the guard on its root, the way a kit mounts it: `onKeyDown` stands in for the
 * collection's own navigation, which react-aria attaches as a bubbling React handler.
 */
function Collection({
	isDragging,
	onKeyDown,
	onRowKeyDownCapture = () => {},
}: {
	isDragging: boolean
	onKeyDown: () => void
	onRowKeyDownCapture?: () => void
}) {
	const guardRef = useColumnDragKeyboardGuard()

	return (
		<div
			ref={guardRef}
			data-testid='collection'
			role='grid'
			tabIndex={-1}
			onKeyDown={onKeyDown}
		>
			<div
				role='row'
				onKeyDownCapture={onRowKeyDownCapture}
				{...(isDragging ? { [COLUMN_DRAGGING_ATTR]: 'true' } : {})}
			>
				<button
					data-testid='grip'
					type='button'
				/>
			</div>
		</div>
	)
}

describe('useColumnDragKeyboardGuard', () => {
	const documentListener = vi.fn()

	afterEach(() => {
		document.removeEventListener('keydown', documentListener, true)
		documentListener.mockReset()
	})

	it('keeps a key from the collection while a row inside it is being dragged', () => {
		const onKeyDown = vi.fn()
		const { getByTestId } = render(
			<Collection
				isDragging
				onKeyDown={onKeyDown}
			/>,
		)
		const bubbling = vi.fn()
		getByTestId('collection').addEventListener('keydown', bubbling)

		fireEvent.keyDown(getByTestId('grip'), { key: 'ArrowDown' })

		expect(onKeyDown).not.toHaveBeenCalled()
		expect(bubbling).not.toHaveBeenCalled()
	})

	/*
	 * The mechanism that made the guard necessary. A react-aria grid row handles an arrow pressed on
	 * a control inside it in a **capture** handler, which React runs at the root (or portal) container
	 * — above the collection — and answers by stopping the key and dispatching a fresh one at the
	 * collection. The drag library then saw that fresh key too, and moved the row a second time. A
	 * guard on the collection element itself runs after that handler, so it has to sit above it.
	 */
	it('keeps a key from a capture handler inside the collection', () => {
		const onRowKeyDownCapture = vi.fn()
		const { getByTestId } = render(
			<Collection
				isDragging
				onKeyDown={vi.fn()}
				onRowKeyDownCapture={onRowKeyDownCapture}
			/>,
		)

		fireEvent.keyDown(getByTestId('grip'), { key: 'ArrowDown' })

		expect(onRowKeyDownCapture).not.toHaveBeenCalled()
	})

	it('leaves a key aimed outside the collection alone, even mid-drag', () => {
		const outside = vi.fn()
		const { getByTestId } = render(
			<>
				<Collection
					isDragging
					onKeyDown={vi.fn()}
				/>
				<input
					aria-label='outside'
					data-testid='outside'
					onKeyDown={outside}
				/>
			</>,
		)

		fireEvent.keyDown(getByTestId('outside'), { key: 'ArrowDown' })

		expect(outside).toHaveBeenCalledTimes(1)
	})

	/*
	 * The drag library listens on the document in the capture phase, ahead of the collection, which
	 * is what lets the guard stop the collection without stopping the drag. A document listener in
	 * the capture phase is the stand-in for it.
	 */
	it('leaves the drag library a listener on the document in the capture phase', () => {
		const { getByTestId } = render(
			<Collection
				isDragging
				onKeyDown={vi.fn()}
			/>,
		)
		// Registered after the guard, as the drag library's is: it binds when a drag starts.
		document.addEventListener('keydown', documentListener, true)

		fireEvent.keyDown(getByTestId('grip'), { key: 'ArrowDown' })

		expect(documentListener).toHaveBeenCalledTimes(1)
	})

	/*
	 * The pointer sensor reads `Escape` on the document in the **bubble** phase, and stopping a key
	 * in the capture phase keeps it from there too — so a guard that stopped every key left a mouse
	 * drag with no way to cancel it. `Escape` is the one key the collection gets no say in anyway.
	 */
	it('lets Escape through to a listener on the document in the bubble phase', () => {
		const bubbling = vi.fn()
		document.addEventListener('keydown', bubbling)
		const { getByTestId } = render(
			<Collection
				isDragging
				onKeyDown={vi.fn()}
			/>,
		)

		fireEvent.keyDown(getByTestId('grip'), { key: 'Escape' })
		fireEvent.keyDown(getByTestId('grip'), { key: 'ArrowDown' })
		document.removeEventListener('keydown', bubbling)

		expect(bubbling.mock.calls.map(([event]) => (event as KeyboardEvent).key)).toEqual(['Escape'])
	})

	it('lets every key through when nothing is being dragged', () => {
		const onKeyDown = vi.fn()
		const { getByTestId } = render(
			<Collection
				isDragging={false}
				onKeyDown={onKeyDown}
			/>,
		)

		fireEvent.keyDown(getByTestId('grip'), { key: 'ArrowDown' })

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	it('follows the drag as it starts and ends', () => {
		const onKeyDown = vi.fn()
		const { getByTestId, rerender } = render(
			<Collection
				isDragging={false}
				onKeyDown={onKeyDown}
			/>,
		)

		rerender(
			<Collection
				isDragging
				onKeyDown={onKeyDown}
			/>,
		)
		fireEvent.keyDown(getByTestId('grip'), { key: 'Space' })
		rerender(
			<Collection
				isDragging={false}
				onKeyDown={onKeyDown}
			/>,
		)
		fireEvent.keyDown(getByTestId('grip'), { key: 'Space' })

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	it('removes its listener when the element goes away', () => {
		const { unmount } = render(
			<Collection
				isDragging
				onKeyDown={vi.fn()}
			/>,
		)
		const remove = vi.spyOn(document, 'removeEventListener')

		unmount()

		expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true)
		remove.mockRestore()
	})
})
