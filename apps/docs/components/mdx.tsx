import defaultMdxComponents from 'fumadocs-ui/mdx';

import { DataGridDocsExample } from './data-grid-docs-example';
import { LivePreview } from './live-preview';

import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    LivePreview,
    DataGridDocsExample,
    ...components,
  } as MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
