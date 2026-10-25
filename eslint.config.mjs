import { createRequire } from 'node:module';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const require = createRequire(import.meta.url);

// As regras ficam no .eslintrc.json (formato pedido no projeto) e sao carregadas
// aqui via FlatCompat, porque o ESLint 9 usa flat config por padrao.
const eslintrc = require('./.eslintrc.json');

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.d.ts',
      'backend/prisma/migrations/**',
      '.opencode/**',
      'frontend/public/**',
    ],
  },
  ...compat.config(eslintrc),
];
