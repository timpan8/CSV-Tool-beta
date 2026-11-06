import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

export default defineConfig({
  define: { __VERSION__: JSON.stringify(VERSION) },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
