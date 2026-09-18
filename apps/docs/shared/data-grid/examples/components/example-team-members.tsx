'use client'

import { useCallback, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns } from './team-members/columns'
import { INITIAL_MEMBERS, type Member } from './team-members/data'
import { features } from './team-members/features'

/**
 * The card itself — the grid's own root element, classed through `layout.classNames.root` rather
 * than wrapped in a div of this component's own. `border-current/15` and `bg-current/5` rather than
 * palette tokens: this renders in both kits, and the two name their surfaces differently, while a
 * tint of the text colour reads correctly in either, in light and dark.
 */
const FRAME_CARD = 'rounded-xl border border-current/15 bg-current/5'

/**
 * HeroUI's `table-root` — the box between the shell's wrapper and its scrollport — is a tinted,
 * rounded, padded surface of its own, which inside a frame reads as a second card sitting in the
 * first one. A `classNames.wrapper` value reaches it as a descendant; the kit has no such element,
 * so the same class is inert under shadcn.
 */
const TABLE_ROOT_RESET =
	'[&_[data-slot=table-root]]:bg-transparent! [&_[data-slot=table-root]]:rounded-none! [&_[data-slot=table-root]]:p-0!'

/**
 * The table is the card's panel: its own rounded, bordered box, a pixel wider than the card on each
 * side so the two borders coincide instead of stacking. The radius is the card's own, less the
 * border it sits inside. The tint stays on the card — the panel's corners are rounded while the
 * bars' inner edges are straight, so a tint painted on the bars would leave an uncoloured nick at
 * those four notches.
 */
// Written out rather than interpolated from FRAME_RADIUS: Tailwind reads this file as text, and
// only generates a utility it can see spelled in full. The radius is the frame's less its border.
// `bg-background` is what makes the panel a panel: the frame behind it is tinted end to end, so
// the table has to paint its own opaque surface rather than let the tint through. The header row is
// left to the kit — shadcn's is the same surface as the rows, HeroUI's its own lighter tint.
const TABLE_PANEL = 'border! border-current/15! rounded-[calc(0.75rem-1px)]! -mx-px! bg-background!'

/**
 * The frame's header bar *is* `<DataGrid.Toolbar>` — the kit's own bar, with children, so the order
 * of the controls is the one written below rather than the auto-mounted one. Two utilities turn a
 * free-standing toolbar into a card's header: `mb-0` drops the gap it keeps above the table (the
 * kit merges the class with `cn`, so this replaces `mb-2` rather than fighting it), and the padding
 * is the bar's own. `flex-wrap` because the kit's bar does not wrap on its own.
 */
const FRAME_BAR = 'mb-0 flex-wrap px-3 py-2.5'

// `auto` on the trailing margin is what pushes the controls to the other end, so the title and the
// four controls are one flex row rather than a title and a box of controls.
const FRAME_TITLE_STYLE = {
	marginInlineEnd: 'auto',
	fontSize: '0.9375rem',
	fontWeight: 600,
}

const FRAME_FOOTER_STYLE = {
	// The kits' own `bottom-bar` rule sets `margin-top: 0.75rem` — the gap that separates a
	// free-standing bottom bar from the table above it. Here the bar *is* the frame's footer
	// and sits flush against the panel, so the gap would show as a strip of page between the two.
	marginTop: 0,
	padding: '0.375rem 0.5rem',
}

