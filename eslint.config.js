import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
export default tseslint.config(
  { ignores: ['**/dist/**','outputs/**','.sites-runtime/**','**/node_modules/**','coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node }, rules: { '@typescript-eslint/no-unused-vars': ['error',{ argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrorsIgnorePattern:'^_' }] } },
  { files: ['client/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser }, plugins: { 'react-hooks':hooks,'react-refresh':refresh }, rules: { ...hooks.configs.recommended.rules,'react-refresh/only-export-components':['warn',{allowConstantExport:true}],'@typescript-eslint/no-explicit-any':'error' } }
);
