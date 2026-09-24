// UI checks for the static site. The site is served as plain files by
// http-server (the same way GitHub Pages serves it), so the contact API is
// not available here and is not exercised.
const { defineConfig } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `npx http-server . -p ${PORT} -c-1 -s`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
