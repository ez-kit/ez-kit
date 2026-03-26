import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"

import { baseOptions } from "../../lib/layout.shared"

type HomeGroupLayoutProps = {
  children: ReactNode
}

export default function HomeGroupLayout({ children }: HomeGroupLayoutProps) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>
}
