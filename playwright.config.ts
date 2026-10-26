/** Cada contexto recebe armazenamento isolado; traces e HTML registram falhas reais. */
import { defineConfig } from '@playwright/test';
const origemPublicada = process.env.URL_APLICACAO;
export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 10000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: origemPublicada
          ? 'relatorios/publicacao/playwright-html'
          : 'playwright-report',
      },
    ],
    [
      'json',
      {
        outputFile: origemPublicada
          ? 'relatorios/publicacao/resultados.json'
          : 'relatorios/playwright/resultados.json',
      },
    ],
  ],
  use: {
    baseURL: origemPublicada || 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 414, height: 896 },
        isMobile: true,
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: origemPublicada
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 5174',
        url: 'http://127.0.0.1:5174',
        reuseExistingServer: false,
      },
  outputDir: 'test-results',
});
