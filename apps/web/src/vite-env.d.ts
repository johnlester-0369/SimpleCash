/**
 * Type declarations for vite-plugin-svgr
 * Allows importing SVG files as React components using ?react suffix
 *
 * @example
 * import Logo from './logo.svg?react'
 * <Logo className="w-6 h-6" />
 */
declare module '*.svg?react' {
  import type React from 'react'
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}

/**
 * Type declaration for regular SVG imports
 */
declare module '*.svg' {
  const content: string
  export default content
}

/**
 * Typed env vars — see infra/core/config/env.config.ts for the single
 * consumer of VITE_DEMO_MODE. Per Vite's docs, only VITE_-prefixed keys
 * ever reach import.meta.env in client code, so this only needs to list
 * those, not every process.env key. No import statements are added to
 * this file — an import here silently breaks the ImportMetaEnv
 * augmentation per Vite's TypeScript docs.
 */
interface ImportMetaEnv {
  readonly VITE_DEMO_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
