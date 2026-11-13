import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // 서버 OS 시간대에 의존하지 않는지 확인하려고 일부러 서울과 다른 시간대(일광절약시간 있음)에서 돌린다.
    env: { TZ: 'America/Los_Angeles' },
  },
});
