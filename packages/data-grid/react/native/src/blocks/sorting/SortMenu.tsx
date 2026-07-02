import type { SortMenuProps } from '@ez-kit/data-grid-react'

export function SortMenu({ items, canAddSort, onAddSort, onResetSorting }: SortMenuProps) {
	return (
		<div role='group' aria-label='Sort'>
			{items.map((item) => (
				<div key={item.columnId}>
					<select
						value={item.columnId}
						onChange={(event) => {
							item.onChangeColumn(event.target.value)
						}}
					>
						{item.availableColumns.map((column) => (
							<option key={column.id} value={column.id}>
								{column.label}
							</option>
						))}
					</select>
					<select
						value={item.direction}
						onChange={(event) => {
							item.onChangeDirection(event.target.value as 'asc' | 'desc')
						}}
					>
						<option value='asc'>Ascending</option>
						<option value='desc'>Descending</option>
					</select>
					<button type='button' onClick={item.onRemove} aria-label='Remove sort'>
						Remove
					</button>
				</div>
			))}
			<button type='button' onClick={onAddSort} disabled={!canAddSort}>
				Add sort
			</button>
			<button type='button' onClick={onResetSorting}>
				Reset
			</button>
		</div>
	)
}
