import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1400, height: 900 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run build && npx vite preview --port 4173', port: 4173, reuseExistingServer: true, timeout: 180_000 },
})
