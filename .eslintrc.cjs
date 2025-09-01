module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'next',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