export function ExampleTeamMembersExample() {
	const [members, setMembers] = useState(INITIAL_MEMBERS)

	const add = useCallback((values: Partial<Member>) => {
		setMembers((prev) => [
			...prev,
			{
				id: Math.max(0, ...prev.map((member) => member.id)) + 1,
				name: values.name ?? '',
				email: values.email ?? '',
				country: values.country ?? 'United States',
				role: values.role ?? 'Developer',
				joined: values.joined ?? new Date().toISOString().slice(0, 10),
				status: values.status ?? 'pending',
			},
		])
	}, [])

	const update = useCallback((id: number, values: Partial<Member>) => {
		setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, ...values } : member)))
	}, [])

	const remove = useCallback((ids: number[]) => {
		const removed = new Set(ids)
		setMembers((prev) => prev.filter((member) => !removed.has(member.id)))
	}, [])

	return (
		<DataGrid
			features={features}
			data={members}
			columns={columns}
			selection
			sorting
			visibility
			globalFiltering={{ placeholder: 'Search…' }}
			filtering={{ faceted: true }}
			rowActions={{ placement: 'menu' }}
			creating={{
				mode: 'modal',
				onSave: ({ values }) => {
					add(values)
				},
			}}
			editing={{
				mode: 'modal',
				onSave: ({ rowId, values }) => {
					update(Number(rowId), values)
				},
			}}
			deleting={{
				onDelete: ({ row }) => {
					remove([row.original.id])
				},
				confirmation: {
					title: 'Remove member?',
					description: (row) => `${row.original.name} loses access to the workspace immediately.`,
				},
				bulk: {
					onDelete: ({ rows }) => {
						remove(rows.map((row) => row.original.id))
					},
					confirmation: {
						title: 'Remove members?',
						description: (rows) => `${String(rows.length)} members lose access to the workspace immediately.`,
					},
				},
			}}
			pagination={{ pageSize: 5, items: [5, 10, 20], label: 'range' }}
			// The panel look is stated here rather than left to the kit: each kit frames its table
			// differently — shadcn on the scrollport, HeroUI on the `table-root` between the
			// shell's two boxes — and inside a frame the two have to agree. Both are stylesheet
			// rules from an unlayered import, so a utility needs `!` to win.
			layout={{
				classNames: {
					root: FRAME_CARD,
					wrapper: TABLE_ROOT_RESET,
					scroll: TABLE_PANEL,
				},
			}}
		>
			{/* Children replace the default layout, so the card is composed explicitly: the kit's
			    toolbar as the header bar — with children, so these four controls come in this order
			    rather than the auto-mounted one — the table, and the bottom bar, which with no
			    children of its own would be the page controls. They need no wrapper: the root is the
			    card. */}
			<DataGrid.Toolbar className={FRAME_BAR}>
				<span style={FRAME_TITLE_STYLE}>Team members</span>
				<DataGrid.GlobalFilterInput />
				<DataGrid.ColumnFilter columnId='status' />
				<DataGrid.VisibilityTrigger />
				<DataGrid.CreateTrigger>Add new</DataGrid.CreateTrigger>
			</DataGrid.Toolbar>
			<DataGrid.Table>
				<DataGrid.Header>
					{({ headerGroups }) =>
						headerGroups.map((headerGroup) => (
							<DataGrid.HeaderRow
								key={headerGroup.id}
								headerGroup={headerGroup}
							>
								{({ headers }) =>
									headers.map((header) => (
										<DataGrid.HeaderCell
											key={header.id}
											header={header}
										>
											{/* No `filter`: this card filters through the one status control in its
											    header bar, so the column headers stay a single line. Not rendering it
											    is what `filtering: { variant: 'panel' }` used to say. */}
											{({ sortTrigger, menu }) => (
												<div data-slot='header-main'>
													{sortTrigger}
													{menu}
												</div>
											)}
										</DataGrid.HeaderCell>
									))
								}
							</DataGrid.HeaderRow>
						))
					}
				</DataGrid.Header>
				<DataGrid.Body />
			</DataGrid.Table>
			{/* Explicit children: the bar's default contents are the size selector *and* the page
			    controls, and this card wants only the latter. */}
			<DataGrid.BottomBar style={FRAME_FOOTER_STYLE}>
				<DataGrid.Pagination />
			</DataGrid.BottomBar>
			<DataGrid.ActionBar />
		</DataGrid>
	)
}
