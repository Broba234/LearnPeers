// ESLint 9 flat config.
// Next 16 removed the `next lint` subcommand, so we invoke ESLint directly
// (`eslint .`) and pull in Next's recommended flat-config presets here:
// `core-web-vitals` (React/Next rules) + `typescript` (TS parser + rules).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'prisma/generated/**',
      'public/**',
      'next-env.d.ts',
      'scripts/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // This codebase intentionally runs loose (tsconfig `strict: false`,
    // next.config `typescript.ignoreBuildErrors`). Keep correctness rules as
    // errors (rules-of-hooks, bad links, etc. stay errors via the presets) but
    // downgrade high-volume stylistic rules to warnings so `npm run lint` is a
    // useful gate instead of a permanently-red wall of pre-existing debt.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@next/next/no-img-element': 'warn',
      // React Compiler advisory rules (new in eslint-plugin-react-hooks v6,
      // auto-enabled by Next 16). Experimental and false-positive-heavy for
      // code not authored for the React Compiler — keep as warnings. The
      // classic `react-hooks/rules-of-hooks` stays an error (real correctness).
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]

export default config
