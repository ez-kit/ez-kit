'use client'

import { SandpackCodeEditor, SandpackLayout, SandpackPreview, SandpackProvider } from '@codesandbox/sandpack-react'
import { useEffect, useMemo, useState } from 'react'

import {
	dataGridSandpackAppFiles,
	dataGridSandpackExampleFiles,
	dataGridSandpackSharedPackageFiles,
} from './generated/data-grid'

import type { DataGridSandpackExampleId } from './generated/data-grid'
import type { SandpackFiles } from '@codesandbox/sandpack-react'

export type { DataGridSandpackExampleId } from './generated/data-grid'

type DataGridType = 'heroui' | 'shadcn'

interface DataGridSandpackExampleProps {
	exampleId: DataGridSandpackExampleId
	type: DataGridType
}

const visibleFiles = ['/src/App.tsx']

const packageByType = {
	heroui: '@ez-kit/data-grid-heroui',
	shadcn: '@ez-kit/data-grid-shadcn',
} as const satisfies Record<DataGridType, string>

const appEntryFile =
	"import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\n\nimport SandpackRoot from './src/SandpackRoot'\nimport './src/index.css'\n\ncreateRoot(document.getElementById('root') as HTMLElement).render(\n\t<StrictMode>\n\t\t<SandpackRoot />\n\t</StrictMode>,\n)\n"

const rootAppFile = "export { default } from './src/SandpackRoot'\n"

function createBridgeFile(type: DataGridType) {
	const uiPackage = packageByType[type]

	return `export { DataGrid } from '${uiPackage}'\nexport { defineColumns, useDataGrid } from '@ez-kit/data-grid-react'\n`
}

function createGlobalCss(sandpackCss: string) {
	return `${sandpackCss}\n\nhtml,\nbody {\n\tmargin: 0;\n\tfont-family: Inter, ui-sans-serif, system-ui, sans-serif;\n}\n\nbody {\n\tpadding: 24px;\n}\n\n#root {\n\tmin-height: 100vh;\n}\n\n[data-slot='table-container'] {\n\tmax-width: 100%;\n}\n`
}

function createSandpackRootFile() {
	return `import React from 'react'\n\nimport App from './App'\n\nclass SandpackErrorBoundary extends React.Component<\n\tReact.PropsWithChildren,\n\t{ error: string | null }\n> {\n\tconstructor(props: React.PropsWithChildren) {\n\t\tsuper(props)\n\t\tthis.state = { error: null }\n\t}\n\n\tstatic getDerivedStateFromError(error: unknown) {\n\t\treturn { error: error instanceof Error ? error.message : 'Unknown Sandpack preview error' }\n\t}\n\n\toverride componentDidCatch(error: unknown) {\n\t\tconsole.error(error)\n\t}\n\n\toverride render() {\n\t\tif (this.state.error) {\n\t\t\treturn (\n\t\t\t\t<div style={{ color: '#b91c1c', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>\n\t\t\t\t\tPreview failed: {this.state.error}\n\t\t\t\t</div>\n\t\t\t)\n\t\t}\n\n\t\treturn this.props.children\n\t}\n}\n\nexport default function SandpackRoot() {\n\treturn (\n\t\t<SandpackErrorBoundary>\n\t\t\t<App />\n\t\t</SandpackErrorBoundary>\n\t)\n}\n`
}

function createSandpackFiles(
	type: DataGridType,
	exampleId: DataGridSandpackExampleId,
	allPackageFiles: Record<string, string>,
): SandpackFiles {
	const sandpackCss = allPackageFiles[`/node_modules/@ez-kit/data-grid-${type}/sandpack.css`] ?? ''

	const files: SandpackFiles = {
		'/App.tsx': {
			code: rootAppFile,
			hidden: true,
		},
		'/index.tsx': {
			code: appEntryFile,
			hidden: true,
		},
		'/src/App.tsx': dataGridSandpackAppFiles[exampleId],
		'/src/DataGrid.tsx': {
			code: createBridgeFile(type),
			hidden: true,
		},
		'/src/index.css': createGlobalCss(sandpackCss),
		'/src/SandpackRoot.tsx': {
			code: createSandpackRootFile(),
			hidden: true,
		},
		'/src/index.tsx': {
			code: "export { default } from './SandpackRoot'\n",
			hidden: true,
		},
		'/src/main.tsx': {
			code: "export { default } from './SandpackRoot'\n",
			hidden: true,
		},
	}

	for (const [path, code] of Object.entries(dataGridSandpackExampleFiles)) {
		files[path] = code
	}

	for (const [path, code] of Object.entries(allPackageFiles)) {
		files[path] = { code, hidden: true }
	}

	return files
}

export function DataGridSandpackExample({ exampleId, type }: DataGridSandpackExampleProps) {
	const [typePackageFiles, setTypePackageFiles] = useState<Record<string, string> | null>(null)

	useEffect(() => {
		setTypePackageFiles(null)
		if (type === 'heroui') {
			void import('./generated/data-grid-heroui').then((m) => {
				setTypePackageFiles(m.dataGridSandpackHeroUIPackageFiles)
			})
		} else {
			void import('./generated/data-grid-shadcn').then((m) => {
				setTypePackageFiles(m.dataGridSandpackShadcnPackageFiles)
			})
		}
	}, [type])

	const allPackageFiles = useMemo(
		() => (typePackageFiles ? { ...dataGridSandpackSharedPackageFiles, ...typePackageFiles } : null),
		[typePackageFiles],
	)

	const files = useMemo(
		() => (allPackageFiles ? createSandpackFiles(type, exampleId, allPackageFiles) : null),
		[type, exampleId, allPackageFiles],
	)

	if (!files || !allPackageFiles) {
		return (
			<div
				className='overflow-hidden rounded-lg border border-zinc-200 bg-white'
				style={{ minHeight: 520, display: 'flex', alignItems: 'center', padding: '2rem' }}
			>
				<span style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading...</span>
			</div>
		)
	}

	return (
		<div className='overflow-hidden rounded-lg border border-zinc-200 bg-white'>
			<SandpackProvider
				key={`${type}-${exampleId}`}
				template='vite-react-ts'
				files={files}
				options={{
					activeFile: '/src/App.tsx',
					visibleFiles,
				}}
				customSetup={{
					dependencies: {},
				}}
			>
				<SandpackLayout>
					<SandpackPreview
						showOpenInCodeSandbox={false}
						showRefreshButton
						style={{ minHeight: 520 }}
					/>
					{/* <SandpackCodeEditor
						showLineNumbers
						showTabs
						style={{ minHeight: 520 }}
					/> */}
				</SandpackLayout>
			</SandpackProvider>
		</div>
	)
}
