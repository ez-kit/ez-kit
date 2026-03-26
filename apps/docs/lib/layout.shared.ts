import type { HomeLayoutProps } from "fumadocs-ui/layouts/home"

export function baseOptions(): Pick<
  HomeLayoutProps,
  "githubUrl" | "links" | "nav"
> {
  return {
    githubUrl: "https://github.com/sergejolcev/ez-kit",
    nav: {
      title: "ez-kit docs",
      transparentMode: "top",
    },
    links: [
      {
        text: "Home",
        url: "/",
      },
      {
        text: "API",
        url: "/docs/api",
        active: "nested-url",
      },
    ],
  }
}
