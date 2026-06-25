import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'app/components/**/*.{ts,tsx}',
    'lib/filtrarTareas.ts',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: { lines: 60, functions: 45, branches: 60 },
  },
  coverageReporters: ['text', 'lcov'],
}

export default createJestConfig(config)
