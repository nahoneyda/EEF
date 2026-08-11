module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'simple-import-sort'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Prettier와 충돌 제거
    'prettier/prettier': 'error',

    // 자동 import 정렬
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',

    // Nest.js에서 자주 쓰는 규칙
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
