import { FEATURE_MATRIX, FeatureStatus } from './feature-matrix.data'

import type { FeatureRow } from './feature-matrix.data'

type StatusBadgeConfig = {
	label: string
	className: string
}

const STATUS_BADGE: Record<FeatureStatus, StatusBadgeConfig> = {
	[FeatureStatus.Done]: {
		label: 'Done',
		className:
			'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
	},
	[FeatureStatus.InProgress]: {
		label: 'In progress',
		className:
			'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
	},
	[FeatureStatus.Planned]: {
		label: 'Planned',
		className:
			'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
	},
}

const DOC_BASE = '/docs/data-grid'

function groupByCategory(rows: readonly FeatureRow[]): Map<string, FeatureRow[]> {
	const groups = new Map<string, FeatureRow[]>()
	for (const row of rows) {
		const existing = groups.get(row.category)
		if (existing) {
			existing.push(row)
		} else {
			groups.set(row.category, [row])
		}
	}
	return groups
}

export function FeatureMatrix() {
	const groups = groupByCategory(FEATURE_MATRIX)

	return (
		<div className='not-prose w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800'>
			<table className='w-full border-collapse text-sm'>
				<thead>
					<tr className='border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'>
						<th className='px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300'>Feature</th>
						<th className='px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300'>Status</th>
						<th className='px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300'>Documentation</th>
					</tr>
				</thead>
				<tbody>
					{Array.from(groups.entries()).map(([category, rows]) => (
						<CategoryGroup
							key={category}
							category={category}
							rows={rows}
						/>
					))}
				</tbody>
			</table>
		</div>
	)
}

type CategoryGroupProps = {
	category: string
	rows: FeatureRow[]
}

function CategoryGroup({ category, rows }: CategoryGroupProps) {
	return (
		<>
			<tr className='border-b border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/50'>
				<td
					colSpan={3}
					className='px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400'
				>
					{category}
				</td>
			</tr>
			{rows.map((row) => (
				<FeatureRowItem
					key={row.feature}
					row={row}
				/>
			))}
		</>
	)
}

type FeatureRowItemProps = {
	row: FeatureRow
}

function FeatureRowItem({ row }: FeatureRowItemProps) {
	const badge = STATUS_BADGE[row.status]

	return (
		<tr className='border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/30'>
			<td className='px-4 py-3'>
				<span className='font-medium text-zinc-900 dark:text-zinc-100'>{row.feature}</span>
				<p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>{row.description}</p>
			</td>
			<td className='px-4 py-3'>
				<span className={badge.className}>{badge.label}</span>
			</td>
			<td className='px-4 py-3'>
				<DocCell doc={row.doc} />
			</td>
		</tr>
	)
}

type DocCellProps = {
	doc: string | undefined
}

function DocCell({ doc }: DocCellProps) {
	if (doc === undefined) {
		return <span className='text-xs text-zinc-400 dark:text-zinc-500'>Coming soon</span>
	}

	return (
		<a
			href={`${DOC_BASE}/${doc}`}
			className='text-xs font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
		>
			{doc}
		</a>
	)
}
