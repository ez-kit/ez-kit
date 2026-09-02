import type { FormComponents } from '../contract'
import type { GridItemProps, SectionProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `Section` component — the JSX spelling of a `section` node.
 *
 * Unlike every other piece on the form instance it closes over no form: a section groups
 * children and nothing else, so it binds no name and reads no state. It is attached to the
 * instance anyway, beside the fields it wraps, because that is where a caller looks for
 * anything the kit draws.
 *
 * The wrapper is not ceremony over `components.Section`: the kit-author contract states its
 * props as required — the renderer always resolves them before calling — while the
 * consumer-facing ones are optional. See {@link SectionProps}.
 */
export function createSection(KitSection: FormComponents['Section']): (props: SectionProps) => ReactNode {
	return function Section({ title, description, columns, children }: SectionProps): ReactNode {
		return (
			<KitSection
				title={title}
				description={description}
				columns={columns}
			>
				{children}
			</KitSection>
		)
	}
}

/**
 * Build the `GridItem` component — the JSX spelling of a node's `colSpan`.
 *
 * The document side wraps **every** child of a grid-bearing section in one of these, because
 * a node cannot wrap itself. JSX has no such constraint: an unwrapped child is already a grid
 * cell one column wide, so this is written only where a wider span is wanted. Both spellings
 * end at the same kit component.
 */
export function createGridItem(KitGridItem: FormComponents['GridItem']): (props: GridItemProps) => ReactNode {
	return function GridItem({ colSpan, children }: GridItemProps): ReactNode {
		return <KitGridItem colSpan={colSpan}>{children}</KitGridItem>
	}
}
