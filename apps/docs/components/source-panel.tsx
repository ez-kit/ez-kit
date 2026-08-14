'use client'

import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { ExampleFile } from '@/components/example-file'

const COLLAPSED_HEIGHT_PX = 100
const COPY_FEEDBACK_MS = 2000
const FALLBACK_EXPANDED_PX = 4000

export type SourcePanelProps = {
	/** Entry file first; a single file renders without a tab bar. */
	files: readonly ExampleFile[]
}

export function SourcePanel({ files }: SourcePanelProps) {
	const first = files[0]
	const [activePath, setActivePath] = useState(first?.path ?? '')
	const active = files.find((file) => file.path === activePath) ?? first

	const contentRef = useRef<HTMLDivElement>(null)
	const [fullHeight, setFullHeight] = useState<number | null>(null)
	const [expanded, setExpanded] = useState(false)
	const [copied, setCopied] = useState(false)

	const code = active?.source ?? ''

	useEffect(() => {
		const el = contentRef.current

		if (!el) {
			return
		}

		const measure = () => {
			setFullHeight(el.scrollHeight)
		}

		measure()

		if (typeof ResizeObserver === 'undefined') {
			return
		}

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => {
			observer.disconnect()
		}
	}, [code])

	useEffect(() => {
		if (!copied) {
			return
		}

		const timer = window.setTimeout(() => {
			setCopied(false)
		}, COPY_FEEDBACK_MS)

		return () => {
			window.clearTimeout(timer)
		}
	}, [copied])

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(code)
			setCopied(true)
		} catch {
			setCopied(false)
		}
	}, [code])

	const handleToggle = useCallback(() => {
		setExpanded((value) => !value)
	}, [])

	if (!active) return null

	const overflowing = fullHeight !== null && fullHeight > COLLAPSED_HEIGHT_PX
	const showControls = overflowing
	const collapsedNow = showControls && !expanded
	const maxHeight = expanded
		? fullHeight !== null
			? `${String(fullHeight)}px`
			: `${String(FALLBACK_EXPANDED_PX)}px`
		: `${String(COLLAPSED_HEIGHT_PX)}px`

	const body = (
		<>
			<div
				className='relative overflow-hidden transition-[max-height] duration-200 ease-out'
				style={{ maxHeight }}
			>
				<div ref={contentRef}>
					<DynamicCodeBlock
						codeblock={{ className: 'border-none shadow-none rounded-none' }}
						lang={active.language}
						code={code.trimEnd()}
					/>
				</div>
				{collapsedNow ? (
					<div
						aria-hidden='true'
						className='pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-fd-card to-transparent'
					/>
				) : null}
			</div>
			{showControls ? (
				<div className='flex justify-center border-t border-fd-border/60 bg-fd-card py-2'>
					<button
						type='button'
						onClick={handleToggle}
						aria-expanded={expanded}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
					>
						{expanded ? 'Hide' : 'Show all'}
					</button>
				</div>
			) : null}
		</>
	)

	return (
		<div className='not-prose relative overflow-hidden bg-fd-card text-sm'>
			<button
				type='button'
				onClick={() => {
					void handleCopy()
				}}
				aria-live='polite'
				className='absolute right-2 top-2 z-20 rounded-md border border-fd-border bg-fd-card/90 px-2 py-1 text-xs font-medium text-fd-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-fd-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
			{files.length > 1 ? (
				<Tabs
					value={active.path}
					onValueChange={setActivePath}
					className='gap-0'
				>
					<TabsList
						variant='line'
						aria-label='Example files'
						className='h-auto w-full justify-start overflow-x-auto rounded-none border-b border-fd-border bg-fd-card px-2 py-1'
					>
						{files.map((file) => (
							<TabsTrigger
								key={file.path}
								value={file.path}
								title={file.path}
								className='flex-none rounded-md px-2 py-1 text-xs'
							>
								{file.name}
							</TabsTrigger>
						))}
					</TabsList>
					<TabsContent value={active.path}>{body}</TabsContent>
				</Tabs>
			) : (
				body
			)}
		</div>
	)
}
