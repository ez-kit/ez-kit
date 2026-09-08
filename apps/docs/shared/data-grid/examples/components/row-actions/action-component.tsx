'use client'

import { Archive } from 'lucide-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

import type { User } from '../_data'

/**
 * An entry that draws itself: a seat counter, with its own two buttons.
 *
 * The described `ActionItem` shape has one label and one `onAction`, so it cannot express this —
 * which is exactly when to reach for `component` instead. Nothing is contributed around it: no
 * glyph, no danger colour, no disabled state, and the interaction is this component's own.
 */
function SeatStepper({ value, onChange }: { value: number; onChange: (seats: number) => void }) {
	const step = (delta: number) => {
		onChange(Math.max(1, value + delta))
	}

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
			<span>Seats</span>
			<span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
				<button
					type='button'
					aria-label='Remove a seat'
					onClick={() => {
						step(-1)
					}}
					style={STEP_BUTTON}
				>
					–
				</button>
				<span style={{ minWidth: 16, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
				<button
					type='button'
					aria-label='Add a seat'
					onClick={() => {
						step(1)
					}}
					style={STEP_BUTTON}
				>
					+
				</button>
			</span>
		</div>
	)
}

const STEP_BUTTON = {
	width: 18,
	height: 18,
	lineHeight: '16px',
	borderRadius: 4,
	border: '1px solid #cbd5e1',
	background: 'transparent',
	color: 'inherit',
	cursor: 'pointer',
	padding: 0,
} as const

/**
 * Both halves of `rowActions.actions` in one menu: a described entry the kit draws, and a
 * `component` entry that draws itself.
 */
export function RowActionsComponentExample() {
	const [data, setData] = useState(() => makeUsers(4))
	const [seats, setSeats] = useState<Record<number, number>>({})
	const [log, setLog] = useState<string[]>([])

	const addLog = (message: string) => {
		setLog((entries) => [message, ...entries].slice(0, 4))
	}

	const archive = (user: User) => {
		addLog(`Archived ${user.name}`)
	}

	return (
		<div>
			<DataGrid
				data={data}
				columns={columns}
				editing={{ mode: 'modal', onSave: () => Promise.resolve() }}
				deleting={{
					onDelete: ({ row }) => {
						setData((rows) => rows.filter((user) => user.id !== row.original.id))
					},
				}}
				rowActions={{
					actions: ({ row }) => [
						// Described: the kit gives it the same chrome the built-in Delete has.
						{
							id: 'archive',
							label: 'Archive',
							icon: <Archive size={16} />,
							onAction: () => {
								archive(row.original)
							},
						},
						// Handed over: `id` plus markup, and nothing else.
						{
							id: 'seats',
							component: (
								<SeatStepper
									value={seats[row.original.id] ?? 1}
									onChange={(next) => {
										setSeats((current) => ({ ...current, [row.original.id]: next }))
										addLog(`${row.original.name} → ${String(next)} seat(s)`)
									}}
								/>
							),
						},
					],
				}}
			/>

			{log.length > 0 && (
				<div
					style={{
						marginTop: '1.5rem',
						padding: '0.75rem 1rem',
						background: '#f8fafc',
						border: '1px solid #e2e8f0',
						borderRadius: 8,
						fontSize: 13,
						color: '#475569',
					}}
				>
					<div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>Action log</div>
					{log.map((entry, index) => (
						<div key={index}>{entry}</div>
					))}
				</div>
			)}
		</div>
	)
}
