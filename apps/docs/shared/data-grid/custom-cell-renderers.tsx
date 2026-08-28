'use client'

import type { CellViewProps, FieldState } from '@ez-kit/data-grid-react'

// ── rating ────────────────────────────────────────────────────────────────────

export function RatingCellView({ value }: CellViewProps) {
	const n = Number(value)
	return (
		<span>
			{Array.from({ length: 5 }, (_, i) => (
				<span
					key={i}
					style={{ color: i < n ? '#f59e0b' : '#d1d5db', fontSize: '1rem' }}
				>
					★
				</span>
			))}
		</span>
	)
}

export function RatingCellInput({ value, onChange }: FieldState) {
	const n = Number(value)
	return (
		<span>
			{Array.from({ length: 5 }, (_, i) => (
				<button
					type='button'
					key={i}
					onClick={() => {
						onChange(i + 1)
					}}
					style={{
						color: i < n ? '#f59e0b' : '#d1d5db',
						fontSize: '1.25rem',
						cursor: 'pointer',
						background: 'transparent',
						border: 'none',
						padding: 0,
					}}
				>
					★
				</button>
			))}
		</span>
	)
}

// ── color ─────────────────────────────────────────────────────────────────────

export function ColorCellView({ value }: CellViewProps) {
	const hex = String(value ?? '')
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
			<span
				style={{
					display: 'inline-block',
					width: '1rem',
					height: '1rem',
					borderRadius: '50%',
					background: hex,
					border: '1px solid rgba(0,0,0,0.15)',
				}}
			/>
			{hex}
		</span>
	)
}

export function ColorCellInput({ value, onChange }: FieldState) {
	return (
		<input
			type='color'
			value={String(value ?? '#000000')}
			onChange={(e) => {
				onChange(e.target.value)
			}}
			style={{ width: '2.5rem', height: '2rem', cursor: 'pointer', border: 'none', padding: 0 }}
		/>
	)
}

// ── completion ──────────────────────────────────────────────────────────────────

const PROGRESS_MIN = 0
const PROGRESS_MAX = 100
const PROGRESS_LOW_THRESHOLD = 40
const PROGRESS_MID_THRESHOLD = 70

function clampProgress(value: number): number {
	if (Number.isNaN(value)) return PROGRESS_MIN
	return Math.min(PROGRESS_MAX, Math.max(PROGRESS_MIN, value))
}

function progressColor(pct: number): string {
	if (pct < PROGRESS_LOW_THRESHOLD) return '#ef4444'
	if (pct < PROGRESS_MID_THRESHOLD) return '#f59e0b'
	return '#10b981'
}

export function CompletionCellView({ value }: CellViewProps) {
	const pct = clampProgress(Number(value))
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '8rem' }}>
			<span
				style={{
					position: 'relative',
					flex: 1,
					height: '0.5rem',
					borderRadius: '9999px',
					background: '#e5e7eb',
					overflow: 'hidden',
				}}
			>
				<span
					style={{
						position: 'absolute',
						inset: 0,
						width: `${String(pct)}%`,
						background: progressColor(pct),
						borderRadius: '9999px',
					}}
				/>
			</span>
			<span
				style={{
					fontVariantNumeric: 'tabular-nums',
					fontSize: '0.75rem',
					color: '#6b7280',
					minWidth: '2.5rem',
					textAlign: 'right',
				}}
			>
				{pct}%
			</span>
		</span>
	)
}

export function CompletionCellInput({ value, onChange }: FieldState) {
	const pct = clampProgress(Number(value))
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
			<input
				type='range'
				min={PROGRESS_MIN}
				max={PROGRESS_MAX}
				value={pct}
				onChange={(e) => {
					onChange(clampProgress(Number(e.target.value)))
				}}
				style={{ cursor: 'pointer' }}
			/>
			<input
				type='number'
				min={PROGRESS_MIN}
				max={PROGRESS_MAX}
				value={pct}
				onChange={(e) => {
					onChange(clampProgress(Number(e.target.value)))
				}}
				style={{ width: '3.5rem' }}
			/>
		</span>
	)
}

// ── currency ────────────────────────────────────────────────────────────────────

const CURRENCY_LOCALE = 'en-US'
const CURRENCY_CODE = 'USD'
const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
	style: 'currency',
	currency: CURRENCY_CODE,
})
const EMPTY_CURRENCY = '—'

export function CurrencyCellView({ value }: CellViewProps) {
	const amount = Number(value)
	return (
		<span style={{ fontVariantNumeric: 'tabular-nums' }}>
			{Number.isNaN(amount) ? EMPTY_CURRENCY : currencyFormatter.format(amount)}
		</span>
	)
}

export function CurrencyCellInput({ value, onChange }: FieldState) {
	const amount = Number(value)
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
			<span style={{ color: '#6b7280' }}>$</span>
			<input
				type='number'
				step='0.01'
				value={Number.isNaN(amount) ? '' : amount}
				onChange={(e) => {
					const next = Number(e.target.value)
					onChange(Number.isNaN(next) ? 0 : next)
				}}
				style={{ width: '6rem' }}
			/>
		</span>
	)
}

// ── user ────────────────────────────────────────────────────────────────────────

const DEFAULT_AVATAR_COLOR = '#6366f1'
const AVATAR_PALETTE = [DEFAULT_AVATAR_COLOR, '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']
const MAX_INITIALS = 2
const AVATAR_HASH_PRIME = 31
const UNKNOWN_INITIALS = '?'

function initialsOf(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, MAX_INITIALS)
		.map((part) => part.charAt(0).toUpperCase())
		.join('')
}

function avatarColor(name: string): string {
	let hash = 0
	for (let i = 0; i < name.length; i++) {
		hash = (hash * AVATAR_HASH_PRIME + name.charCodeAt(i)) >>> 0
	}
	return AVATAR_PALETTE[hash % AVATAR_PALETTE.length] ?? DEFAULT_AVATAR_COLOR
}

export function UserCellView({ value }: CellViewProps) {
	const name = String(value ?? '')
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
			<span
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: '1.75rem',
					height: '1.75rem',
					borderRadius: '50%',
					background: avatarColor(name),
					color: '#fff',
					fontSize: '0.7rem',
					fontWeight: 600,
					flexShrink: 0,
				}}
			>
				{initialsOf(name) || UNKNOWN_INITIALS}
			</span>
			<span>{name}</span>
		</span>
	)
}

export function UserCellInput({ value, onChange }: FieldState) {
	return (
		<input
			type='text'
			value={String(value ?? '')}
			onChange={(e) => {
				onChange(e.target.value)
			}}
			style={{ width: '10rem' }}
		/>
	)
}
