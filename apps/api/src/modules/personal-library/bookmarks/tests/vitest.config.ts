import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
export default defineConfig({test:{include:[fileURLToPath(new URL('./*.test.ts',import.meta.url)).replaceAll('\\','/')],environment:'node',hookTimeout:120000,testTimeout:30000}})
