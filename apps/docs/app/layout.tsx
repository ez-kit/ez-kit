import { RootProvider } from "fumadocs-ui/provider"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import "../app/globals.css"
import "fumadocs-ui/style.css"

export const metadata: Metadata = {
  title: "ez-kit docs",
  description: "Fumadocs-powered documentation for ez-kit packages.",
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
