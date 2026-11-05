/// <reference types="vite/client" />

/** Versionen ur `package.json`, insatt av `define` i vite.config.ts och vitest.config.ts. */
declare const __VERSION__: string

interface ImportMetaEnv {
  /** `beta` i beta-repots CI, annars saknas den. Se `src/version.ts`. */
  readonly VITE_KANAL?: string
}
