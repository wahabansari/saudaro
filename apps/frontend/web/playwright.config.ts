import { defineConfig } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './tests/visual',
  outputDir: './tests/visual/.output/pw',
  globalSetup: './tests/visual/setup.ts',
  globalTeardown: './tests/visual/report.ts',
  workers: 2,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, browserName: 'chromium' },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
