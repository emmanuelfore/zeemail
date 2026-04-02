import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: [
      {
        find: 'paynow',
        replacement: path.resolve(__dirname, 'src/__mocks__/paynow.ts'),
      },
      {
        find: 'resend',
        replacement: path.resolve(__dirname, 'src/__mocks__/resend.ts'),
      },
    ],
  },
});
