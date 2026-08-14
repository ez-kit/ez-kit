import type { RowActionsMenuProps } from '@ez-kit/data-grid-react'

/**
 * The native kit ships no popover primitive, so the row actions render as plain
 * buttons rather than behind a trigger.
 */
export function RowActionsMenu({ items }: RowActionsMenuProps) {
	return (
		<>
			{items.map((item) => (
				<button
					key={item.id}
					type='button'
					disabled={item.disabled ?? false}
					onClick={item.onSelect}
				>
					{item.label}
				</button>
			))}
		</>
	)
}
