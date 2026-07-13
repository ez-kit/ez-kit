import { FrameBridge } from '@/components/frame-bridge'

import './examples/_styles/reset.css'

import type { ReactNode } from 'react'

// Blocking script: read ?theme before first paint so the iframe never flashes
// the wrong theme. Sets `.dark` (shadcn/tailwind custom-variant) and data-theme.
const themeBootstrap = `(function(){try{var t=new URLSearchParams(location.search).get('theme');var d=t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`

export default function EmbedLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang='en'
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
			</head>
			<body>
				<FrameBridge />
				{children}
			</body>
		</html>
	)
}
