'use client'

import { useId, useState } from 'react'

import type { ReactNode } from 'react'

type Tab = 'preview' | 'code'

type LiveTabsProps = {
	preview: ReactNode
	code: ReactNode
	title?: string | undefined
	defaultTab?: Tab | undefined
}

export function LiveTabs({ preview, code, title, defaultTab = 'preview' }: LiveTabsProps) {
	const [tab, setTab] = useState<Tab>(defaultTab)
	const baseId = useId()
	const previewPanelId = `${baseId}-preview`
	const codePanelId = `${baseId}-code`
	const previewTabId = `${baseId}-preview-tab`
	const codeTabId = `${baseId}-code-tab`

	return (
		<div className='my-6 overflow-hidden rounded-lg border border-fd-border bg-fd-card'>
			<div
				role='tablist'
				aria-label={title ?? 'Example'}
				className='flex items-center gap-1 border-b border-fd-border bg-fd-muted/40 px-2 py-1.5'
			>
				<TabButton
					id={previewTabId}
					panelId={previewPanelId}
					active={tab === 'preview'}
					onSelect={() => {
						setTab('preview')
					}}
				>
					Preview
				</TabButton>
				<TabButton
					id={codeTabId}
					panelId={codePanelId}
					active={tab === 'code'}
					onSelect={() => {
						setTab('code')
					}}
				>
					Code
				</TabButton>
				{title ? <span className='ml-auto pr-2 text-xs text-fd-muted-foreground'>{title}</span> : null}
			</div>

			<div
				role='tabpanel'
				id={previewPanelId}
				aria-labelledby={previewTabId}
				hidden={tab !== 'preview'}
				className='min-h-[140px] bg-fd-background p-6'
			>
				{preview}
			</div>

			<div
				role='tabpanel'
				id={codePanelId}
				aria-labelledby={codeTabId}
				hidden={tab !== 'code'}
				className='[&>figure]:m-0 [&>figure]:rounded-none [&>figure]:border-0 [&>pre]:m-0 [&>pre]:rounded-none [&>pre]:border-0'
			>
				{code}
			</div>
		</div>
	)
}

type TabButtonProps = {
	id: string
	panelId: string
	active: boolean
	onSelect: () => void
	children: ReactNode
}

function TabButton({ id, panelId, active, onSelect, children }: TabButtonProps) {
	return (
		<button
			type='button'
			role='tab'
			id={id}
			aria-selected={active}
			aria-controls={panelId}
			tabIndex={active ? 0 : -1}
			onClick={onSelect}
			className={
				active
					? 'rounded-md bg-fd-accent px-3 py-1 text-sm font-medium text-fd-accent-foreground'
					: 'rounded-md px-3 py-1 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground'
			}
		>
			{children}
		</button>
	)
}
