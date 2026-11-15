module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: '18.3' } },
  plugins: ['react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'react/prop-types': 'off',
    // Avisos de dependências ficam visíveis sem travar o CI: várias listas são intencionais.
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['*.config.js', '.eslintrc.cjs'],
      env: { node: true, browser: false },
    },
  ],
};
