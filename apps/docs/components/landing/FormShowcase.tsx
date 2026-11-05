'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'

import { ExampleFrame } from '@/components/example-frame'

const JSX_CODE = `<Form defaultValues={defaults}>
  {(form) => <>
    <form.TextField name="name" label="Project name" />
    <form.TextField name="email" label="Work email" />
    <form.Grid columns={2}>
      <form.SelectField name="plan" label="Plan" options={plans} />
      <form.NumberField name="seats" label="Team members" />
    </form.Grid>
    <form.SwitchField name="updates" label="Send product updates" />
    <form.SubmitButton>Create workspace</form.SubmitButton>
  </>}
</Form>`
const JSON_CODE = `{
  "version": 1,
  "children": [
    { "type": "text", "name": "name", "label": "Project name" },
    { "type": "text", "name": "email", "label": "Work email" },
    { "type": "block", "component": "Section", "columns": 2,
      "children": [
        { "type": "select", "name": "plan", "label": "Plan",
          "defaultValue": "team", "options": [
            { "label": "Starter", "value": "starter" },
            { "label": "Team", "value": "team" },
            { "label": "Business", "value": "business" }
          ] },
        { "type": "number", "name": "seats", "label": "Team members" }
      ] },
    { "type": "switch", "name": "updates", "label": "Send product updates" },
    { "type": "block", "component": "SubmitButton" }
  ]
}`

export function FormShowcase() {
	const [mode, setMode] = useState<'jsx' | 'json'>('jsx')
	const reduced = useReducedMotion()
	return (
		<section className='border-t border-violet-100 bg-white px-6 py-20 dark:border-zinc-800 dark:bg-zinc-950 sm:py-28'>
			<motion.div
				initial={reduced ? false : { opacity: 0, y: 24 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, amount: 0.1 }}
				transition={{ duration: 0.55 }}
				className='mx-auto max-w-[1200px]'
			>
				<div className='max-w-2xl'>
					<p className='text-xs font-bold tracking-[0.16em] text-violet-700 uppercase dark:text-violet-400'>
						02 / Forms
					</p>
					<h2 className='mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-4xl'>One form. Two ways to build it.</h2>
					<p className='mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400'>
						Compose fields in JSX or describe them as data. Switch the view to see the same form rendered from each
						approach.
					</p>
				</div>
				<div className='mt-10 overflow-hidden rounded-2xl border border-zinc-200 shadow-xl shadow-violet-950/5 dark:border-zinc-800'>
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900'>
						<span className='text-sm font-semibold'>Create your workspace</span>
						<div
							role='group'
							aria-label='Form representation'
							className='flex gap-1 rounded-lg bg-zinc-200/70 p-1 dark:bg-zinc-800'
						>
							{(['jsx', 'json'] as const).map((value) => (
								<button
									key={value}
									type='button'
									aria-pressed={mode === value}
									onClick={() => {
										setMode(value)
									}}
									className={
										mode === value
											? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm dark:bg-zinc-700 dark:text-violet-200'
											: 'rounded-md px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300'
									}
								>
									{value === 'jsx' ? 'JSX' : 'JSON schema'}
								</button>
							))}
						</div>
					</div>
					<div className='grid lg:grid-cols-2'>
						<div className='bg-white p-5 dark:bg-zinc-950 sm:p-7'>
							<ExampleFrame
								key={mode}
								kit='shadcn'
								surface='landing'
								slug={mode === 'jsx' ? 'form-landing' : 'form-landing-schema'}
							/>
						</div>
						<div className='min-w-0 border-t border-zinc-200 bg-[#181522] p-5 text-violet-100 lg:border-t-0 lg:border-l dark:border-zinc-800'>
							<p className='mb-4 text-xs text-violet-300'>
								{mode === 'jsx' ? 'workspace-form.tsx' : 'workspace-form.json'} · excerpt; some defaults and props
								omitted
							</p>
							<div
								role='region'
								// A scrollable code region must be reachable for keyboard scrolling.
								// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
								tabIndex={0}
								aria-label={mode === 'jsx' ? 'JSX form code excerpt' : 'JSON schema code excerpt'}
								className='max-h-[560px] overflow-auto rounded text-xs leading-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300'
							>
								<pre>
									<code>{mode === 'jsx' ? JSX_CODE : JSON_CODE}</code>
								</pre>
							</div>
						</div>
					</div>
				</div>
				<p className='mt-4 text-sm text-zinc-500'>
					Switching representations resets this example.{' '}
					<Link
						href='/docs/form'
						className='font-semibold text-violet-700 hover:underline dark:text-violet-400'
					>
						Explore forms →
					</Link>
				</p>
			</motion.div>
		</section>
	)
}
