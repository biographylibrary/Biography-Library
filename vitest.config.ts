import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Il JSX dei componenti si compila con il runtime automatico di React (come in Next.js): il
  // tsconfig del progetto ha `jsx: preserve` perché a compilare è Next, e per i test non basta.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    // Ambiente predefinito: Node. I test dei componenti scelgono il browser simulato (jsdom) da soli,
    // con `// @vitest-environment jsdom` in testa al file, così gli altri non lo pagano.
    environment: 'node',
    include: [
      'lib/**/__tests__/**/*.test.ts',
      'app/api/**/__tests__/**/*.test.ts',
      'shared/**/__tests__/**/*.test.ts',
      'components/**/__tests__/**/*.test.{ts,tsx}',
    ],
  },
});